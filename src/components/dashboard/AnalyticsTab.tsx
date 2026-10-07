"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { MiniChart } from "./MiniChart";
import {
  getPortfolioAnalytics,
  type PortfolioAnalytics,
  type PortfolioAnalyticsPeriod,
} from "@/apis/my-portfolio/myPortfolioActions";
import { getArtistOnboardingState } from "@/apis/artists/artistActions";
import { useUserStore } from "@/store/useUserStore";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS: PortfolioAnalyticsPeriod[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

function formatInr(n: number, compact?: boolean): string {
  if (!Number.isFinite(n)) return "—";
  if (compact && Math.abs(n) >= 100_000) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function formatChange(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function formatMetricValue(
  key: "avg_daily_views" | "revenue_period" | "new_collectors" | "avg_time_to_sale_days",
  metric: { value: number | null },
): string {
  const v = metric.value;
  if (v == null || !Number.isFinite(v)) return "—";
  switch (key) {
    case "revenue_period":
      return formatInr(v);
    case "avg_daily_views":
      return Math.round(v).toLocaleString("en-IN");
    case "new_collectors":
      return String(Math.round(v));
    case "avg_time_to_sale_days":
      return `${v} days`;
    default:
      return String(v);
  }
}

export const AnalyticsTab = () => {
  const { user, isLoading: profileLoading, isInitialized: profileInitialized } = useUserStore();
  const [period, setPeriod] = useState<PortfolioAnalyticsPeriod>("1M");

  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ["artist-onboarding", user?.id],
    queryFn: getArtistOnboardingState(),
    staleTime: 30_000,
    enabled: Boolean(user),
  });

  const isApprovedArtist =
    onboarding != null
      ? Boolean(onboarding.is_approved)
      : Boolean(user?.artist_profile_approved);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["portfolio-analytics", period],
    queryFn: async () => {
      const res = await getPortfolioAnalytics(period)();
      const payload = res?.data as { data?: PortfolioAnalytics };
      return payload?.data as PortfolioAnalytics;
    },
    enabled: Boolean(user) && isApprovedArtist,
  });

  useEffect(() => {
    if (!isError || !error) return;
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 403) return;
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Failed to load portfolio analytics";
    toast.error(msg, { id: "portfolio-analytics-error" });
  }, [isError, error]);

  const showLoading =
    Boolean(user) &&
    isApprovedArtist &&
    (isLoading || onboardingLoading || (isFetching && !data));

  if (!user && (profileLoading || !profileInitialized)) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">Sign in to see your portfolio analytics.</p>
      </div>
    );
  }

  if (!isApprovedArtist && !onboardingLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Analytics unlock once your artist profile is approved.
        </p>
      </div>
    );
  }

  const chartData = data?.portfolio.series.map((p) => p.value) ?? [];
  const portfolioValue = data?.portfolio.current_value ?? 0;
  const portfolioChange = data?.portfolio.change_percent;

  const metricCards = [
    {
      icon: TrendingUp,
      key: "avg_daily_views" as const,
      label: "Avg. Daily Views",
      metric: data?.metrics.avg_daily_views,
    },
    {
      icon: Wallet,
      key: "revenue_period" as const,
      label: period === "1M" ? "Revenue (30d)" : `Revenue (${period})`,
      metric: data?.metrics.revenue_period,
    },
    {
      icon: Users,
      key: "new_collectors" as const,
      label: "New Collectors",
      metric: data?.metrics.new_collectors,
    },
    {
      icon: Clock,
      key: "avg_time_to_sale_days" as const,
      label: "Avg. Time to Sale",
      metric: data?.metrics.avg_time_to_sale_days,
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Deep insights into your portfolio performance
        </p>
      </motion.div>

      <motion.div
        className="glass-capsule p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-label mb-1">Portfolio Performance</h3>
            {showLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <p className="text-2xl font-light text-foreground">
                {formatInr(portfolioValue, true)}{" "}
                {portfolioChange != null && (
                  <span
                    className={`text-sm ${
                      portfolioChange >= 0 ? "text-accent" : "text-primary"
                    }`}
                  >
                    {formatChange(portfolioChange)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs uppercase tracking-wider ${
                  period === p
                    ? "bg-muted text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 flex items-end w-full overflow-hidden">
          {showLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length > 0 ? (
            <MiniChart data={chartData} width={800} height={200} />
          ) : (
            <p className="text-sm text-muted-foreground">No valuation history yet.</p>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((item, i) => (
          <motion.div
            key={item.label}
            className="glass-capsule p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <item.icon className="w-5 h-5 text-muted-foreground mb-3" />
            <p className="text-label mb-2">{item.label}</p>
            {showLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-foreground">
                  {item.metric
                    ? formatMetricValue(item.key, item.metric)
                    : "—"}
                </span>
                {item.metric?.change_percent != null && (
                  <span
                    className={`text-xs font-mono ${
                      (item.metric.change_percent ?? 0) >= 0
                        ? "text-accent"
                        : "text-primary"
                    }`}
                  >
                    {formatChange(item.metric.change_percent)}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="glass-capsule p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-label mb-4">Top Performing Artworks</h3>
        {showLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.top_artworks.length ? (
          <p className="text-sm text-muted-foreground">No artwork performance data yet.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="min-w-[480px]">
              <div className="space-y-4">
                {data.top_artworks.map((artwork, i) => (
                  <div
                    key={artwork.artwork_id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground w-6">
                        #{i + 1}
                      </span>
                      <span className="text-sm text-foreground w-28 truncate">
                        {artwork.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-8 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Views</p>
                        <p className="text-sm font-mono text-foreground">
                          {artwork.views.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sales</p>
                        <p className="text-sm font-mono text-foreground">{artwork.sales}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-sm font-mono text-accent">
                          {formatInr(artwork.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
