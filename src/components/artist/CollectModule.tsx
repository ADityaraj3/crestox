import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import {
  getBufferPriceQuote,
  getBuyOrderStatus,
  initiateBuyOrder,
  completeBuyOrder,
  cancelBuyOrder,
  HIGH_VOLATILITY_ACK_REQUIRED,
  type BufferPriceQuote,
  type InitiateBuyResponse,
  type CompleteBuyOrderResponse,
} from '@/apis/artists/artistActions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getCookie } from '@/utils/cookieUtils';
import { cn } from '@/lib/utils';
import { markPurchasePending, clearPurchasePending, getPendingPurchase, isPurchasePending } from '@/utils/pendingPurchase';

const NOT_LOGGED_IN_BUY_MESSAGE = 'You are not logged in. Log in to buy the fractal.';

function hasAuthToken(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(getCookie('token')?.trim());
}

const ENABLE_RAZORPAY = true;
/** Wait this long after the last quantity change before requesting a new quote. */
const QUOTE_DEBOUNCE_MS = 400;

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type CollectModuleLayout = 'sidebar' | 'floating';

interface CollectModuleProps {
  pricePerFractal?: number;
  totalSupply?: number;
  available?: number;
  available_fractals?: number;
  total_fractals?: number;
  firstArtworkId?: number | null;
  onCollectSuccess?: (result?: CompleteBuyOrderResponse) => void;
  isAtwork?: boolean;
  /** Shown in the collect dialog title: "Collect from {collectContextLabel}" */
  collectContextLabel?: string;
  layout?: CollectModuleLayout;
  className?: string;
  /**
   * Set by the parent page while it's re-fetching artwork/artist data after the
   * user returns from a Razorpay redirect — the "available fractals" number is
   * sourced from the parent's props, not this component's own quote, so it can't
   * detect staleness on its own.
   */
  forceLoading?: boolean;
}

const CollectModule: React.FC<CollectModuleProps> = ({
  pricePerFractal = 240.5,
  totalSupply = 1000,
  available = 142,
  available_fractals = 142,
  total_fractals = 1000,
  firstArtworkId = null,
  onCollectSuccess,
  isAtwork = false,
  collectContextLabel = 'Artist',
  layout = 'sidebar',
  className,
  forceLoading = false,
}) => {
  const router = useRouter();
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [quote, setQuote] = useState<BufferPriceQuote | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [dialogQuoteLoading, setDialogQuoteLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [initiatedOrder, setInitiatedOrder] = useState<InitiateBuyResponse | null>(null);
  // High Volatility Warning (Dynamic Buffer Addendum): the buyer must confirm
  // before an order is accepted when the computed buffer exceeds the 15% ceiling.
  const [highVolAcknowledged, setHighVolAcknowledged] = useState(false);
  const [highVolRequired, setHighVolRequired] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  // True while a Razorpay payment is in flight (checkout opened, outcome not yet known).
  // Lets us tell a genuine "still fetching the first quote" skeleton apart from a
  // "just returned from the payment app, force-refreshing stale numbers" skeleton.
  const [forceRefreshSkeleton, setForceRefreshSkeleton] = useState(false);
  const [isCompletingOrPending, setIsCompletingOrPending] = useState(false);
  const paymentPendingRef = useRef(false);
  const collectInFlightRef = useRef(false);
  const prevArtworkIdRef = useRef<number | null>(null);
  const prevDialogOpenRef = useRef(false);
  const quoteRequestRef = useRef(0);
  const prevQuoteQtyRef = useRef<number | null>(null);
  const quantityRef = useRef(quantity);
  quantityRef.current = quantity;

  const total = total_fractals || totalSupply;
  const showMarketSkeleton = forceLoading || forceRefreshSkeleton || isCompletingOrPending || (marketLoading && quote == null);
  const showDialogQuoteSkeleton = dialogQuoteLoading || (marketLoading && quote == null);

  // Artwork pages pass per-artwork availability; artist pages pass portfolio-wide totals.
  const displayAvailable =
    available_fractals != null && Number.isFinite(Number(available_fractals)) ? Number(available_fractals) : available != null && Number.isFinite(Number(available)) ? Number(available) : null;

  const availShow = displayAvailable != null ? displayAvailable : quote?.total_available_shares != null && Number.isFinite(quote.total_available_shares) ? quote.total_available_shares : 0;

  const showAvailabilitySkeleton = forceLoading || forceRefreshSkeleton || isCompletingOrPending || (firstArtworkId != null && (displayAvailable == null && showMarketSkeleton));
  const availableBarPercent = total > 0 ? (availShow / total) * 100 : 0;

  useEffect(() => {
    if (ENABLE_RAZORPAY) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
    setRazorpayLoaded(true);
    return undefined;
  }, []);

  type QuoteFetchMode = 'initial' | 'silent' | 'dialog';

  const fetchQuote = useCallback(async (artworkId: number, qty: number, mode: QuoteFetchMode) => {
    const requestId = ++quoteRequestRef.current;
    if (mode === 'initial') {
      setMarketLoading(true);
    } else if (mode === 'dialog') {
      setDialogQuoteLoading(true);
    }

    try {
      const data = await getBufferPriceQuote(artworkId, qty)();
      if (requestId !== quoteRequestRef.current) return;
      setQuote(data);
    } catch {
      if (requestId !== quoteRequestRef.current) return;
      if (mode === 'initial') setQuote(null);
    } finally {
      if (requestId !== quoteRequestRef.current) return;
      if (mode === 'initial') setMarketLoading(false);
      if (mode === 'dialog') setDialogQuoteLoading(false);
      setForceRefreshSkeleton(false);
    }
  }, []);

  // On mobile, UPI/app-based Razorpay payment methods hand off to a separate app
  // (or a full top-level redirect to a bank/netbanking page). Either way our tab
  // can come back in one of two shapes: (a) merely backgrounded, same JS heap,
  // same React state — a plain in-memory ref is enough; or (b) fully unloaded and
  // reloaded — any in-memory ref/state is wiped, so we also consult a
  // sessionStorage flag (isPurchasePending) that survives the reload. Without
  // checking that on mount too, a fresh reload landing back on this page would
  // never re-arm the "just came back mid-payment" detection at all.
  const triggerReturnRefresh = useCallback(() => {
    const artworkId = firstArtworkId != null && !isNaN(firstArtworkId) ? firstArtworkId : null;
    if (artworkId == null) return;
    if (!paymentPendingRef.current && !isPurchasePending(artworkId)) return;
    setForceRefreshSkeleton(true);
    const q = quantityRef.current === '' ? 1 : quantityRef.current;
    void fetchQuote(artworkId, q, 'initial');
  }, [firstArtworkId, fetchQuote]);

  // Re-check as soon as we mount/know the artwork id — covers the full-reload case,
  // where visibilitychange/pageshow may fire before or without React ever wiring up
  // these listeners in time, but the sessionStorage flag is already there to read.
  useEffect(() => {
    if (document.visibilityState === 'visible') {
      triggerReturnRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstArtworkId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') triggerReturnRefresh();
    };
    const onPageShow = () => triggerReturnRefresh();
    const onFocus = () => triggerReturnRefresh();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [triggerReturnRefresh]);

  useEffect(() => {
    const id = firstArtworkId != null && !isNaN(firstArtworkId) ? firstArtworkId : null;
    if (id == null) {
      quoteRequestRef.current += 1;
      setQuote(null);
      setMarketLoading(false);
      setDialogQuoteLoading(false);
      prevArtworkIdRef.current = null;
      return;
    }

    const artworkChanged = prevArtworkIdRef.current !== id;
    prevArtworkIdRef.current = id;
    if (artworkChanged) {
      setQuote(null);
    }

    const dialogJustClosed = !dialogOpen && prevDialogOpenRef.current;
    prevDialogOpenRef.current = dialogOpen;
    if (dialogJustClosed && !artworkChanged) {
      return;
    }

    const q = quantity === '' ? 1 : quantity;
    const quantityChanged = prevQuoteQtyRef.current !== q;
    prevQuoteQtyRef.current = q;
    const mode: QuoteFetchMode = artworkChanged ? 'initial' : dialogOpen ? 'dialog' : 'silent';

    // Each quote is a ~2-3 s server call. Typing "25" or tapping +/- several
    // times used to fire one request per change; wait until the quantity
    // settles and request only the last one.
    // Responses for an older quantity are discarded by the request id in fetchQuote.
    if (!artworkChanged && quantityChanged) {
      if (mode === 'dialog') setDialogQuoteLoading(true);
      const timer = window.setTimeout(() => {
        void fetchQuote(id, q, mode);
      }, QUOTE_DEBOUNCE_MS);
      return () => window.clearTimeout(timer);
    }
    void fetchQuote(id, q, mode);
  }, [firstArtworkId, quantity, dialogOpen, fetchQuote]);

  const maxQty = Math.max(0, availShow);

  useEffect(() => {
    if (!dialogOpen || maxQty <= 0) return;
    setQuantity((prev) => {
      const n = prev === '' ? 1 : prev;
      return Math.min(maxQty, Math.max(1, n));
    });
  }, [dialogOpen, maxQty]);

  const currentPrice = quote?.current_price ?? 0;
  const bufferPercent = quote?.buffer_percent ?? 0;

  const parsedQty = parseInt(String(quantity), 10);
  const effectiveQty = !isAtwork ? 0 : quantity === '' ? 0 : Number.isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);

  useEffect(() => {
    setInitiatedOrder(null);
    setHighVolAcknowledged(false);
    setHighVolRequired(false);
  }, [firstArtworkId, effectiveQty]);

  const needsHighVolAck = Boolean(quote?.high_volatility_warning) || highVolRequired;

  /** Releases the reservation of an order that was initiated but never paid. */
  const releaseUnpaidOrder = useCallback(async (razorpayOrderId: string | undefined) => {
    if (!razorpayOrderId) return null;
    try {
      return await cancelBuyOrder(razorpayOrderId)();
    } catch {
      // The sweeper expires it after 30 minutes anyway.
      return null;
    }
  }, []);

  const baseAmount = effectiveQty * currentPrice;
  const hasFillPreview = Boolean(quote?.fill_breakdown?.length) && quote?.fill_subtotal_pre_tax != null && quote?.fill_total_buyer_pays != null;
  const subTotalPreTax = hasFillPreview ? parseFloat(quote!.fill_subtotal_pre_tax!) : baseAmount;
  const fallbackGst = baseAmount * 0.18;
  const totalPayableInr = hasFillPreview ? parseFloat(quote!.fill_total_buyer_pays!) : baseAmount + fallbackGst;
  const taxesAndFeesAmount = hasFillPreview ? Math.max(0, totalPayableInr - subTotalPreTax) : fallbackGst;

  const formatCurrencyWithSmallDecimals = (val: number) => {
    const parts = val.toFixed(2).split('.');
    if (parts.length !== 2) return val.toFixed(2);
    return (
      <>
        {parts[0]}
        <span className="text-[0.7em] opacity-70">.{parts[1]}</span>
      </>
    );
  };

  const canInteract = Boolean(firstArtworkId != null && !isNaN(firstArtworkId) && isAtwork && maxQty > 0);

  const bumpQuantity = (delta: number) => {
    setQuantity((prev) => {
      const base = prev === '' ? 0 : prev;
      const next = Math.min(maxQty || 1, Math.max(1, base + delta));
      return next;
    });
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === '') {
      setQuantity('');
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    const n = parseInt(raw, 10);
    if (n > maxQty) {
      setQuantity(maxQty);
      return;
    }
    setQuantity(n);
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || quantity === 0) {
      setQuantity(1);
    }
  };

  const fillSourceLabel = (source: 'SECONDARY_SALE' | 'PRIMARY_SALE') => (source === 'SECONDARY_SALE' ? 'Reseller' : 'Artist');

  const quoteFromComplete = useCallback((complete: CompleteBuyOrderResponse): BufferPriceQuote => {
    const p = parseFloat(complete.fractal_price_after ?? '0');
    const price = Number.isFinite(p) ? p : 0;
    const rawAvail = complete.artwork_available_shares_after ?? complete.available_shares_after;
    const nextAvail = typeof rawAvail === 'number' && Number.isFinite(rawAvail) ? rawAvail : 0;
    return {
      current_price: price,
      buffer_percent: null,
      fill_breakdown: [],
      fill_subtotal_pre_tax: null,
      fill_total_buyer_pays: null,
      total_available_shares: nextAvail,
      sufficient_for_quantity: nextAvail >= 1,
    };
  }, []);

  const refreshAfterPurchase = useCallback(
    async (artworkId: number, complete: CompleteBuyOrderResponse) => {
      setQuantity(1);
      setCollecting(false);

      if (complete.fractal_price_after) {
        setQuote(quoteFromComplete(complete));
      }
      setMarketLoading(false);

      const refund = parseFloat(complete.refund_amount ?? '0');
      toast.success(refund > 0 ? `Fractals collected. ₹${refund.toFixed(2)} buffer refund initiated.` : 'Fractals collected successfully');
      onCollectSuccess?.(complete);

      await fetchQuote(artworkId, 1, dialogOpen ? 'dialog' : 'silent');
    },
    [onCollectSuccess, quoteFromComplete, fetchQuote, dialogOpen],
  );

  useEffect(() => {
    const artworkId = firstArtworkId != null && !isNaN(firstArtworkId) ? firstArtworkId : null;
    const pending = getPendingPurchase(artworkId);
    if (artworkId == null || !pending) {
      setIsCompletingOrPending(false);
      return;
    }

    setIsCompletingOrPending(true);
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const order = await getBuyOrderStatus(pending.razorpayOrderId)();
        if (cancelled) return;

        if (!order.terminal) {
          timer = window.setTimeout(poll, 2000);
          return;
        }

        clearPurchasePending();
        paymentPendingRef.current = false;
        setInitiatedOrder(null);
        setCollecting(false);
        setForceRefreshSkeleton(false);
        setIsCompletingOrPending(false);

        if (order.status === 'COMPLETED') {
          const refund = parseFloat(order.refund_amount ?? '0');
          toast.success(refund > 0 ? `Fractals collected. ₹${refund.toFixed(2)} buffer refund recorded.` : 'Fractals collected successfully');
          onCollectSuccess?.({
            status: 'COMPLETED',
            refund_amount: order.refund_amount ?? undefined,
          });
        } else {
          toast.error(order.message);
        }
        await fetchQuote(artworkId, 1, 'silent');
      } catch {
        if (!cancelled) {
          timer = window.setTimeout(poll, 3000);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [firstArtworkId, initiatedOrder?.razorpay_order_id, fetchQuote, onCollectSuccess]);

  const redirectToLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [router]);

  const openDialog = () => {
    if (!hasAuthToken()) {
      toast.error(NOT_LOGGED_IN_BUY_MESSAGE);
      redirectToLogin();
      return;
    }
    if (!canInteract) {
      toast.error('No fractals available to collect for this artwork yet.');
      return;
    }
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !paymentPendingRef.current) {
      // Closing after "Review secure charge" but before paying: give the
      // reserved fractals back right away instead of after the 30-minute expiry.
      void releaseUnpaidOrder(initiatedOrder?.razorpay_order_id);
      setInitiatedOrder(null);
      clearPurchasePending();
    }
    setDialogOpen(open);
  };

  const inventoryShort = quote?.sufficient_for_quantity === false && quote?.total_available_shares != null;

  const handleCollectConfirm = async () => {
    if (collectInFlightRef.current) return;

    if (!hasAuthToken()) {
      toast.error(NOT_LOGGED_IN_BUY_MESSAGE);
      redirectToLogin();
      return;
    }

    const artworkId = firstArtworkId != null && !isNaN(firstArtworkId) ? firstArtworkId : null;
    if (artworkId == null) {
      toast.error('No artwork selected');
      return;
    }

    if (effectiveQty < 1) {
      toast.error('Choose a quantity of at least 1');
      return;
    }

    if (quote?.sufficient_for_quantity === false) {
      toast.error(quote.total_available_shares != null ? `Only ${quote.total_available_shares} fractal(s) available at this price mix.` : 'Not enough fractals available for this quantity.');
      return;
    }

    const quotedFractalPrice = quote?.current_price ?? 0;

    if (needsHighVolAck && !highVolAcknowledged) {
      toast.error('Confirm the high-volatility warning to continue.');
      return;
    }

    collectInFlightRef.current = true;
    setCollecting(true);

    try {
      if (!initiatedOrder) {
        const orderData = await initiateBuyOrder({
          artwork_id: artworkId,
          quantity: effectiveQty,
          quoted_price: quotedFractalPrice,
          ...(highVolAcknowledged ? { acknowledge_high_volatility: true } : {}),
        })();

        setInitiatedOrder(orderData);
        markPurchasePending({
          artworkId,
          quantity: effectiveQty,
          razorpayOrderId: orderData.razorpay_order_id,
          amount: orderData.amount,
          estimatedCost: orderData.estimated_cost,
          maxCharge: orderData.max_charge,
          currency: orderData.currency,
          expiresAt: orderData.expires_at,
        });
        setCollecting(false);
        return;
      }

      const orderData = initiatedOrder;
      const handleCompletedOrder = async (completed: CompleteBuyOrderResponse) => {
        if (completed.total_shares_purchased != null) {
          await refreshAfterPurchase(artworkId, completed);
          return;
        }

        setCollecting(false);
        toast.info(completed.message ?? 'Payment received. Your collection is being updated.');
        onCollectSuccess?.(completed);
        await fetchQuote(artworkId, 1, 'silent');
      };

      if (ENABLE_RAZORPAY) {
        const options = {
          key: orderData.razorpay_key_id,
          amount: parseFloat(orderData.amount) * 100,
          currency: orderData.currency,
          name: 'Crestox',
          description: `Purchase ${effectiveQty} fractals`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response: any) {
            let terminalConfirmed = false;
            try {
              setIsCompletingOrPending(true);
              const completed = await completeBuyOrder({
                artwork_id: artworkId,
                quantity: effectiveQty,
                razorpay_order_id: orderData.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                quoted_price: quotedFractalPrice,
                payment_response: response,
              })();
              terminalConfirmed = completed.status !== 'PROCESSING';
              await handleCompletedOrder(completed);
            } catch (err: any) {
              const s = err?.response?.status;
              const serverMessage: string | undefined = err?.response?.data?.message;
              if (s === 401 || s === 403) {
                toast.info(NOT_LOGGED_IN_BUY_MESSAGE);
                terminalConfirmed = true;
              } else if (s === 400 && serverMessage) {
                // A definite outcome from the server, e.g. the price moved past
                // the buffer and the payment is being refunded in full.
                toast.error(serverMessage);
                terminalConfirmed = true;
                setInitiatedOrder(null);
                void fetchQuote(artworkId, 1, 'silent');
              } else {
                // Network/5xx: the payment may still settle via the webhook;
                // the status poller takes over.
                toast.info('Payment received. Confirming your order…');
              }
              setCollecting(false);
            } finally {
              paymentPendingRef.current = !terminalConfirmed;
              if (terminalConfirmed) {
                clearPurchasePending();
                setIsCompletingOrPending(false);
              }
            }
          },
          modal: {
            ondismiss: function () {
              paymentPendingRef.current = false;
              clearPurchasePending();
              setForceRefreshSkeleton(false);
              setCollecting(false);
              setInitiatedOrder(null);
              void releaseUnpaidOrder(orderData.razorpay_order_id).then((res) => {
                if (res && (res.status === 'COMPLETED' || res.status === 'ALREADY_COMPLETED')) {
                  toast.success('Payment received. Your fractals have been collected.');
                  onCollectSuccess?.({ status: 'COMPLETED' });
                } else {
                  toast.info('Checkout closed. No payment was taken and the reserved fractals were released.');
                }
                void fetchQuote(artworkId, 1, 'silent');
              });
            },
          },
          theme: {
            color: '#3B82F6',
          },
        };

        setDialogOpen(false);

        paymentPendingRef.current = true;
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        toast.info('Processing payment...');

        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = `mock_signature_${Date.now()}`;

        try {
          setIsCompletingOrPending(true);
          const completed = await completeBuyOrder({
            artwork_id: artworkId,
            quantity: effectiveQty,
            razorpay_order_id: orderData.razorpay_order_id,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: mockSignature,
            quoted_price: quotedFractalPrice,
          })();

          await handleCompletedOrder(completed);
        } finally {
          clearPurchasePending();
          setIsCompletingOrPending(false);
        }
      }
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 409 && err?.response?.data?.data?.code === HIGH_VOLATILITY_ACK_REQUIRED) {
        setHighVolRequired(true);
        toast.warning(err?.response?.data?.message ?? 'High volatility: please confirm to continue.');
        setCollecting(false);
        return;
      }
      toast.error(s === 401 || s === 403 ? NOT_LOGGED_IN_BUY_MESSAGE : (err?.response?.data?.message ?? 'Failed to complete purchase'));
      setCollecting(false);
    } finally {
      collectInFlightRef.current = false;
    }
  };

  const asideClass = layout === 'floating' ? 'relative lg:fixed lg:left-auto lg:right-8 lg:bottom-8 lg:top-auto z-[90] w-full lg:w-[340px]' : 'w-full';

  const innerSurface = layout === 'floating' ? 'glass-panel border border-foreground/10 bg-background/80' : 'bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-[#1E293B]';

  const summaryHeadingCls = layout === 'floating' ? 'text-[#60A5FA]' : 'text-blue-600 dark:text-[#3B82F6]';
  const summaryPriceCls = layout === 'floating' ? 'text-white' : 'text-slate-900 dark:text-white';
  const summaryMutedCls = layout === 'floating' ? 'text-zinc-400' : 'text-slate-500 dark:text-zinc-400';
  const summaryBarTrackCls = layout === 'floating' ? 'bg-white/10' : 'bg-slate-200 dark:bg-[#1E293B]';
  const summaryHintCls = layout === 'floating' ? 'text-zinc-500' : 'text-slate-400 dark:text-zinc-500';

  return (
    <>
      <motion.aside
        initial={{ opacity: 0, x: layout === 'floating' ? 50 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: layout === 'floating' ? 0.5 : 0.4, duration: 0.8 }}
        className={cn(asideClass, className)}
      >
        <div className={cn('relative overflow-hidden rounded-2xl p-6 flex flex-col gap-6 shadow-2xl w-full text-left', innerSurface, (!canInteract && !forceLoading && !isCompletingOrPending) || !razorpayLoaded ? 'opacity-60' : '')}>
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h3 className={cn('font-sans text-sm font-medium tracking-wide uppercase', summaryHeadingCls)}>Current Valuation</h3>
              <div className="flex items-baseline space-x-1 min-h-[2.5rem]">
                {showMarketSkeleton ? (
                  <Skeleton className={cn('h-10 w-40 rounded-lg', layout === 'floating' ? 'bg-white/15' : 'bg-slate-200 dark:bg-zinc-700')} />
                ) : (
                  <span className={cn('font-sans text-4xl font-bold tracking-tight', summaryPriceCls)}>
                    {'\u20B9'}
                    {currentPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm font-sans min-h-[1.25rem]">
              <span className={summaryMutedCls}>Available fractals</span>
              {showAvailabilitySkeleton ? (
                <Skeleton className={cn('h-4 w-28 rounded', layout === 'floating' ? 'bg-white/15' : 'bg-slate-200 dark:bg-zinc-700')} />
              ) : (
                <span className={summaryMutedCls}>
                  {availShow.toLocaleString()} / {total.toLocaleString()}
                </span>
              )}
            </div>

            <div className={cn('h-2 w-full rounded-full overflow-hidden', summaryBarTrackCls)}>
              {showAvailabilitySkeleton ? (
                <Skeleton className={cn('h-full w-full rounded-full', layout === 'floating' ? 'bg-white/15' : 'bg-slate-200 dark:bg-zinc-700')} />
              ) : (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${availableBarPercent}%` }}
                  transition={{
                    duration: 1.5,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.6,
                  }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 dark:to-[#3B82F6] rounded-full"
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openDialog}
            disabled={!canInteract || !razorpayLoaded || forceLoading || isCompletingOrPending}
            className="group w-full h-12 shrink-0 bg-blue-500 dark:bg-[#3B82F6] hover:bg-blue-600 dark:hover:bg-[#2563EB] text-white rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <span className="font-sans font-medium text-base">{!razorpayLoaded || forceLoading || isCompletingOrPending ? 'Loading...' : 'Collect fractal'}</span>
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <p className={cn('text-center font-sans text-xs', summaryHintCls)}>{ENABLE_RAZORPAY ? 'Secure payment via Razorpay' : 'Payment processing (Demo mode)'}</p>
        </div>
      </motion.aside>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(
            'sm:max-w-md gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            '[&>button]:text-muted-foreground [&>button]:hover:text-foreground',
          )}
        >
          <div className="max-h-[90vh] overflow-y-auto p-6 pb-8">
            <DialogHeader className="space-y-3 pr-8 text-left">
              <DialogTitle className="font-serif text-2xl font-normal tracking-tight text-foreground">Collect from {collectContextLabel}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Acquire fractals at the best available price. All amounts are in Indian Rupees (INR), including taxes as shown.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</span>
                <div className="flex items-stretch gap-2 rounded-xl border border-border bg-muted p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 hover:text-accent-foreground"
                    onClick={() => bumpQuantity(-1)}
                    disabled={effectiveQty <= 1 || initiatedOrder != null}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label="Number of fractals to buy"
                    value={quantity === '' ? '' : String(quantity)}
                    onChange={handleQuantityInputChange}
                    onBlur={handleQuantityBlur}
                    disabled={initiatedOrder != null}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-center font-mono text-lg text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 hover:text-accent-foreground"
                    onClick={() => bumpQuantity(1)}
                    disabled={effectiveQty >= maxQty || initiatedOrder != null}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{maxQty.toLocaleString()} available</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order breakdown</span>
                {showDialogQuoteSkeleton ? (
                  <Skeleton className="h-24 w-full rounded-xl bg-muted" />
                ) : quote?.fill_breakdown?.length ? (
                  <div className="space-y-2 rounded-xl bg-muted px-4 py-3 border border-border">
                    {quote.fill_breakdown.map((line, idx) => (
                      <div key={`${line.source}-${idx}-${line.quantity}-${line.price_per_share}`} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-foreground/80">
                          <span className="font-mono tabular-nums text-foreground">{line.quantity}</span>
                          <span className="text-muted-foreground"> × </span>@ {'\u20B9'}
                          {parseFloat(line.price_per_share).toFixed(2)}
                        </span>
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">{fillSourceLabel(line.source)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 border border-border">
                    <span className="text-sm text-zinc-300">
                      {effectiveQty} × @ {'\u20B9'}
                      {currentPrice.toFixed(2)}

                    </span>
                    <span className="text-xs font-medium text-zinc-400">—</span>
                  </div>
                )}
              </div>

              {inventoryShort ? (
                <p className="text-xs text-amber-400/90">Only {quote!.total_available_shares!.toLocaleString()} fractal(s) available for this order. Lower the quantity or try again later.</p>
              ) : null}

              <div className="space-y-3 border-t border-border pt-4 font-sans">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal (pre-tax)</span>
                  <div className="flex items-center gap-2">
                    {showDialogQuoteSkeleton ? (
                      <Skeleton className="h-5 w-20 bg-muted" />
                    ) : (
                      <span className="text-foreground inline-flex items-baseline gap-px">
                        <span>{'\u20B9'}</span>
                        {formatCurrencyWithSmallDecimals(subTotalPreTax)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{hasFillPreview ? 'GST & buyer fee' : 'G.S.T. (18%)'}</span>
                  {showDialogQuoteSkeleton ? (
                    <Skeleton className="h-5 w-16 bg-muted" />
                  ) : (
                    <span className="text-foreground inline-flex items-baseline gap-px">
                      <span>{'\u20B9'}</span>
                      {formatCurrencyWithSmallDecimals(taxesAndFeesAmount)}
                    </span>
                  )}
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-primary">Estimated total</span>
                  <div className="flex items-center gap-2">
                    {showDialogQuoteSkeleton ? (
                      <Skeleton className="h-6 w-24 bg-muted" />
                    ) : (
                      <span className="text-primary inline-flex items-baseline gap-px">
                        <span>{'\u20B9'}</span>
                        {formatCurrencyWithSmallDecimals(totalPayableInr)}
                      </span>
                    )}
                  </div>
                </div>
                {!initiatedOrder && !showDialogQuoteSkeleton && quote?.max_charge ? (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Charged now (estimate + {bufferPercent.toFixed(2)}% price buffer)
                    </span>
                    <span className="font-mono text-foreground">₹{parseFloat(quote.max_charge).toFixed(2)}</span>
                  </div>
                ) : null}
                {!initiatedOrder && !showDialogQuoteSkeleton ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    The buffer covers price moves from other buyers before your order fills. Anything not used is refunded automatically; if the price moves further, the order is cancelled and refunded in full.
                  </p>
                ) : null}
                {needsHighVolAck && !showDialogQuoteSkeleton ? (
                  <label className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-xs text-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={highVolAcknowledged}
                      onChange={(e) => setHighVolAcknowledged(e.target.checked)}
                      disabled={initiatedOrder != null}
                    />
                    <span>
                      <strong>High volatility.</strong> This artwork&apos;s price is moving fast
                      {quote?.raw_buffer_percent != null ? ` (expected swing ${quote.raw_buffer_percent.toFixed(2)}%)` : ''}. Your order is more likely to be cancelled and refunded if the price moves beyond the buffer. I understand and want to continue.
                    </span>
                  </label>
                ) : null}
                {initiatedOrder ? (
                  <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                    <div className="flex justify-between gap-4 text-muted-foreground">
                      <span>Current estimate</span>
                      <span className="font-mono text-foreground">₹{parseFloat(initiatedOrder.estimated_cost).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4 font-medium text-foreground">
                      <span>Maximum Razorpay charge</span>
                      <span className="font-mono">₹{parseFloat(initiatedOrder.max_charge).toFixed(2)}</span>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{initiatedOrder.price_disclaimer}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-8 flex flex-row justify-end gap-2 sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-lg border border-border bg-accent text-accent-foreground hover:bg-accent/80"
                onClick={() => handleDialogOpenChange(false)}
                disabled={collecting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-lg bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
                disabled={collecting || !razorpayLoaded || showDialogQuoteSkeleton || effectiveQty < 1 || quote?.sufficient_for_quantity === false || (needsHighVolAck && !highVolAcknowledged)}
                onClick={handleCollectConfirm}
              >
                {collecting
                  ? initiatedOrder
                    ? 'Opening payment…'
                    : 'Reserving order…'
                  : !razorpayLoaded
                    ? 'Loading…'
                    : initiatedOrder
                      ? `Pay up to ₹${parseFloat(initiatedOrder.max_charge).toFixed(2)}`
                      : 'Review secure charge'}
              </Button>
            </DialogFooter>

            <p className="mt-4 text-center text-[10px] text-muted-foreground">{ENABLE_RAZORPAY ? 'Secure payment via Razorpay' : 'Payment processing (Demo mode)'}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CollectModule;
