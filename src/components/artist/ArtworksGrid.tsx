import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export interface Artwork {
  id: string;
  title: string;
  image: string;
  valuation: number;
  roi: string;
  aspectRatio?: 'portrait' | 'landscape' | 'square';
}

interface ArtworksGridProps {
  artworks: Artwork[];
  /** Live prices applied immediately after purchase. */
  priceOverrides?: Record<string, number>;
  /**
   * The artist's current fractal price (portfolio.fractal_price, e.g. from
   * GET /artists/:id/basic). Every artwork of an artist trades at this price, so
   * it is passed in once instead of each card requesting a price quote.
   */
  fractalPrice?: number | null;
  /** Show a skeleton for the value while the page is (re)loading the price. */
  priceLoading?: boolean;
}

export function ArtworksGridSkeleton() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="break-inside-avoid space-y-3">
          <Skeleton className="aspect-[3/4] w-full rounded-sm" />
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ArtworksGrid: React.FC<ArtworksGridProps> = ({
  artworks,
  priceOverrides = {},
  fractalPrice = null,
  priceLoading = false,
}) => {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
      {artworks.length > 0 ? (
        <> {artworks.map((artwork, index) => (
          <motion.div
            key={artwork.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.1,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="break-inside-avoid"
          >
            <ArtworkCard
              artwork={artwork}
              priceOverride={priceOverrides[artwork.id]}
              fractalPrice={fractalPrice}
              priceLoading={priceLoading}
            />
          </motion.div>
        ))}

        </>
      ) : (
        <div className="flex justify-center items-center h-full">
          <p className="text-muted-foreground">No artworks found</p>
        </div>
      )}

    </div>
  );
};

interface ArtworkCardProps {
  artwork: Artwork;
  priceOverride?: number;
  fractalPrice?: number | null;
  priceLoading?: boolean;
}

const ArtworkCard: React.FC<ArtworkCardProps> = ({
  artwork,
  priceOverride,
  fractalPrice,
  priceLoading = false,
}) => {
  const livePrice =
    priceOverride != null && Number.isFinite(priceOverride)
      ? priceOverride
      : fractalPrice != null && Number.isFinite(fractalPrice)
        ? fractalPrice
        : null;
  const displayValue = livePrice ?? artwork.valuation;

  return (
    <Link href={`/art/${artwork.id}`} prefetch className="group relative overflow-hidden rounded-sm cursor-pointer block">
      {/* Image Container */}
      <div className="relative w-full overflow-hidden">
        <img
          src={artwork.image}
          alt={artwork.title}
          className="w-full h-auto object-cover transition-all duration-700 ease-out group-hover:scale-105"
        />

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-void/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Value pill — high contrast on any image; tuned for light + dark app theme */}
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-4 left-4 z-[2] flex items-center space-x-3 rounded-full px-3 py-1 transition-all duration-300 group-hover:pr-6 backdrop-blur-xl backdrop-saturate-150 border shadow-lg bg-white/93 text-neutral-900 border-black/12 shadow-black/25 ring-1 ring-inset ring-black/[0.05] dark:bg-neutral-950/90 dark:text-white dark:border-white/20 dark:shadow-black/70 dark:ring-white/10"
          initial={{ opacity: 0, x: -10 }}
        >
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600 dark:text-white/70">
              Value
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.5)] min-w-[4.5rem] inline-block">
              {priceLoading ? (
                <Skeleton className="h-4 w-16 bg-neutral-300/80 dark:bg-white/20" />
              ) : (
                `₹${displayValue.toLocaleString() || '-'}`
              )}
            </span>
          </div>
          <div className="h-6 w-px shrink-0 bg-neutral-900/18 dark:bg-white/25" />
          <div className="flex items-center space-x-1">
            <TrendingUp size={12} className="shrink-0 text-primary drop-shadow-sm" strokeWidth={2.25} />
            <span className="font-mono text-xs font-semibold text-primary drop-shadow-sm">{artwork.roi}</span>
          </div>
        </motion.div>
      </div>

      {/* Title on Hover */}
      <div className="absolute top-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="font-display text-lg text-foreground italic">{artwork.title}</p>
      </div>
    </Link>
  );
};

export default ArtworksGrid;
