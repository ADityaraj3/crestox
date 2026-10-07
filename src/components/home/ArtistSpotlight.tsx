"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import GradientButton from '../ui/gradiant-button';
import { getHomepageArtists, type HomepageArtist } from '@/apis/artists/artistActions';
import { Skeleton } from '@/components/ui/skeleton';

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Carousel slide: `artworkName` is null for the artist profile image */
interface SpotlightSlide {
  url: string;
  artworkName: string | null;
}

interface SpotlightCardModel extends HomepageArtist {
  displaySlides: SpotlightSlide[];
}

const ArtistCard = ({ artist, index }: { artist: SpotlightCardModel; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const isInView = useInView(cardRef, { amount: 0.3 });
  const { displaySlides, fractals_sold_percentage: fundingProgress } = artist;
  const len = displaySlides.length;
  const currentCaption = displaySlides[currentImageIndex]?.artworkName ?? null;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 1023px)").matches || window.matchMedia("(hover: none)").matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.8]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (len > 0 && (isHovered || (isMobile && isInView))) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % len);
      }, 1500);
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, isMobile, isInView, len]);

  const safePct = Math.min(100, Math.max(0, Number.isFinite(fundingProgress) ? fundingProgress : 0));

  return (
    <motion.div
      ref={cardRef}
      style={{ y, opacity, scale }}
      className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
    >
      {/* Image */}
      <motion.div
        className="relative w-full md:w-1/2 aspect-[3/4] max-w-md"
        whileHover={{ scale: 1.02 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 rounded-sm overflow-hidden bg-muted">
          {len > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={displaySlides[currentImageIndex].url}
                alt={
                  currentCaption
                    ? `${artist.artist_name} — ${currentCaption}`
                    : `${artist.artist_name} — profile`
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-muted-foreground px-4 text-center">
              No artwork images yet
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent pointer-events-none" />
        </div>

        <motion.div
          className="absolute -bottom-4 -right-4 md:right-auto md:-left-4 glass-card rounded-sm p-4 z-10"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="terminal-text text-muted-foreground text-[10px] mb-1">FUND PROGRESS</p>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 mb-2">
            <span className="font-display text-2xl italic text-gradient-gold">{safePct}%</span>
            <span className="font-mono text-[10px] text-muted-foreground tracking-wide">of</span>
            <span className="font-mono text-sm text-foreground tabular-nums">
              {formatInr(artist.total_portfolio_value)}
            </span>
          </div>
          <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-gold rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: `${safePct}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        <div className="absolute inset-0 rounded-sm border border-primary/20 pointer-events-none z-20" />
        <div className="absolute -inset-1 rounded-sm border border-primary/10 pointer-events-none z-20" />

        {len > 0 && (isHovered || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
          >
            {displaySlides.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${idx === currentImageIndex ? 'bg-primary' : 'bg-primary/20'}`}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <div className="w-full md:w-1/2 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {artist.homepage_tagline?.trim() ? (
            <p className="terminal-text text-primary text-xs tracking-[0.3em] mb-2">
              {artist.homepage_tagline}
            </p>
          ) : null}
          <h3 className="font-display text-3xl md:text-4xl italic text-foreground mb-2">{artist.artist_name}</h3>
          <div className="mb-4 min-h-[1.5rem]">
            {currentCaption ? (
              <p className="font-mono text-muted-foreground">{currentCaption}</p>
            ) : null}
          </div>

          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-6">
            {artist.description?.trim() || '—'}
          </p>

          {/* {len > 0 && (
            <div className="mb-6">
              <p className="terminal-text text-muted-foreground text-[10px] mb-2">ALL WORKS</p>
              <div className="flex flex-wrap gap-2">
                {displayImages.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setCurrentImageIndex(i)}
                    className={`relative h-16 w-14 shrink-0 overflow-hidden rounded border transition-colors ${i === currentImageIndex ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )} */}

          <div className="flex gap-8 mb-6">
            <div>
              <p className="terminal-text text-muted-foreground text-[10px] mb-1">Fractal price</p>
              <p className="font-mono text-lg text-primary">{formatInr(artist.fractal_price)}</p>
            </div>
            <div>
              <p className="terminal-text text-muted-foreground text-[10px] mb-1">Portfolio value</p>
              <p className="font-mono text-lg text-foreground">{formatInr(artist.total_portfolio_value)}</p>
            </div>
          </div>

          <motion.div
            className=" text-primary font-mono text-sm tracking-wider uppercase rounded transition-all duration-300 inline-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href={`/artist/${artist.artist_profile_id}`} prefetch>
              <GradientButton
                variant="primary"
                label="Back This Artist"
              />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

function SpotlightSkeleton() {
  return (
    <div className="space-y-32">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
        >
          <Skeleton className="w-full md:w-1/2 aspect-[3/4] max-w-md rounded-sm" />
          <div className="w-full md:w-1/2 max-w-lg space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ArtistSpotlight = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const { data: raw = [], isLoading, isError } = useQuery({
    queryKey: ['homepage-artists'],
    queryFn: async () => {
      const res = await getHomepageArtists()();
      return res;
    },
    staleTime: 60_000,
  });

  const cards: SpotlightCardModel[] = raw.map((a) => {
    const slides: SpotlightSlide[] = [];
    const avatar = a.artist_avatar_url?.trim();
    console.log('avatar', avatar);
    if (avatar) {
      slides.push({ url: avatar, artworkName: null });
    }
    const items = Array.isArray(a.artworks) ? a.artworks : [];
    for (const item of items) {
      const url = typeof item?.url === 'string' ? item.url.trim() : '';
      if (!url) continue;
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      slides.push({ url, artworkName: name || 'Untitled' });
    }
    return { ...a, displaySlides: slides };
  });

  return (
    <section
      id="artists"
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-muted noise"
    >
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="terminal-text text-primary text-xs tracking-[0.4em] mb-4">EMERGING ARTISTS</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl italic text-foreground mb-6">
            Support
            <span className="text-gradient-gold"> Emerging Artists</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-xl mx-auto">
            Own a part in selected works and help fund artists at an earlier stage.
          </p>
        </motion.div>

        {isLoading && <SpotlightSkeleton />}

        {!isLoading && isError && (
          <p className="text-center font-mono text-sm text-muted-foreground">
            Could not load featured artists. Please try again later.
          </p>
        )}

        {!isLoading && !isError && cards.length === 0 && (
          <p className="text-center font-mono text-sm text-muted-foreground">
            No artists on the homepage yet.
          </p>
        )}

        {!isLoading && !isError && cards.length > 0 && (
          <div className="space-y-32">
            {cards.map((artist, index) => (
              <ArtistCard key={artist.artist_profile_id} artist={artist} index={index} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center mt-20"
        >
          <motion.div
            className="group inline-flex items-center gap-3  font-mono text-sm tracking-wider uppercase rounded hover:border-primary hover:text-primary transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <GradientButton variant="primary" label='' className='flex justify-center items-center'>
              <Link href="/explore" prefetch>
                Explore All Artists
              </Link>
            </GradientButton>

          </motion.div>
        </motion.div>


      </div>
    </section>
  );
};

export default ArtistSpotlight;
