"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import GradientButton from '../ui/gradiant-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getFeaturedArtworksForTicker,
  type FeaturedTickerArtwork,
} from '@/apis/artwork/artworkActions';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200&h=200&fit=crop';

function formatInr(n: number, compact?: boolean): string {
  if (!Number.isFinite(n)) return '—';
  if (compact && (n >= 100000 || n <= -100000)) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

interface TickerArtPiece {
  id: number;
  title: string;
  artist: string;
  thumbnail: string;
  fractalPrice: number;
  change24h: number;
  totalValue: string;
  fractalsRemaining: number;
  bio: string;
}

function mapFeaturedToTickerPiece(item: FeaturedTickerArtwork): TickerArtPiece {
  const bio = item.description?.trim() || 'No description available.';
  return {
    id: item.artwork_id,
    title: item.artwork_name,
    artist: item.artist_name?.trim() || 'Unknown artist',
    thumbnail: item.primary_image_url?.trim() || PLACEHOLDER_IMAGE,
    fractalPrice: item.fractal_price,
    change24h: item.change_24h,
    totalValue: formatInr(item.valuation, true),
    fractalsRemaining: item.available_shares,
    bio: bio.length > 220 ? `${bio.slice(0, 217)}…` : bio,
  };
}

interface HoveredCardState {
  piece: TickerArtPiece;
  anchorRect: DOMRect;
}

const TickerItem = ({
  piece,
  onMouseEnter,
  onMouseLeave,
}: {
  piece: TickerArtPiece;
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}) => {
  const isPositive = piece.change24h >= 0;

  return (
    <motion.div
      className="flex items-center gap-4 px-6 py-3 cursor-pointer group"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
        <img
          src={piece.thumbnail}
          alt={piece.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
      </div>

      <div className="flex flex-col min-w-0">
        <span className="font-display text-sm text-foreground truncate">{piece.title}</span>
        <span className="terminal-text text-muted-foreground text-[10px]">{piece.artist}</span>
      </div>

      <div className="flex flex-col items-end ml-4">
        <span className="font-mono text-sm text-foreground">{formatInr(piece.fractalPrice)}</span>
        <span className={`font-mono text-xs ${isPositive ? 'text-terminal' : 'text-signal'}`}>
          {isPositive ? '+' : ''}{piece.change24h.toFixed(1)}%
        </span>
      </div>

      <div className="w-px h-8 bg-border ml-4" />
    </motion.div>
  );
};

const HolographicCard = ({ piece }: { piece: TickerArtPiece }) => {
  const isPositive = piece.change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="w-80 glass-card rounded-lg p-6 holographic z-50"
    >
      <div className="relative w-full h-40 rounded overflow-hidden mb-4">
        <img
          src={piece.thumbnail}
          alt={piece.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="absolute top-3 right-3 px-2 py-1 bg-destructive/90 rounded">
          <span className="font-mono text-xs text-foreground">
            Only {piece.fractalsRemaining} left
          </span>
        </div>
      </div>

      <h3 className="font-display text-xl italic text-foreground mb-1">{piece.title}</h3>
      <p className="terminal-text text-primary mb-3">{piece.artist}</p>

      <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-4">
        {piece.bio}
      </p>

      <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/50 rounded">
        <div className="text-center">
          <p className="terminal-text text-muted-foreground text-[10px] mb-1">FLOOR</p>
          <p className="font-mono text-sm text-foreground">{formatInr(piece.fractalPrice)}</p>
        </div>
        <div className="text-center">
          <p className="terminal-text text-muted-foreground text-[10px] mb-1">24H</p>
          <p className={`font-mono text-sm ${isPositive ? 'text-terminal' : 'text-signal'}`}>
            {isPositive ? '+' : ''}{piece.change24h.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="terminal-text text-muted-foreground text-[10px] mb-1">VALUE</p>
          <p className="font-mono text-sm text-foreground">{piece.totalValue}</p>
        </div>
      </div>

      <Link href={`/art/${piece.id}`} className="block w-full mt-2" prefetch>
        <GradientButton label="View Fractals" className="w-full" />
      </Link>
    </motion.div>
  );
};

function TickerSkeleton() {
  return (
    <div className="relative flex ml-16">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-6 py-3">
          <Skeleton className="w-12 h-12 rounded flex-shrink-0" />
          <div className="flex flex-col gap-2 min-w-[120px]">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="w-px h-8 bg-border ml-4" />
        </div>
      ))}
    </div>
  );
}

const HOVER_BRIDGE_MS = 200;

const TickerStream = () => {
  const [hoveredCard, setHoveredCard] = useState<HoveredCardState | null>(null);
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const hoverBridgeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionDepthRef = useRef(0);

  const clearHoverBridge = useCallback(() => {
    if (hoverBridgeRef.current) {
      clearTimeout(hoverBridgeRef.current);
      hoverBridgeRef.current = null;
    }
  }, []);

  const enterInteraction = useCallback(() => {
    clearHoverBridge();
    interactionDepthRef.current += 1;
    setIsAnimationPaused(true);
  }, [clearHoverBridge]);

  const leaveInteraction = useCallback(() => {
    interactionDepthRef.current = Math.max(0, interactionDepthRef.current - 1);
    clearHoverBridge();
    hoverBridgeRef.current = setTimeout(() => {
      if (interactionDepthRef.current === 0) {
        setIsAnimationPaused(false);
        setHoveredCard(null);
      }
    }, HOVER_BRIDGE_MS);
  }, [clearHoverBridge]);

  const dismissInteraction = useCallback(() => {
    clearHoverBridge();
    interactionDepthRef.current = 0;
    setIsAnimationPaused(false);
    setHoveredCard(null);
  }, [clearHoverBridge]);

  const { data: raw = [], isLoading, isError } = useQuery({
    queryKey: ['featured-ticker-artworks'],
    queryFn: () => getFeaturedArtworksForTicker()(),
    staleTime: 60_000,
  });

  const artPieces = raw.map(mapFeaturedToTickerPiece);
  const duplicatedPieces =
    artPieces.length > 0 ? [...artPieces, ...artPieces] : [];

  const handleMouseEnterItem = (piece: TickerArtPiece, anchorRect: DOMRect) => {
    enterInteraction();
    setHoveredCard({ piece, anchorRect });
  };

  const handleMouseLeaveItem = () => {
    leaveInteraction();
  };

  const handleMouseEnterCard = () => {
    enterInteraction();
  };

  const handleMouseLeaveCard = () => {
    leaveInteraction();
  };

  useEffect(() => {
    return () => clearHoverBridge();
  }, [clearHoverBridge]);

  // The holographic popup is positioned using a viewport rect captured at
  // hover time. If the user scrolls while hovering, that rect becomes stale and
  // the card visually detaches ("floats up") while the carousel stays paused.
  // Dismiss the popup on scroll so the carousel resumes and the card closes.
  useEffect(() => {
    if (!hoveredCard) return;

    const handleScrollDismiss = () => dismissInteraction();

    window.addEventListener('scroll', handleScrollDismiss, { passive: true });
    window.addEventListener('wheel', handleScrollDismiss, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollDismiss);
      window.removeEventListener('wheel', handleScrollDismiss);
    };
  }, [hoveredCard, dismissInteraction]);

  return (
    <section id="market" className="relative py-12 bg-background border-y border-border overflow-hidden">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
        <span className="terminal-text text-primary text-xs tracking-[0.3em] [writing-mode:vertical-lr] rotate-180">
          LIVE MARKET
        </span>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {isLoading && <TickerSkeleton />}

      {!isLoading && isError && (
        <p className="ml-16 px-6 font-mono text-sm text-muted-foreground">
          Could not load the live market. Please try again later.
        </p>
      )}

      {!isLoading && !isError && artPieces.length === 0 && (
        <p className="ml-16 px-6 font-mono text-sm text-muted-foreground">
          No featured artworks in the live market yet.
        </p>
      )}

      {!isLoading && !isError && duplicatedPieces.length > 0 && (
        <div
          className={cn(
            'relative flex animate-ticker ml-16',
            isAnimationPaused && 'pause-animation',
          )}
          style={{ width: 'max-content' }}
        >
          {duplicatedPieces.map((piece, index) => (
            <TickerItem
              key={`${piece.id}-${index}`}
              piece={piece}
              onMouseEnter={(e) => handleMouseEnterItem(piece, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={handleMouseLeaveItem}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {hoveredCard && (
          <div
            className="fixed z-50 pointer-events-auto"
            onMouseEnter={handleMouseEnterCard}
            onMouseLeave={handleMouseLeaveCard}
            style={{
              left: Math.min(
                Math.max(hoveredCard.anchorRect.left + hoveredCard.anchorRect.width / 2, 176),
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - 176
              ),
              top: Math.max(hoveredCard.anchorRect.top - 16, 16),
              transform: 'translate(-50%, -100%)',
            }}
          >
            <HolographicCard
              piece={hoveredCard.piece}
            />
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default TickerStream;
