import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { getResaleFeePreview, type ResaleFeePreview } from '@/apis/trading/tradingActions';

export interface ResaleArtworkOption {
  artwork_id: number;
  artwork_name: string;
  /** Shares of this artwork not already in an active listing. */
  available_shares: number;
}

interface ResaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  artistProfileId: number;
  maxQuantity: number;
  /** Listings are per artwork: the buyer receives shares of exactly this artwork. */
  artworks?: ResaleArtworkOption[];
  onSubmit: (data: { price: number; quantity: number; artworkId?: number }) => boolean | Promise<boolean>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

const ResaleModal: React.FC<ResaleModalProps> = ({
  isOpen,
  onClose,
  artistName,
  artistProfileId,
  maxQuantity: artistMaxQuantity,
  artworks = [],
  onSubmit,
}) => {
  const sellable = useMemo(() => artworks.filter((a) => a.available_shares > 0), [artworks]);
  const [artworkId, setArtworkId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!isOpen) return;
    setArtworkId((current) =>
      current != null && sellable.some((a) => a.artwork_id === current) ? current : sellable[0]?.artwork_id,
    );
  }, [isOpen, sellable]);
  const selectedArtwork = sellable.find((a) => a.artwork_id === artworkId);
  const maxQuantity = selectedArtwork ? selectedArtwork.available_shares : artistMaxQuantity;
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [feeRates, setFeeRates] = useState<ResaleFeePreview | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feeError, setFeeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestedGross = useMemo(() => {
    const numPrice = parseFloat(price) || 0;
    const numQty = Math.min(parseInt(quantity) || 0, maxQuantity);
    return numPrice * numQty;
  }, [price, quantity, maxQuantity]);

  useEffect(() => {
    if (!isOpen || !artistProfileId) return;
    let active = true;
    setLoadingFees(true);
    setFeeError(false);
    const timer = window.setTimeout(() => {
      getResaleFeePreview(
        artistProfileId,
        requestedGross > 0 ? requestedGross : undefined,
        { artworkId, quantity: Math.min(parseInt(quantity) || 0, maxQuantity) || undefined },
      )
        .then((fees) => {
          if (active) setFeeRates(fees);
        })
        .catch(() => {
          if (active) {
            setFeeRates(null);
            setFeeError(true);
          }
        })
        .finally(() => {
          if (active) setLoadingFees(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, artistProfileId, requestedGross, artworkId, quantity, maxQuantity]);

  const calculations = useMemo(() => {
    const numPrice = parseFloat(price) || 0;
    const numQty = parseInt(quantity) || 0;
    const safeQty = Math.min(numQty, maxQuantity);
    const gross = numPrice * safeQty;

    // The royalty is carved out of Crestox's resale fee, not added on top.
    const resaleRate = feeRates?.crestox_fee_percentage ?? 0;
    const royaltyShare = feeRates?.royalty_enabled ? (feeRates?.royalty_percentage ?? 0) : 0;
    const royaltyRate = (resaleRate * royaltyShare) / 100;
    const crestoxRate = resaleRate - royaltyRate;
    const totalFeeRate = resaleRate;

    const serverGross = parseFloat(feeRates?.gross_amount ?? '');
    const hasServerAmounts =
      Number.isFinite(serverGross) && Math.abs(serverGross - gross) < 0.01;
    const platformFee = hasServerAmounts
      ? parseFloat(feeRates?.platform_fee_amount ?? '0')
      : (gross * totalFeeRate) / 100;
    const crestoxFee = hasServerAmounts
      ? parseFloat(feeRates?.crestox_fee_amount ?? '0')
      : (gross * crestoxRate) / 100;
    const royalty = hasServerAmounts
      ? parseFloat(feeRates?.royalty_amount ?? '0')
      : (gross * royaltyRate) / 100;
    const net = hasServerAmounts
      ? parseFloat(feeRates?.net_payout ?? '0')
      : gross - platformFee;

    const lossMaking = hasServerAmounts && feeRates?.loss_making === true;
    const tds = hasServerAmounts ? parseFloat(feeRates?.tds_amount ?? '0') : 0;
    const costBasis = hasServerAmounts && feeRates?.cost_basis != null ? parseFloat(feeRates.cost_basis) : null;

    return {
      gross,
      lossMaking,
      tds,
      costBasis,
      platformFee,
      crestoxFee,
      royalty,
      crestoxRate,
      royaltyRate,
      totalFeeRate,
      net,
      safeQty,
    };
  }, [price, quantity, maxQuantity, feeRates]);

  const handleSubmit = async () => {
    if (submitting || loadingFees || feeError || !feeRates || calculations.net <= 0) return;
    setSubmitting(true);
    try {
      const succeeded = await onSubmit({
        price: parseFloat(price),
        quantity: calculations.safeQty,
        artworkId,
      });
      if (succeeded) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isOverMax = parseInt(quantity) > maxQuantity;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-lg bg-card/95 border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative backdrop-blur-2xl">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyber-lime to-transparent opacity-50" />

              <div className="flex justify-between items-start p-8 pb-4">
                <div>
                  <h2 className="font-renaissance text-2xl text-foreground tracking-wide">
                    Initiate Resale
                  </h2>
                  <p className="font-cyber text-xs text-muted-foreground mt-1">
                    ASSET: {artistName.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-alert-crimson transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="pt-6 px-6 pb-0 space-y-6">
                {sellable.length > 0 && (
                  <div>
                    <label className="block font-cyber text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                      Artwork
                    </label>
                    <select
                      value={artworkId ?? ''}
                      onChange={(e) => setArtworkId(Number(e.target.value))}
                      className="holographic-input pl-3 w-full h-10 bg-transparent"
                    >
                      {sellable.map((a) => (
                        <option key={a.artwork_id} value={a.artwork_id}>
                          {a.artwork_name} — {a.available_shares} available
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block font-cyber text-[10px] text-cyber-lime uppercase tracking-widest mb-2">
                    Listing Price (per Fractal)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute font-cyber text-2xl text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      className="holographic-input pl-8 w-full h-10"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between">
                    <label className="block font-cyber text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                      Quantity (Max: {maxQuantity})
                    </label>
                    {isOverMax && (
                      <span className="font-cyber text-[10px] text-alert-crimson">
                        Insufficient Holdings
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    max={maxQuantity}
                    className={`holographic-input pl-5 w-full h-10 ${
                      isOverMax ? '!border-alert-crimson !text-alert-crimson' : ''
                    }`}
                  />
                </div>

                <div className="glass-panel p-6 space-y-3">
                  {loadingFees ? (
                    <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="font-cyber text-xs">Loading fee rates…</span>
                    </div>
                  ) : feeError || !feeRates ? (
                    <p className="py-4 text-center font-cyber text-xs text-alert-crimson">
                      Fee quote unavailable. Please try again.
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center font-cyber text-xs text-foreground/60">
                        <span>Gross Value</span>
                        <span>{formatCurrency(calculations.gross)}</span>
                      </div>

                      {calculations.costBasis != null && (
                        <div className="flex justify-between items-center font-cyber text-[10px] text-muted-foreground/80">
                          <span>Your purchase cost</span>
                          <span>{formatCurrency(calculations.costBasis)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center font-cyber text-xs text-muted-foreground">
                        <span>
                          {calculations.lossMaking
                            ? `Loss-making resale fee (fixed ₹${feeRates?.loss_making_fee ?? 50})`
                            : `Platform Fee (${calculations.totalFeeRate.toFixed(1)}%)`}
                        </span>
                        <span>− {formatCurrency(calculations.platformFee)}</span>
                      </div>
                      {calculations.lossMaking && (
                        <p className="font-cyber text-[10px] text-amber-400/90">
                          This price is below what you paid, so the fixed loss-making fee applies instead of the percentage fee.
                        </p>
                      )}

                      {calculations.crestoxRate > 0 && (
                        <div className="flex justify-between items-center font-cyber text-[10px] text-muted-foreground/80 pl-2">
                          <span>Crestox ({calculations.crestoxRate.toFixed(1)}%)</span>
                          <span>{formatCurrency(calculations.crestoxFee)}</span>
                        </div>
                      )}

                      {calculations.royaltyRate > 0 && (
                        <div className="flex justify-between items-center font-cyber text-[10px] text-muted-foreground/80 pl-2">
                          <span>Artist Royalty ({calculations.royaltyRate.toFixed(1)}%)</span>
                          <span>{formatCurrency(calculations.royalty)}</span>
                        </div>
                      )}

                      {calculations.tds > 0 && (
                        <div className="flex justify-between items-center font-cyber text-xs text-muted-foreground">
                          <span>TDS ({feeRates?.tds_percentage ?? 0}%)</span>
                          <span>− {formatCurrency(calculations.tds)}</span>
                        </div>
                      )}

                      <div className="h-px bg-white/10 my-2" />

                      <div className="flex justify-between items-center">
                        <span className="font-cyber text-xs text-cyber-lime uppercase tracking-widest">
                          Est. Net Payout
                        </span>
                        <motion.span
                          key={calculations.net}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="font-cyber text-xl font-bold text-cyber-lime text-glow-lime"
                        >
                          {formatCurrency(Math.max(0, calculations.net))}
                        </motion.span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 pt-0">
                <button
                  onClick={handleSubmit}
                  disabled={loadingFees || feeError || !feeRates || submitting || calculations.net <= 0 || isOverMax}
                  className="w-full group relative px-6 py-4 rounded-lg bg-primary/50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-cyber text-primary-foreground font-bold tracking-widest uppercase">
                      {submitting ? 'Creating Listing…' : 'Confirm Listing'}
                    </span>
                    <ArrowRight
                      size={18}
                      className="text-primary-foreground group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResaleModal;
