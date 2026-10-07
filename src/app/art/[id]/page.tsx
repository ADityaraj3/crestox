"use client";

import dynamic from "next/dynamic";

const ExplodedCanvas = dynamic(() => import("@/components/canvas/ExplodedCanvas"), { ssr: false });
import { useCallback, useEffect, useRef, useState } from "react";
import CollectModule from "@/components/artist/CollectModule";
import AnalyticsTab from "@/components/artist/AnalyticsTab";
import ManifestoBlock from "@/components/ManifestoBlock";
import TechSpecs from "@/components/TechSpecs";
import ArtistReel from "@/components/ArtistReel";
import NavigationPill from "@/components/NavigationPill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getArtworkById,
  getArtworksByArtist,
  getArtworkAnalytics,
  type ArtworkAnalyticsPayload,
} from "@/apis/artwork/artworkActions";
import type { CompleteBuyOrderResponse } from "@/apis/artists/artistActions";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImageOrientation } from "@/components/ScrollImagesReveal";
import { isPurchasePending } from "@/utils/pendingPurchase";

/** API artwork media item */
interface ArtworkMediaItem {
  is_primary?: boolean;
  media: {
    file_path: string;
    orientation?: string;
  };
}

interface ArtworkShare {
  current_price: string;
}

/** API artwork by id response (GET /artwork/:id) */
export interface ArtworkDetail {
  id: number;
  name: string;
  description: string;
  materials_used: string;
  height: number;
  length: number;
  breadth: number;
  demensions_unit: string;
  approval_status: string;
  number_of_shares: number;
  starting_price: string;
  valuation: string;
  quality_score: string;
  created_at: string;
  artist_profile_id?: number;
  artist_profile?: { id: number; artist_name: string };
  artwork_media?: ArtworkMediaItem[];
  shares?: ArtworkShare[];
  available_shares?: number;
  /** Live portfolio fractal price (same source as trading price quote). */
  current_fractal_price?: string | number | null;
}

/** API artwork list item (GET /artwork/artist/:id, used in the artist reel) */
export interface ArtworkListItem {
  id: number;
  name: string;
  valuation: string;
  starting_price: string;
  artwork_media: ArtworkMediaItem[];
}

function ArtDetailSkeleton() {
  return (
    <main className="bg-void min-h-screen relative">
      <div className="noise-overlay" />
      <div className="w-full h-[68vh] md:h-[90vh] relative z-0 flex items-center justify-center bg-background/5">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <CollectModule
        layout="floating"
        pricePerFractal={240.5}
        totalSupply={1000}
        available={142}
        available_fractals={142}
        total_fractals={1000}
        firstArtworkId={null}
        isAtwork={false}
        collectContextLabel="Artist"
        forceLoading={true}
        className="relative z-[90] px-4 pt-4 pb-28 md:px-0 md:pb-0"
      />
      <div className="relative z-10 px-8 md:px-16 py-10 space-y-8">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="max-w-[800px] space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </main>
  );
}

function formatArtworkDimensions(artwork: ArtworkDetail | null): string | null {
  if (!artwork) return null;
  const dims = [artwork.height, artwork.length, artwork.breadth]
    .filter((n) => n != null && n > 0)
    .join(" × ");
  return dims ? `${dims} ${artwork.demensions_unit || ""}`.trim() : null;
}

function buildDetailsMetadata(artwork: ArtworkDetail | null): { label: string; value: string | null }[] {
  if (!artwork) return [];
  const dimensions = formatArtworkDimensions(artwork);
  return [
    { label: "Medium", value: artwork.materials_used || null },
    { label: "Dimensions", value: dimensions || null },
    { label: "Number of parts", value: String(artwork.number_of_shares) },
    { label: "Starting price", value: artwork.starting_price ? `₹${artwork.starting_price}` : null },
    { label: "Valuation", value: artwork.valuation ? `₹${artwork.valuation}` : null },
    { label: "Quality score", value: artwork.quality_score || null },
    {
      label: "Approval status",
      value: artwork.approval_status
        ? artwork.approval_status.charAt(0).toUpperCase() + artwork.approval_status.slice(1).toLowerCase()
        : null,
    },
    {
      label: "Created",
      value: artwork.created_at
        ? new Date(artwork.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        : null,
    },
  ];
}

function mapArtworkToReelItem(a: ArtworkListItem): { id: string; title: string; imageUrl: string; price: number, primary_image_orientation: ImageOrientation } {
  const filePath = a.artwork_media?.[0]?.media?.file_path ?? "";
  const price = parseFloat(a.valuation ?? a.starting_price ?? "0") || 0;
  return {
    id: String(a.id),
    title: a.name,
    imageUrl: filePath,
    price,
    primary_image_orientation: a.artwork_media[0].media.orientation as ImageOrientation
  };
}

const Index = () => {
  const [exploded, setExploded] = useState(false);
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null);
  const [artworkByArtist, setArtworkByArtist] = useState<ArtworkListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ArtworkAnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const { id } = useParams();
  const router = useRouter();
  const interactionRef = useRef<HTMLDivElement>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number, y: number } | null>(null);

  const toggleExplode = () => setExploded(!exploded);

  const handlePointerDown = (e: React.PointerEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!mouseDownPos) return;
    const dist = Math.sqrt(
      Math.pow(e.clientX - mouseDownPos.x, 2) +
      Math.pow(e.clientY - mouseDownPos.y, 2)
    );
    // If not exploded, do nothing on the background plane. The canvas image mesh handles its own clicks.
    // If exploded, a quick global click un-explodes it.
    if (dist < 5 && exploded) {
      toggleExplode();
    }
    setMouseDownPos(null);
  };

  const fetchArtworkById = useCallback(async (options?: { silent?: boolean }) => {
    if (!id || typeof id !== "string") return;
    if (!options?.silent) setLoading(true);
    try {
      const res = await getArtworkById(id)();
      if (res?.status === 200 && res?.data?.data) {
        const data = res.data.data as ArtworkDetail;
        setArtwork(data);
        const artistId = data.artist_profile_id ?? data.artist_profile?.id;
        if (artistId != null) {
          const artistRes = await getArtworksByArtist(String(artistId))();
          if (artistRes?.status === 200 && Array.isArray(artistRes.data?.data)) {
            setArtworkByArtist(artistRes.data.data);
          }
        }
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchArtworkById();
  }, [fetchArtworkById]);

  // If the user returns to this tab (backgrounded-and-back, bfcache restore, or a
  // full reload after a Razorpay redirect) while a purchase on this artwork was
  // in flight, force a silent refetch so the price/availability shown don't sit
  // stale — `returnRefreshing` also tells CollectModule to show its skeleton
  // for the duration, since its "available fractals" number comes from these props.
  const [returnRefreshing, setReturnRefreshing] = useState(false);

  useEffect(() => {
    const artworkIdNum = artwork?.id ?? (typeof id === "string" ? Number(id) : null);
    const handleReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (!isPurchasePending(artworkIdNum)) return;
      setReturnRefreshing(true);
      void fetchArtworkById({ silent: true }).finally(() => setReturnRefreshing(false));
    };
    handleReturn();
    document.addEventListener("visibilitychange", handleReturn);
    window.addEventListener("pageshow", handleReturn);
    window.addEventListener("focus", handleReturn);
    return () => {
      document.removeEventListener("visibilitychange", handleReturn);
      window.removeEventListener("pageshow", handleReturn);
      window.removeEventListener("focus", handleReturn);
    };
  }, [artwork?.id, id, fetchArtworkById]);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setAnalyticsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const res = await getArtworkAnalytics(id)();
        if (cancelled) return;
        if (res?.status === 200 && res?.data?.data) {
          setAnalytics(res.data.data as ArtworkAnalyticsPayload);
        } else {
          setAnalyticsError("Could not load analytics.");
          setAnalytics(null);
        }
      } catch {
        if (!cancelled) {
          setAnalyticsError("Could not load analytics.");
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refetchAnalyticsAfterCollect = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      const res = await getArtworkAnalytics(id)();
      if (res?.status === 200 && res?.data?.data) {
        setAnalytics(res.data.data as ArtworkAnalyticsPayload);
        setAnalyticsError(null);
      }
    } catch {
      // keep showing last analytics if refetch fails
    }
  }, [id]);

  const handleCollectSuccess = useCallback(
    (result?: CompleteBuyOrderResponse) => {
      if (result) {
        setArtwork((prev) => {
          if (!prev) return prev;
          const nextAvail =
            result.artwork_available_shares_after ?? prev.available_shares;
          const nextPrice = result.fractal_price_after;
          return {
            ...prev,
            available_shares: nextAvail,
            current_fractal_price: nextPrice,
            shares: prev.shares?.length
              ? prev.shares.map((s) => ({ ...s, current_price: nextPrice }))
              : prev.shares,
          };
        });
      }
      setReturnRefreshing(true);
      void Promise.all([
        fetchArtworkById({ silent: true }),
        refetchAnalyticsAfterCollect(),
      ]).finally(() => {
        setReturnRefreshing(false);
      });
    },
    [fetchArtworkById, refetchAnalyticsAfterCollect],
  );

  const artworkImageUrl = artwork?.artwork_media?.[0]?.media?.file_path ?? "";
  const metadata = buildDetailsMetadata(artwork);
  const reelArtworks = artworkByArtist
    .map(mapArtworkToReelItem)
    .filter((a) => a.imageUrl && String(a.id) !== String(id));
  const artistName = artwork?.artist_profile?.artist_name ?? "";
  const pricePerFractal = (() => {
    const fromPortfolio = artwork?.current_fractal_price;
    if (fromPortfolio != null && fromPortfolio !== "") {
      const p = parseFloat(String(fromPortfolio));
      if (Number.isFinite(p)) return p;
    }
    if (artwork?.shares?.[0]?.current_price) {
      const p = parseFloat(artwork.shares[0].current_price);
      if (Number.isFinite(p)) return p;
    }
    return parseFloat(artwork?.starting_price ?? "0");
  })();
  const totalFractals = artwork?.number_of_shares ?? 0;
  const availableFractals = artwork?.available_shares ?? 0;

  if (loading) {
    return (
      <>
        <ArtDetailSkeleton />
        <NavigationPill />
      </>
    );
  }

  // Fetch finished but no artwork (not found / failed): show a clear state instead of
  // crashing on `artwork.artwork_media[0]...` below.
  if (!artwork) {
    return (
      <>
        <main className="bg-void min-h-screen relative flex items-center justify-center px-6">
          <div className="noise-overlay" />
          <div className="relative z-10 text-center max-w-md">
            <h1 className="text-2xl font-serif text-foreground mb-3">Artwork not found</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This artwork could not be loaded. It may have been removed or the link is invalid.
            </p>
            <Link
              href="/explore"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Browse other artworks
            </Link>
          </div>
        </main>
        <NavigationPill />
      </>
    );
  }

  return (
    <main className="bg-void min-h-screen relative">
      <div className="noise-overlay" />

      <div className="w-full h-[68vh] md:h-[90vh] relative z-0">
        <ExplodedCanvas
          exploded={exploded}
          onToggle={toggleExplode}
          eventSource={interactionRef}
          artworkUrl={artworkImageUrl}
          artworkName={artwork.name}
          dimensions={formatArtworkDimensions(artwork)}
          orientation={artwork.artwork_media?.[0]?.media?.orientation || ImageOrientation.PORTRAIT}
        />
        <div
          ref={interactionRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className={`absolute top-0 left-0 w-full z-10 pointer-events-auto cursor-pointer max-md:touch-pan-y ${exploded ? "h-[48vh] md:h-[60vh]" : "h-full"} `}
        />
      </div>

      {artwork ? (
        <CollectModule
          layout="floating"
          pricePerFractal={pricePerFractal}
          totalSupply={totalFractals}
          available={availableFractals}
          available_fractals={availableFractals}
          total_fractals={totalFractals}
          firstArtworkId={artwork.id}
          isAtwork
          collectContextLabel={artistName || artwork.artist_profile?.artist_name || "Artist"}
          onCollectSuccess={handleCollectSuccess}
          forceLoading={returnRefreshing}
          className="relative z-[90] px-4 pt-4 pb-28 md:px-0 md:pb-0"
        />
      ) : null}

      <div className="relative z-10 px-8 md:px-16 py-10 md:pr-[400px]">
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="mb-8 bg-card/40 border border-border text-muted-foreground">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground data-[state=active]:shadow-none">
              About
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab
              loading={analyticsLoading}
              error={analyticsError}
              analytics={analytics}
            />
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <ManifestoBlock statement={artwork?.description ?? ""} className="mb-24" />
          </TabsContent>

          <TabsContent value="details" className="mt-0">
            <TechSpecs metadata={metadata} className="mb-24" />
          </TabsContent>
        </Tabs>
      </div>

      <ArtistReel
        artworks={reelArtworks}
        artistName={artistName || "Artist"}
        className="pb-32"
      />

      <NavigationPill />
    </main>
  );
};

export default Index;