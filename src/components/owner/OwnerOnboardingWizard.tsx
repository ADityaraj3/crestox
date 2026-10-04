"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Upload, Twitter, Instagram, Linkedin, User, Trash2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import GradientButton from "@/components/ui/gradiant-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/apis/user/userActions";
import {
  getOwnerOnboardingState,
  submitOwnerOnboardingStep1,
  submitOwnerOnboardingStep2,
  submitOwnerOnboardingStep3,
  type OwnerOnboardingState,
} from "@/apis/owners/ownerActions";
import { uploadMedia } from "@/apis/media/mediaActions";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/lib/utils";
import { optionalAmount, optionalSocial, optionalUrl, optionalYears, requiredText, toSocialUrl } from "@/utils/formValidation";

const profileFormSchema = z.object({
  ownerName: requiredText("Owner name is required."),
  bio: requiredText("Bio is required."),
  avatar_media_id: z.string().optional(),
  collectorMessage: z.string().optional(),
  twitter: optionalSocial,
  instagram: optionalSocial,
  linkedin: optionalSocial,
  location: z.string().optional(),
  portfolioUrl: optionalUrl,
  collectionFocus: z.string().optional(),
  yearsCollecting: optionalYears,
  collectionSize: z.string().optional(),
  ownedWorks: z
    .array(
      z
        .object({
          name: requiredText("Artwork name is required."),
          image: z.any().optional(),
          proofOfSale: z.any().optional(),
          acquisitionValue: optionalAmount,
          existing_image_media_id: z.number().optional(),
          existing_proof_media_id: z.number().optional(),
        })
        // Provenance is what admins approve an owner on; the server requires it too.
        .refine((w) => Boolean(w.proofOfSale) || w.existing_proof_media_id != null, {
          message: "Upload a proof of ownership for this work.",
          path: ["proofOfSale"],
        }),
    )
    .optional(),
  highlights: z
    .array(
      z.object({
        name: requiredText("Highlight title is required."),
        file: z.any().optional(),
        existing_media_id: z.number().optional(),
      }),
    )
    .optional(),
});

type FormValues = z.infer<typeof profileFormSchema>;

const step1FieldsSchema = profileFormSchema.pick({
  ownerName: true,
  bio: true,
  collectorMessage: true,
  avatar_media_id: true,
});

const step2FieldsSchema = profileFormSchema.pick({
  ownedWorks: true,
  highlights: true,
});

const step3FieldsSchema = profileFormSchema.pick({
  twitter: true,
  instagram: true,
  linkedin: true,
  location: true,
  portfolioUrl: true,
  collectionFocus: true,
  yearsCollecting: true,
  collectionSize: true,
});

function applyZodIssues(form: { setError: (n: any, e: { message: string }) => void }, issues: z.ZodIssue[]) {
  for (const issue of issues) {
    const path = issue.path.join(".") as keyof FormValues;
    form.setError(path, { message: issue.message });
  }
}

const STEP_LABELS = ["Basics", "Collection", "Presence"];

function mapServerToForm(s: OwnerOnboardingState): Partial<FormValues> {
  const ig = s.step3.social_links.find((l) => l.platform.toLowerCase() === "instagram")?.url ?? "";
  const tw = s.step3.social_links.find((l) => l.platform.toLowerCase() === "twitter")?.url ?? "";
  const li = s.step3.social_links.find((l) => l.platform.toLowerCase() === "linkedin")?.url ?? "";
  return {
    ownerName: s.step1.owner_name,
    bio: s.step1.bio,
    collectorMessage: s.step1.collector_message ?? "",
    avatar_media_id: s.step1.avatar_media_id != null ? String(s.step1.avatar_media_id) : "",
    ownedWorks: (s.step2.collection_items ?? []).map((c) => ({
      name: c.artwork_name,
      image: undefined,
      proofOfSale: undefined,
      acquisitionValue: c.acquisition_value != null ? String(c.acquisition_value) : "",
      existing_image_media_id: c.artwork_image_media_id ?? undefined,
      existing_proof_media_id: c.proof_of_sale_media_id ?? undefined,
    })),
    highlights: (s.step2.highlights ?? []).map((h) => ({
      name: h.title,
      file: undefined,
      existing_media_id: h.media_id ?? undefined,
    })),
    twitter: tw,
    instagram: ig,
    linkedin: li,
    location: s.step3.location ?? "",
    portfolioUrl: s.step3.website_portfolio_link ?? "",
    collectionFocus: s.step3.collection_focus ?? "",
    yearsCollecting: s.step3.years_collecting != null ? String(s.step3.years_collecting) : "",
    collectionSize: s.step3.collection_size ?? "",
  };
}

function onboardingSnapshot(o: OwnerOnboardingState): string {
  return JSON.stringify({
    id: o.owner_profile_id,
    lc: o.last_completed_step,
    s1: o.step1,
    s2c: o.step2.collection_items,
    s2h: o.step2.highlights,
    s3: o.step3,
  });
}

export type OwnerOnboardingWizardVariant = "signup" | "portfolio";

type Props = {
  variant?: OwnerOnboardingWizardVariant;
  className?: string;
};

export default function OwnerOnboardingWizard({ variant = "portfolio", className }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fetchProfile = useUserStore((st) => st.fetchProfile);
  const user = useUserStore((st) => st.user);
  const [activeStep, setActiveStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const lastSyncedSnapshot = useRef("");
  const namePrefilledFromAccount = useRef(false);

  const {
    data: onboarding,
    isLoading: onboardingLoading,
    isError: onboardingError,
    error: onboardingErr,
  } = useQuery({
    queryKey: ["owner-onboarding", user?.id],
    queryFn: getOwnerOnboardingState(),
    staleTime: 30_000,
    enabled: !!user,
    refetchOnMount: "always",
  });

  useEffect(() => {
    lastSyncedSnapshot.current = "";
    namePrefilledFromAccount.current = false;
  }, [user?.id]);

  const lastCompleted = onboarding?.last_completed_step ?? 0;

  const form = useForm<FormValues>({
    defaultValues: {
      ownerName: "",
      bio: "",
      avatar_media_id: "",
      collectorMessage: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      location: "",
      portfolioUrl: "",
      collectionFocus: "",
      yearsCollecting: "",
      collectionSize: "",
      ownedWorks: [],
      highlights: [],
    },
  });

  const { fields: ownedFields, append: appendOwned, remove: removeOwned } = useFieldArray({
    control: form.control,
    name: "ownedWorks",
  });
  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    name: "highlights",
  });

  useEffect(() => {
    if (!onboarding) return;
    if (onboarding.owner_profile_id) return;
    if (namePrefilledFromAccount.current) return;
    const run = async () => {
      try {
        const fetchProfileAction = getProfile();
        const profileRes = await fetchProfileAction();
        const userData = profileRes.data?.data ?? profileRes.data;
        if (userData?.name && !form.getValues("ownerName")?.trim()) {
          form.setValue("ownerName", userData.name);
        }
        namePrefilledFromAccount.current = true;
      } catch (err) {
        console.error(err);
        setProfileError("Could not verify your profile details. Please try refreshing.");
      }
    };
    void run();
  }, [form, onboarding]);

  useEffect(() => {
    if (!onboarding) return;
    const snap = onboardingSnapshot(onboarding);
    if (lastSyncedSnapshot.current === snap) return;
    lastSyncedSnapshot.current = snap;

    const defaults = form.getValues();
    const mapped = mapServerToForm(onboarding);
    const keepPrefillName =
      !onboarding.owner_profile_id &&
      !(onboarding.step1.owner_name && onboarding.step1.owner_name.trim()) &&
      Boolean(defaults.ownerName?.trim());

    form.reset({
      ...defaults,
      ...mapped,
      ...(keepPrefillName ? { ownerName: defaults.ownerName } : {}),
    }, { keepDirtyValues: true });

    setActiveStep(Math.min(3, Math.max(1, onboarding.last_completed_step + 1)));

    const url = onboarding.step1.avatar_url;
    setAvatarPreview(typeof url === "string" && url.length > 0 ? url : null);
    setAvatarFile(null);
  }, [onboarding, form]);

  useEffect(() => {
    if (!onboarding?.owner_profile_id) return;
    const items = onboarding.step2.collection_items;
    const highlights = onboarding.step2.highlights;
    if (ownedFields.length !== items.length) return;
    if (highlightFields.length !== highlights.length) return;

    const nextP: Record<string, string> = {};
    const nextN: Record<string, string> = {};

    ownedFields.forEach((f, i) => {
      const row = items[i];
      if (!row) return;
      const imgKey = `ownedWorks-${f.id}-image`;
      const proofKey = `ownedWorks-${f.id}-proofOfSale`;
      if (row.artwork_image_url && !form.getValues(`ownedWorks.${i}.image`)) {
        nextP[imgKey] = row.artwork_image_url;
        nextN[imgKey] = "Artwork image";
      }
      if (row.proof_of_sale_url && !form.getValues(`ownedWorks.${i}.proofOfSale`)) {
        const proofName = row.proof_of_sale_original_name ?? "";
        const isPdf =
          proofName.toLowerCase().endsWith(".pdf") || row.proof_of_sale_url.toLowerCase().includes(".pdf");
        nextP[proofKey] = isPdf ? "document" : row.proof_of_sale_url;
        nextN[proofKey] = proofName || "Provenance";
      }
    });
    highlightFields.forEach((f, i) => {
      const row = highlights[i];
      if (!row?.media_url) return;
      if (form.getValues(`highlights.${i}.file`)) return;
      nextP[`highlights-${f.id}`] = row.media_url;
      if (row.media_original_name) nextN[`highlights-${f.id}`] = row.media_original_name;
    });

    setFilePreviews((prev) => ({ ...prev, ...nextP }));
    setFileNames((prev) => ({ ...prev, ...nextN }));
  }, [onboarding, ownedFields, highlightFields, form]);

  const maxReachable = useMemo(() => Math.min(3, lastCompleted + 1), [lastCompleted]);

  const canGoToStep = (n: number) => {
    if (n === activeStep) return true;
    if (n < activeStep) return true;
    return n <= maxReachable;
  };

  const extractMediaIdFromResponse = (response: any): string | null => {
    if (!response?.data) return null;
    const d = response.data;
    const dataArray = Array.isArray(d?.data) ? d.data : null;
    if (dataArray?.[0]?.media_id != null) return String(dataArray[0].media_id);
    const candidates = [d?.data?.id, d?.data?.media_id, d?.data?.mediaId, d?.id, d?.media_id, d?.mediaId, d?.data];
    for (const c of candidates) {
      if (c != null && c !== "") return String(c);
    }
    return null;
  };

  const handleAvatarUpload = async (file: File) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", { description: "Please upload a JPEG, PNG, JPG, GIF, WEBP, BMP, or SVG file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Please upload an image smaller than 5MB." });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const response = await uploadMedia(file)();
      const mediaId = extractMediaIdFromResponse(response);
      if (mediaId) {
        form.setValue("avatar_media_id", mediaId);
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
        toast.success("Avatar uploaded successfully");
      } else {
        toast.error("Upload succeeded but could not get media ID");
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || "Please try again.";
      toast.error("Failed to upload avatar", { description: errMsg });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleAvatarUpload(file);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldId: string,
    onChange: (file: File | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      setFileNames((prev) => ({ ...prev, [fieldId]: file.name }));
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreviews((prev) => ({ ...prev, [fieldId]: reader.result as string }));
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prev) => ({ ...prev, [fieldId]: "document" }));
      }
    }
    e.target.value = "";
  };

  const clearFile = (fieldId: string, onChange: (value: null) => void) => {
    onChange(null);
    setFilePreviews((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setFileNames((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const uploadFileAndGetMediaId = async (file: File | FileList | null | undefined): Promise<string | null> => {
    if (!file) return null;
    const fileToUpload = file instanceof FileList ? file[0] : file instanceof File ? file : null;
    if (!fileToUpload) return null;
    const response = await uploadMedia(fileToUpload)();
    return extractMediaIdFromResponse(response);
  };

  const invalidateOnboarding = () => {
    void queryClient.invalidateQueries({ queryKey: ["owner-onboarding"] });
  };

  const onSubmitStep1 = async (values: FormValues) => {
    if (avatarFile && !values.avatar_media_id) {
      toast.error("Please wait for avatar upload to complete");
      return;
    }
    setSubmitting(true);
    try {
      await submitOwnerOnboardingStep1({
        owner_name: values.ownerName,
        bio: values.bio,
        collector_message: values.collectorMessage || undefined,
        avatar_media_id: values.avatar_media_id ? parseInt(values.avatar_media_id, 10) : undefined,
      })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Step 1 saved");
      setActiveStep(2);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitStep2 = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const collection_items = await Promise.all(
        (values.ownedWorks || []).map(async (work) => {
          let artwork_image_media_id = work.existing_image_media_id;
          let proof_of_sale_media_id = work.existing_proof_media_id;
          if (work.image) {
            const id = await uploadFileAndGetMediaId(work.image);
            if (id) artwork_image_media_id = parseInt(id, 10);
          }
          if (work.proofOfSale) {
            const id = await uploadFileAndGetMediaId(work.proofOfSale);
            if (id) proof_of_sale_media_id = parseInt(id, 10);
          }
          return {
            artwork_name: work.name,
            artwork_image_media_id,
            proof_of_sale_media_id,
            acquisition_value: work.acquisitionValue ? parseFloat(work.acquisitionValue) : undefined,
          };
        }),
      );
      const highlights = await Promise.all(
        (values.highlights || []).map(async (h) => {
          let media_id = h.existing_media_id;
          if (h.file) {
            const id = await uploadFileAndGetMediaId(h.file);
            if (id) media_id = parseInt(id, 10);
          }
          return { title: h.name, description: "", media_id };
        }),
      );

      await submitOwnerOnboardingStep2({ collection_items, highlights })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Step 2 saved");
      setActiveStep(3);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitStep3 = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const social_links = [
        ...(values.twitter?.trim() ? [{ platform: "twitter", url: toSocialUrl("twitter", values.twitter) }] : []),
        ...(values.instagram?.trim() ? [{ platform: "instagram", url: toSocialUrl("instagram", values.instagram) }] : []),
        ...(values.linkedin?.trim() ? [{ platform: "linkedin", url: toSocialUrl("linkedin", values.linkedin) }] : []),
      ];

      await submitOwnerOnboardingStep3({
        social_links,
        location: values.location || undefined,
        website_portfolio_link: values.portfolioUrl?.trim() || undefined,
        collection_focus: values.collectionFocus || undefined,
        years_collecting: values.yearsCollecting ? parseInt(values.yearsCollecting, 10) : undefined,
        collection_size: values.collectionSize || undefined,
      })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Application submitted", { description: "Our team will review your profile shortly." });
      if (variant === "signup") {
        router.push("/collection");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const stepStrip = (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
        {[1, 2, 3].map((n) => {
          const done = lastCompleted >= n;
          const current = activeStep === n;
          const disabled = !canGoToStep(n);
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setActiveStep(n)}
              className={cn("flex-1 flex flex-col items-center gap-2 text-left min-w-0", disabled && "opacity-40 cursor-not-allowed")}
            >
              <div
                className={cn(
                  "w-full h-1.5 rounded-full transition-colors",
                  done || current ? "bg-primary" : "bg-muted",
                  current && "ring-2 ring-primary/40",
                )}
              />
              <span className={cn("text-xs font-mono uppercase tracking-wide", current ? "text-primary" : "text-muted-foreground")}>
                {STEP_LABELS[n - 1]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Complete each step in order. You can go back to edit earlier steps anytime.
      </p>
    </div>
  );

  if (onboardingLoading && !onboarding) {
    return (
      <Card className={cn("w-full max-w-3xl border-border/50 bg-card/50 backdrop-blur-sm mx-auto", className)}>
        <CardHeader className="space-y-1 pb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (onboardingError) {
    const msg =
      (onboardingErr as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Could not load onboarding.";
    return (
      <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm", className)}>{msg}</div>
    );
  }

  const outerCard = variant === "signup";

  const inner = (
    <>
      {profileError && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
          {profileError}
        </div>
      )}
      {stepStrip}
      <Form {...form}>
        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            form.clearErrors();
            const vals = form.getValues();
            if (activeStep === 1) {
              const r = step1FieldsSchema.safeParse(vals);
              if (!r.success) return applyZodIssues(form, r.error.issues);
              void onSubmitStep1(vals);
            }
            if (activeStep === 2) {
              const r = step2FieldsSchema.safeParse(vals);
              if (!r.success) return applyZodIssues(form, r.error.issues);
              void onSubmitStep2(vals);
            }
            if (activeStep === 3) {
              const r = step3FieldsSchema.safeParse(vals);
              if (!r.success) return applyZodIssues(form, r.error.issues);
              void onSubmitStep3(vals);
            }
          }}
        >
          {activeStep === 1 && (
            <>
              <div className="space-y-3">
                <FormLabel>Avatar</FormLabel>
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 rounded-sm border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      type="button"
                      size="sm"
                      className="font-sans"
                      disabled={isUploadingAvatar}
                      onClick={() => document.getElementById("onb-owner-avatar")?.click()}
                    >
                      {isUploadingAvatar ? "Uploading..." : "Upload Image"}
                    </Button>
                    <input
                      id="onb-owner-avatar"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">Optional public avatar (JPEG, PNG, etc., max 5MB).</p>
                {form.watch("avatar_media_id") && <p className="text-[12px] text-primary">Avatar ready ✓</p>}
              </div>

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your public name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about your collection…" className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectorMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message to Collectors (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A note for the community…" className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormDescription>Shown to collectors on your profile.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {activeStep === 2 && (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-medium text-foreground/90">Notable owned works</p>
                    <p className="text-[13px] text-muted-foreground">Add works from your collection with proof of provenance.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-sans shrink-0"
                    onClick={() => appendOwned({ name: "", acquisitionValue: "" })}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Owned Work
                  </Button>
                </div>
                {ownedFields.map((f, index) => (
                  <div key={f.id} className="p-5 border border-border/40 rounded-lg space-y-6 relative group">
                    <div className="absolute right-4 top-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          clearFile(`ownedWorks-${f.id}-image`, () => {});
                          clearFile(`ownedWorks-${f.id}-proofOfSale`, () => {});
                          removeOwned(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`ownedWorks.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="pr-12">
                          <FormLabel className="text-xs text-muted-foreground">Artwork name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Celestial Bloom" className="bg-background/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`ownedWorks.${index}.image`}
                        render={({ field }) => {
                          const fieldId = `ownedWorks-${f.id}-image`;
                          const preview = filePreviews[fieldId];
                          const filename = fileNames[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Artwork image</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <div className="relative w-16 h-16 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                    {preview && preview !== "document" ? (
                                      <img src={preview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Upload className="w-6 h-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div
                                      className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                      onClick={() => document.getElementById(`onb-own-img-${f.id}`)?.click()}
                                    >
                                      <Upload className="w-4 h-4 shrink-0" />
                                      <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                    </div>
                                    <input
                                      id={`onb-own-img-${f.id}`}
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => handleFileSelect(e, fieldId, (file) => field.onChange(file))}
                                    />
                                    {filename && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive"
                                        onClick={() => clearFile(fieldId, () => field.onChange(null))}
                                      >
                                        Remove file
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name={`ownedWorks.${index}.proofOfSale`}
                        render={({ field }) => {
                          const fieldId = `ownedWorks-${f.id}-proofOfSale`;
                          const preview = filePreviews[fieldId];
                          const filename = fileNames[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Proof / provenance</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <div className="relative w-16 h-16 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                    {preview === "document" ? (
                                      <FileText className="w-6 h-6 text-muted-foreground" />
                                    ) : preview ? (
                                      <img src={preview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Upload className="w-6 h-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div
                                      className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                      onClick={() => document.getElementById(`onb-own-proof-${f.id}`)?.click()}
                                    >
                                      <Upload className="w-4 h-4 shrink-0" />
                                      <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                    </div>
                                    <input
                                      id={`onb-own-proof-${f.id}`}
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,application/pdf"
                                      className="hidden"
                                      onChange={(e) => handleFileSelect(e, fieldId, (file) => field.onChange(file))}
                                    />
                                    {filename && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive"
                                        onClick={() => clearFile(fieldId, () => field.onChange(null))}
                                      >
                                        Remove file
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name={`ownedWorks.${index}.acquisitionValue`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Acquisition value (₹)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-sans">₹</span>
                              <Input type="number" placeholder="0" className="pl-7 bg-background/50" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-medium text-foreground/90">Collection highlights</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-sans shrink-0"
                    onClick={() => appendHighlight({ name: "" })}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Highlight
                  </Button>
                </div>
                {highlightFields.map((f, index) => (
                  <div key={f.id} className="p-4 border border-border/40 rounded-lg space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`highlights.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="e.g., Loaned works to the National Gallery" className="bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`highlights.${index}.file`}
                          render={({ field }) => {
                            const fieldId = `highlights-${f.id}`;
                            const preview = filePreviews[fieldId];
                            const filename = fileNames[fieldId];
                            return (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Image (optional)</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-sm border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                      {preview && preview !== "document" ? (
                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                      <div
                                        className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                        onClick={() => document.getElementById(`onb-own-hl-${f.id}`)?.click()}
                                      >
                                        <Upload className="w-4 h-4 shrink-0" />
                                        <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                      </div>
                                      <input
                                        id={`onb-own-hl-${f.id}`}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e, fieldId, (file) => field.onChange(file))}
                                      />
                                      {filename && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-destructive"
                                          onClick={() => clearFile(fieldId, () => field.onChange(null))}
                                        >
                                          Remove file
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => {
                          clearFile(`highlights-${f.id}`, () => {});
                          removeHighlight(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeStep === 3 && (
            <>
              <div className="space-y-4">
                <FormLabel>Social links</FormLabel>
                <FormField
                  control={form.control}
                  name="twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center">
                          <div className="w-10 flex items-center justify-center border border-r-0 border-input bg-muted/20 h-10 rounded-l-md">
                            <Twitter className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <Input className="rounded-l-none" placeholder="https://twitter.com/…" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center">
                          <div className="w-10 flex items-center justify-center border border-r-0 border-input bg-muted/20 h-10 rounded-l-md">
                            <Instagram className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <Input className="rounded-l-none" placeholder="https://instagram.com/…" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center">
                          <div className="w-10 flex items-center justify-center border border-r-0 border-input bg-muted/20 h-10 rounded-l-md">
                            <Linkedin className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <Input className="rounded-l-none" placeholder="https://linkedin.com/in/…" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Berlin, Germany" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website / portfolio</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="collectionFocus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collecting focus</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Post-war abstraction, sculpture" {...field} />
                    </FormControl>
                    <FormDescription>What your collection centers on.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearsCollecting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years collecting</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="collectionSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection size (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 40+ works" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <Button type="button" variant="outline" disabled={activeStep <= 1} onClick={() => setActiveStep((s) => Math.max(1, s - 1))}>
              Back
            </Button>
            <GradientButton
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              label={submitting ? "Saving…" : activeStep === 3 ? "Submit application" : "Save & continue"}
              disabled={submitting}
            />
          </div>
        </form>
      </Form>
    </>
  );

  if (outerCard) {
    return (
      <Card className={cn("w-full max-w-3xl border-border/50 bg-card/50 backdrop-blur-sm mx-auto mb-20 mt-40", className)}>
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-serif">Create your owner profile</CardTitle>
          <CardDescription className="font-sans">Three short steps. You can pause anytime and resume later.</CardDescription>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("glass-capsule p-6 md:p-8", className)}>
      <div className="mb-6">
        <h2 className="text-xl font-light tracking-tight text-foreground">Owner onboarding</h2>
        <p className="text-sm text-muted-foreground mt-1">Complete your application to be listed as an owner.</p>
      </div>
      {inner}
    </div>
  );
}
