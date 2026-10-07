"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MetricCard } from "./MetricCard";
import { AnimatedCounter } from "./AnimatedCounter";
import WithdrawalModal from "@/components/WithdrawalModal";
import {
  getPortfolioDashboard,
  type PortfolioDashboard,
} from "@/apis/my-portfolio/myPortfolioActions";
import { getArtistOnboardingState } from "@/apis/artists/artistActions";
import { useUserStore } from "@/store/useUserStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ArtistOnboardingWizard from "@/components/artist/ArtistOnboardingWizard";
import { ArrowDownToLine } from "lucide-react";

const PENDING_REVIEW_COPY =
  "Our admin team will review your profile within 24 hours. You will get access to the full artist dashboard as soon as your profile is approved.";

function formatTxDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export const ArtistOverview = () => {
  const { user, isLoading: profileLoading, isInitialized: profileInitialized } = useUserStore();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const {
    data: onboarding,
    isLoading: onboardingLoading,
    isError: onboardingError,
    error: onboardingErr,
  } = useQuery({
    queryKey: ["artist-onboarding", user?.id],
    queryFn: getArtistOnboardingState(),
    staleTime: 30_000,
    enabled: Boolean(user),
  });

  /** Prefer API; while onboarding is still loading, fall back to profile so approved artists are not blocked. */
  const isApprovedArtist =
    onboarding != null
      ? Boolean(onboarding.is_approved)
      : Boolean(user?.artist_profile_approved);

  const artistProfileId = onboarding?.artist_profile_id ?? user?.artist_profile_id ?? null;
  const onboardingStep =
    onboarding?.last_completed_step ?? user?.artist_onboarding_last_completed_step ?? 0;

  const onboardingCompleteNotApproved =
    Boolean(artistProfileId) && !isApprovedArtist && onboardingStep >= 3;

  const showOnboardingWizard =
    Boolean(user) && !isApprovedArtist && !onboardingCompleteNotApproved;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["portfolio-dashboard"],
    queryFn: async () => {
      const res = await getPortfolioDashboard()();
      const payload = res?.data as { data?: PortfolioDashboard };
      return payload?.data as PortfolioDashboard;
    },
    enabled: Boolean(user) && isApprovedArtist,
  });

  useEffect(() => {
    if (!onboardingError || !onboardingErr) return;
    const msg =
      (onboardingErr as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Could not load your application status.";
    toast.error(msg, { id: "portfolio-onboarding-error" });
  }, [onboardingError, onboardingErr]);

  useEffect(() => {
    if (!isError || !error) return;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 403) return;
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Failed to load portfolio dashboard";
    toast.error(msg, { id: "portfolio-dashboard-error" });
  }, [isError, error]);

  const notFound =
    isError && (error as { response?: { status?: number } })?.response?.status === 404;

  const forbidden =
    isError && (error as { response?: { status?: number } })?.response?.status === 403;

  const showDashboardLoading =
    Boolean(user) && isApprovedArtist && (isLoading || (isFetching && !data));

  // Profile still loading (e.g. a hard refresh): show a skeleton instead of the
  // signed-out "Sign in" message, which would otherwise flash for logged-in users.
  if (!user && (profileLoading || !profileInitialized)) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-40 mb-3" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground text-sm">Sign in to see your portfolio analytics.</p>
        </motion.div>
      </div>
    );
  }

  /* ─── Approved artist: full portfolio stats (same as before) ─── */
  if (isApprovedArtist) {
    if (showDashboardLoading && !data) {
      return (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
            <p className="text-muted-foreground text-sm">Loading dashboard…</p>
          </motion.div>
        </div>
      );
    }

    if (notFound || forbidden) {
      return (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
            <p className="text-muted-foreground text-sm">
              Your artist dashboard could not be loaded. Please try again later.
            </p>
          </motion.div>
        </div>
      );
    }

    if (isError && !notFound && !forbidden && !data) {
      return (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
            <p className="text-muted-foreground text-sm">
              Something went wrong loading your dashboard. Please try again.
            </p>
          </motion.div>
        </div>
      );
    }

    if (!data) {
      return null;
    }

    const d = data;

    return (
      <div className="space-y-8">
        <WithdrawalModal
          isOpen={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          source="artist"
        />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground text-sm">
            Real-time portfolio analytics and market performance
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Portfolio Valuation" value={d.portfolio_valuation} prefix="₹" delay={0} />

          {/* Total Earnings card with integrated Withdraw button */}
          <motion.div
            className="glass-capsule p-6 relative overflow-hidden flex flex-col justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <span className="text-label block mb-3">Total Earnings</span>
              <div className="text-metric mb-4">
                <AnimatedCounter value={d.total_earnings} prefix="₹" />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWithdrawOpen(true)}
              className="w-full h-8 text-xs gap-1.5 border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-colors"
            >
              <ArrowDownToLine size={12} />
              Withdraw
            </Button>
          </motion.div>

          <MetricCard label="Fractal Price" value={d.fractal_price} prefix="₹" decimals={2} delay={0.2} />
          <MetricCard label="Fractals Sold" value={d.fractals_sold} delay={0.3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            className="glass-capsule p-6 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-label mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {d.recent_transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed sales yet.</p>
              ) : (
                d.recent_transactions.map((tx, i) => (
                  <motion.div
                    key={tx.transaction_id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <div>
                      <p className="text-sm text-foreground">{tx.artwork?.name ?? "Artwork"}</p>
                      <p className="text-xs text-muted-foreground">{formatTxDate(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-accent">
                        {`+₹${tx.artist_net_after_platform_fee.toFixed(2)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.share_quantity} fractals</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            className="glass-capsule p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-label mb-4">Portfolio Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Live Artworks</span>
                <span className="text-sm font-mono text-foreground">{d.live_artwork_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Review</span>
                <span className="text-sm font-mono text-primary">{d.pending_approval_artwork_count}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Collectors</span>
                <span className="text-sm font-mono text-foreground">{d.total_collectors}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Hold Time</span>
                <span className="text-sm font-mono text-foreground">Left to implement</span>
              </div>
              <div className="h-px bg-border my-2" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ─── Application submitted, awaiting admin (onboarding step 3 done) ─── */
  if (onboardingCompleteNotApproved) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
        </motion.div>
        <motion.div
          className="glass-capsule p-8 max-w-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-foreground text-base leading-relaxed">{PENDING_REVIEW_COPY}</p>
        </motion.div>
      </div>
    );
  }

  /* ─── Onboarding not finished (or no profile yet): resume wizard ─── */
  if (onboardingLoading && !onboarding) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground text-sm">Loading your application…</p>
        </motion.div>
      </div>
    );
  }

  if (onboardingError && !onboarding) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground text-sm mb-4">
            We could not load your application status. Refresh the page or try again in a moment.
          </p>
        </motion.div>
      </div>
    );
  }

  if (showOnboardingWizard) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Complete your artist application below. You can resume from the first step that still needs
            information—your progress is saved after each step.
          </p>
        </motion.div>
        <ArtistOnboardingWizard variant="portfolio" key={user.id} />
      </div>
    );
  }

  return null;
};
