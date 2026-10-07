"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getOwnerOnboardingState } from "@/apis/owners/ownerActions";
import { useUserStore } from "@/store/useUserStore";
import OwnerOnboardingWizard from "@/components/owner/OwnerOnboardingWizard";
import { OverviewHeader, OverviewMessagePanel } from "./overviewShared";

const PENDING_REVIEW_COPY =
  "Our admin team will review your owner profile within 24 hours. You'll be listed as an owner as soon as your profile is approved.";

export const OwnerOverview = () => {
  const user = useUserStore((s) => s.user);

  const {
    data: onboarding,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["owner-onboarding", user?.id],
    queryFn: getOwnerOnboardingState(),
    staleTime: 30_000,
    enabled: Boolean(user),
  });

  const isApproved =
    onboarding != null
      ? Boolean(onboarding.is_approved)
      : Boolean(user?.owner_profile_approved);

  const profileId = onboarding?.owner_profile_id ?? user?.owner_profile_id ?? null;
  const step =
    onboarding?.last_completed_step ?? user?.owner_onboarding_last_completed_step ?? 0;

  const completeNotApproved = Boolean(profileId) && !isApproved && step >= 3;
  const showWizard = !isApproved && !completeNotApproved;

  useEffect(() => {
    if (!isError || !error) return;
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Could not load your application status.";
    toast.error(msg, { id: "owner-onboarding-error" });
  }, [isError, error]);

  if (isApproved) {
    return (
      <div className="space-y-8">
        <OverviewHeader subtitle="Your owner profile is live." />
        <OverviewMessagePanel>
          Your owner profile has been approved. You can add artworks to your portfolio and sell
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
        <OverviewHeader subtitle="Complete your owner application below. Your progress is saved after each step, so you can resume anytime." />
        <OwnerOnboardingWizard variant="portfolio" key={user.id} />
      </div>
    );
  }

  return null;
};
