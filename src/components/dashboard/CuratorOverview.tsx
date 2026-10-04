"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCuratorOnboardingState } from "@/apis/curators/curatorActions";
import { useUserStore } from "@/store/useUserStore";
import CuratorOnboardingWizard from "@/components/curator/CuratorOnboardingWizard";
import { OverviewHeader, OverviewMessagePanel } from "./overviewShared";

const PENDING_REVIEW_COPY =
  "Our admin team will review your curator profile within 24 hours. You'll be listed as a curator as soon as your profile is approved.";

export const CuratorOverview = () => {
  const user = useUserStore((s) => s.user);

  const {
    data: onboarding,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["curator-onboarding", user?.id],
    queryFn: getCuratorOnboardingState(),
    staleTime: 30_000,
    enabled: Boolean(user),
    refetchOnMount: "always",
  });

  const isApproved =
    onboarding != null
      ? Boolean(onboarding.is_approved)
      : Boolean(user?.curator_profile_approved);

  const profileId = onboarding?.curator_profile_id ?? user?.curator_profile_id ?? null;
  const step =
    onboarding?.last_completed_step ?? user?.curator_onboarding_last_completed_step ?? 0;

  const completeNotApproved = Boolean(profileId) && !isApproved && step >= 3;
  const showWizard = !isApproved && !completeNotApproved;

  useEffect(() => {
    if (!isError || !error) return;
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Could not load your application status.";
    toast.error(msg, { id: "curator-onboarding-error" });
  }, [isError, error]);

  if (isApproved) {
    return (
      <div className="space-y-8">
        <OverviewHeader subtitle="Your curator profile is live." />
        <OverviewMessagePanel>
          Your curator profile has been approved. You can add artworks to your portfolio and sell
          fractions to collectors, exactly like an artist; proceeds go to your Crestox wallet.
          <div className="mt-4">
            <Link href="/portfolio/artwork/create" className="underline underline-offset-4">
              Add an artwork →
            </Link>
          </div>
        </OverviewMessagePanel>
      </div>
    );
  }

  if (completeNotApproved) {
    return (
      <div className="space-y-8">
        <OverviewHeader />
        <OverviewMessagePanel>{PENDING_REVIEW_COPY}</OverviewMessagePanel>
      </div>
    );
  }

  if (isLoading && !onboarding) {
    return (
      <div className="space-y-8">
        <OverviewHeader subtitle="Loading your application…" />
      </div>
    );
  }

  if (isError && !onboarding) {
    return (
      <div className="space-y-8">
        <OverviewHeader subtitle="We could not load your application status. Refresh the page or try again in a moment." />
      </div>
    );
  }

  if (showWizard && user) {
    return (
      <div className="space-y-8">
        <OverviewHeader subtitle="Complete your curator application below. Your progress is saved after each step, so you can resume anytime." />
        <CuratorOnboardingWizard variant="portfolio" key={user.id} />
      </div>
    );
  }

  return null;
};
