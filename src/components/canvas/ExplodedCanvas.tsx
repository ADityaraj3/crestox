import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Html } from '@react-three/drei';

// DLS Constants
const GRID_SIZE = 50;
const TOTAL_SHARDS = GRID_SIZE * GRID_SIZE;
const ANIMATION_SPEED = 2.0;
const DEFAULT_CAMERA_Z = 80;
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 0, DEFAULT_CAMERA_Z);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const CAMERA_FOV = 45;

/** Camera Z that keeps the full shard plane inside the viewport (contain). */
function getFitCameraZ(viewportAspect: number, imageAspect: number, padding = 1.16): number {
  const artworkWidth = GRID_SIZE * imageAspect;
  const artworkHeight = GRID_SIZE;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  const safeAspect = Math.max(viewportAspect, 0.01);
  const zFromHeight = artworkHeight / 2 / tanHalfFov;
  const zFromWidth = artworkWidth / 2 / (tanHalfFov * safeAspect);
  return Math.max(zFromHeight, zFromWidth, DEFAULT_CAMERA_Z / padding) * padding;
}

export enum ImageOrientation {
  PORTRAIT = "PORTRAIT",
  LANDSCAPE = "LANDSCAPE",
  SQUARE = "SQUARE"
}

export const ASPECT_VALUES = {
  [ImageOrientation.PORTRAIT]: 3 / 4,
  [ImageOrientation.LANDSCAPE]: 4 / 3,
  [ImageOrientation.SQUARE]: 1 / 1
}

interface ArtworkShardsProps {
  exploded: boolean;
  textureUrl: string;
  aspect: number;
}

const vertexShader = `
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uGridSize;
  uniform float uAspect;

  attribute vec2 aGridPosition;
  attribute float aRandom;

  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                                0.0,                                0.0,                                1.0
    );
  }

  float cubicOut(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  void main() {
    vec2 uvOffset = aGridPosition;
    vec2 cellUv = uv / uGridSize;
    vUv = uvOffset + cellUv;

    vec3 transformed = position;

    vec3 explodeDir = vec3((aGridPosition.x - 0.5) * uAspect, aGridPosition.y - 0.5, 0.0);
    explodeDir.x += (aRandom - 0.5) * 0.2;
    explodeDir.y += (aRandom - 0.5) * 0.2;

    float zDepth = (aRandom - 0.5) * 2.0;
    explodeDir.z += zDepth;

    float easedProgress = cubicOut(uProgress);
    vec3 movement = normalize(explodeDir) * easedProgress * 20.0;

    float rotationAngle = easedProgress * aRandom * 15.0;
    vec3 rotationAxis = vec3(aRandom, random(vec2(aRandom, 1.0)), random(vec2(aRandom, 2.0)));
    mat4 rotMat = rotationMatrix(rotationAxis, rotationAngle);

    transformed = (rotMat * vec4(transformed, 1.0)).xyz;

    vec3 gridOffset = vec3(
      ((aGridPosition.x * uGridSize.x) - (uGridSize.x * 0.5)) * uAspect,
      (aGridPosition.y * uGridSize.y) - (uGridSize.y * 0.5),
      0.0
    );
    vec3 finalPosition = gridOffset + transformed + movement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);

    if (uProgress > 0.01) {
      float edge = 0.02;
      if (vUv.x < edge || vUv.y < edge || vUv.x > 1.0 - edge || vUv.y > 1.0 - edge) {
        color.rgb += vec3(0.8, 1.0, 0.0) * uProgress * 0.5;
      }
    }

    gl_FragColor = color;
  }
`;

function CameraController({
  exploded,
  shouldReset,
  onResetComplete,
  disableDrag,
  fitToView,
  imageAspect,
}: {
  exploded: boolean;
  shouldReset: boolean;
  onResetComplete: () => void;
  disableDrag?: boolean;
  fitToView?: boolean;
  imageAspect: number;
}) {
  const { camera, controls, size } = useThree();
  const isPointerDown = useRef(false);
  const homePos = useRef(DEFAULT_CAMERA_POS.clone());

  useEffect(() => {
    if (disableDrag) {
      isPointerDown.current = false;
      return;
    }

    const handleDown = () => { isPointerDown.current = true; };
    const handleUp = () => { isPointerDown.current = false; };

    // Track global pointer state to detect release
    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [disableDrag]);

  useEffect(() => {
    const next = fitToView
      ? new THREE.Vector3(0, 0, getFitCameraZ(size.width / Math.max(size.height, 1), imageAspect))
      : DEFAULT_CAMERA_POS.clone();
    homePos.current.copy(next);
    // Snap only when fitting the phone viewport; desktop still uses the original lerp-home path.
    if (!fitToView) return;
    camera.position.copy(next);
    if (controls) {
      // @ts-ignore
      controls.target.copy(DEFAULT_TARGET);
      // @ts-ignore
      controls.update();
    }
  }, [fitToView, size.width, size.height, imageAspect, camera, controls]);

  useFrame((state, delta) => {
    // Return camera to home only if image is NOT fractalized
    // AND either shouldReset is true or user is NOT currently dragging
    if (!exploded && (shouldReset || !isPointerDown.current)) {
      const distance = camera.position.distanceTo(homePos.current);

      // Only lerp if we're not already basically there
      if (distance > 0.05) {
        camera.position.lerp(homePos.current, delta * 5);
        if (controls) {
          // @ts-ignore
          controls.target.lerp(DEFAULT_TARGET, delta * 5);
          // @ts-ignore
          controls.update();
        }
      } else if (shouldReset) {
        // Only trigger completion for explicit reset requests
        onResetComplete();
      }
    }
  });

  return null;
}

function ArtworkShards({ exploded, textureUrl, aspect }: ArtworkShardsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      textureUrl,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (error) => {
        console.error('Texture loading error:', error);
      }
    );
  }, [textureUrl]);

  const { gridPositions, randoms } = useMemo(() => {
    const gridPositions = new Float32Array(TOTAL_SHARDS * 2);
    const randoms = new Float32Array(TOTAL_SHARDS);

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const index = i * GRID_SIZE + j;
        gridPositions[index * 2] = i / GRID_SIZE;
        gridPositions[index * 2 + 1] = j / GRID_SIZE;
        randoms[index] = Math.random();
      }
    }
    return { gridPositions, randoms };
  }, []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      const target = exploded ? 1 : 0;
      const current = materialRef.current.uniforms.uProgress.value;
      materialRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
        current,
        target,
        delta * ANIMATION_SPEED
      );
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture || new THREE.Texture() },
      uProgress: { value: 0 },
      uGridSize: { value: new THREE.Vector2(GRID_SIZE, GRID_SIZE) },
      uTime: { value: 0 },
      uAspect: { value: aspect },
    }),
    [texture, aspect]
  );

  useEffect(() => {
    if (materialRef.current && texture) {
      materialRef.current.uniforms.uTexture.value = texture;
      materialRef.current.needsUpdate = true;
    }
  }, [texture]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uAspect.value = aspect;
    }
  }, [aspect]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(aspect, 1);
    geo.setAttribute(
      'aGridPosition',
      new THREE.InstancedBufferAttribute(gridPositions, 2)
    );
    geo.setAttribute(
      'aRandom',
      new THREE.InstancedBufferAttribute(randoms, 1)
    );
    return geo;
  }, [gridPositions, randoms, aspect]);

  if (!texture) {
    return (
      <Html center>
        <div className="text-white font-mono text-sm tracking-widest animate-pulse whitespace-nowrap">
          LOADING ASSET...
        </div>
      </Html>
    );
  }

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, TOTAL_SHARDS]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </instancedMesh>
  );
}

interface ExplodedCanvasProps {
  exploded: boolean;
  onToggle: () => void;
  artworkUrl: string;
  eventSource?: React.RefObject<HTMLDivElement | null>;
  orientation?: any;
  artworkName: string;
  dimensions?: string | null;
}

export default function ExplodedCanvas({
  exploded,
  onToggle,
  artworkUrl,
  eventSource,
  orientation,
  artworkName,
  dimensions,
}: ExplodedCanvasProps) {
  const aspect = ASPECT_VALUES[orientation] ?? ASPECT_VALUES[ImageOrientation.PORTRAIT];
  const [shouldReset, setShouldReset] = useState(false);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const allowOrbit = !isMobile;

  // Use a state to force re-render when the ref is populated
  const [, setTick] = useState(0);
  useEffect(() => {
    if (eventSource?.current) {
      setTick(t => t + 1);
    }
  }, [eventSource]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  // OrbitControls writes inline touch-action: none; restore vertical scroll on mobile.
  useEffect(() => {
    const el = eventSource?.current;
    if (!el || allowOrbit) return;
    el.style.touchAction = 'pan-y';
    return () => {
      el.style.touchAction = '';
    };
  }, [allowOrbit, eventSource]);


  return (
    <div className="relative w-full h-full bg-black max-md:touch-pan-y">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, DEFAULT_CAMERA_Z], fov: CAMERA_FOV }}
        gl={{ antialias: true, alpha: false }}
        eventSource={eventSource?.current || undefined}
        className="cursor-pointer max-md:touch-pan-y"
      >
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} />

        <CameraController
          exploded={exploded}
          shouldReset={shouldReset}
          onResetComplete={() => setShouldReset(false)}
          disableDrag={!allowOrbit}
          fitToView={isMobile}
          imageAspect={aspect}
        />
        <ArtworkShards exploded={exploded} textureUrl={artworkUrl} aspect={aspect} />

        {/* Interaction Plane to capture clicks ONLY on the image area */}
        <mesh
          position={[0, 0, 0.1]}
          onPointerDown={(e) => {
            pointerDownPos.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={(e) => {
            e.stopPropagation();

            // Calculate distance moved during interaction
            const moveDistance = Math.sqrt(
              Math.pow(e.clientX - pointerDownPos.current.x, 2) +
              Math.pow(e.clientY - pointerDownPos.current.y, 2)
            );

            // If user moved more than 5 pixels, it's a drag/rotate, not a click
            if (moveDistance > 5) return;

            const nextExploded = !exploded;
            // If we are about to un-fractalize, trigger the camera home reset
            if (!nextExploded) {
              setShouldReset(true);
            } else {
              setShouldReset(false);
            }
            onToggle();
          }}
        >
          <planeGeometry args={[aspect * 50, 50]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableRotate={allowOrbit}
          enableZoom={allowOrbit && exploded}
          minDistance={40}
          maxDistance={isMobile ? 400 : 150}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI - 0.1}
          autoRotate={exploded}
          autoRotateSpeed={0.5}
          dampingFactor={0.05}
          onStart={allowOrbit ? () => setShouldReset(false) : undefined}
          // Keep controls off the overlay on mobile so a scroll cannot orbit the camera.
          domElement={allowOrbit ? (eventSource?.current || undefined) : undefined}
        />
      </Canvas>
      {artworkName && (
        <div className="absolute bottom-6 left-8 md:left-16 z-10 pointer-events-none">
          <h1 className="font-serif text-2xl md:text-4xl text-white italic drop-shadow-lg drop-shadow-black">
            {artworkName}
          </h1>
          {dimensions ? (
            <p className="mt-1.5 text-xs md:text-sm text-white/70 tracking-wide drop-shadow-md drop-shadow-black">
              {dimensions}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}