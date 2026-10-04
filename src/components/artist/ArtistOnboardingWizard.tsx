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
import { syncArtistProfileIdFromProfile } from "@/utils/artistProfileStorage";
import {
  getArtistOnboardingState,
  submitArtistOnboardingStep1,
  submitArtistOnboardingStep2,
  submitArtistOnboardingStep3,
  type ArtistOnboardingState,
} from "@/apis/artists/artistActions";
import { uploadMedia } from "@/apis/media/mediaActions";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/lib/utils";
import { optionalAmount, optionalSocial, optionalUrl, optionalYears, requiredText, toSocialUrl } from "@/utils/formValidation";

const profileFormSchema = z.object({
  artistName: requiredText("Artist name is required."),
  bio: requiredText("Bio is required."),
  avatar_media_id: z.string().optional(),
  collectorMessage: z.string().optional(),
  twitter: optionalSocial,
  instagram: optionalSocial,
  linkedin: optionalSocial,
  location: z.string().optional(),
  university: z.string().optional(),
  portfolioUrl: optionalUrl,
  artisticStyle: z.string().optional(),
  awards: z
    .array(
      z.object({
        name: requiredText("Award name is required."),
        file: z.any().optional(),
        existing_media_id: z.number().optional(),
      }).refine((data) => !!data.file || !!data.existing_media_id, {
        message: "Certificate / image is required.",
        path: ["file"],
      })
    )
    .optional(),
  exhibitions: z
    .array(
      z.object({
        name: requiredText("Exhibition name is required."),
        file: z.any().optional(),
        existing_media_id: z.number().optional(),
      }),
    )
    .optional(),
  soldArtworks: z
    .array(
      z.object({
        name: requiredText("Artwork name is required."),
        image: z.any().optional(),
        proofOfSale: z.any().optional(),
        saleValue: optionalAmount,
        existing_image_media_id: z.number().optional(),
        existing_proof_media_id: z.number().optional(),
      }),
    )
    .optional(),
});

type FormValues = z.infer<typeof profileFormSchema>;

const step1FieldsSchema = profileFormSchema.pick({
  artistName: true,
  bio: true,
  collectorMessage: true,
  avatar_media_id: true,
});

const step2FieldsSchema = profileFormSchema.pick({
  awards: true,
  exhibitions: true,
  soldArtworks: true,
});

const step3FieldsSchema = profileFormSchema.pick({
  twitter: true,
  instagram: true,
  linkedin: true,
  location: true,
  university: true,
  portfolioUrl: true,
  artisticStyle: true,
});

function applyZodIssues(form: { setError: (n: any, e: { message: string }) => void }, issues: z.ZodIssue[]) {
  for (const issue of issues) {
    const path = issue.path.join(".") as keyof FormValues;
    form.setError(path, { message: issue.message });
  }
}

const STEP_LABELS = ["Basics", "Portfolio", "Presence"];

function mapServerToForm(s: ArtistOnboardingState): Partial<FormValues> {
  const ig = s.step3.social_links.find((l) => l.platform.toLowerCase() === "instagram")?.url ?? "";
  const tw = s.step3.social_links.find((l) => l.platform.toLowerCase() === "twitter")?.url ?? "";
  const li = s.step3.social_links.find((l) => l.platform.toLowerCase() === "linkedin")?.url ?? "";
  return {
    artistName: s.step1.artist_name,
    bio: s.step1.artist_bio,
    collectorMessage: s.step1.collector_message ?? "",
    avatar_media_id: s.step1.avatar_media_id != null ? String(s.step1.avatar_media_id) : "",
    awards: (s.step2.achievements ?? []).map((a) => ({
      name: a.title,
      file: undefined,
      existing_media_id: a.media_id ?? undefined,
    })),
    exhibitions: (s.step2.history ?? []).map((h) => ({
      name: h.title,
      file: undefined,
      existing_media_id: h.media_id ?? undefined,
    })),
    soldArtworks: (s.step2.previously_sold_artworks ?? []).map((p) => ({
      name: p.artwork_name,
      image: undefined,
      proofOfSale: undefined,
      saleValue: p.sell_value != null ? String(p.sell_value) : "",
      existing_image_media_id: p.artwork_image_media_id ?? undefined,
      existing_proof_media_id: p.proof_of_sale_media_id ?? undefined,
    })),
    twitter: tw,
    instagram: ig,
    linkedin: li,
    location: s.step3.location ?? "",
    university: s.step3.university ?? "",
    portfolioUrl: s.step3.website_portfolio_link ?? "",
    artisticStyle: s.step3.artist_style ?? "",
  };
}

function onboardingSnapshot(o: ArtistOnboardingState): string {
  return JSON.stringify({
    id: o.artist_profile_id,
    lc: o.last_completed_step,
    s1: o.step1,
    s2a: o.step2.achievements,
    s2h: o.step2.history,
    s2p: o.step2.previously_sold_artworks,
    s3: o.step3,
  });
}

export type ArtistOnboardingWizardVariant = "signup" | "portfolio";

type Props = {
  variant?: ArtistOnboardingWizardVariant;
  className?: string;
};

export default function ArtistOnboardingWizard({ variant = "portfolio", className }: Props) {
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
    queryKey: ["artist-onboarding", user?.id],
    queryFn: getArtistOnboardingState(),
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
      artistName: "",
      bio: "",
      avatar_media_id: "",
      collectorMessage: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      location: "",
      university: "",
      portfolioUrl: "",
      artisticStyle: "",
      awards: [],
      exhibitions: [],
      soldArtworks: [],
    },
  });

  const { fields: awardFields, append: appendAward, remove: removeAward } = useFieldArray({
    control: form.control,
    name: "awards",
  });
  const { fields: exhibitionFields, append: appendExhibition, remove: removeExhibition } = useFieldArray({
    control: form.control,
    name: "exhibitions",
  });
  const { fields: soldArtworkFields, append: appendSoldArtwork, remove: removeSoldArtwork } = useFieldArray({
    control: form.control,
    name: "soldArtworks",
  });

  useEffect(() => {
    if (!onboarding) return;
    if (onboarding.artist_profile_id) return;
    if (namePrefilledFromAccount.current) return;
    const run = async () => {
      try {
        const fetchProfileAction = getProfile();
        const profileRes = await fetchProfileAction();
        const userData = profileRes.data?.data ?? profileRes.data;
        syncArtistProfileIdFromProfile(userData?.artist_profile_id);
        if (userData?.name && !form.getValues("artistName")?.trim()) {
          form.setValue("artistName", userData.name);
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
      !onboarding.artist_profile_id &&
      !(onboarding.step1.artist_name && onboarding.step1.artist_name.trim()) &&
      Boolean(defaults.artistName?.trim());

    form.reset({
      ...defaults,
      ...mapped,
      ...(keepPrefillName ? { artistName: defaults.artistName } : {}),
    }, { keepDirtyValues: true });

    setActiveStep(Math.min(3, Math.max(1, onboarding.last_completed_step + 1)));

    const url = onboarding.step1.avatar_url;
    if (typeof url === "string" && url.length > 0) {
      setAvatarPreview(url);
    } else {
      setAvatarPreview(null);
    }
    setAvatarFile(null);
  }, [onboarding, form]);

  useEffect(() => {
    if (!onboarding?.artist_profile_id) return;

    const ach = onboarding.step2.achievements;
    const hist = onboarding.step2.history;
    const soldRows = onboarding.step2.previously_sold_artworks;

    if (awardFields.length !== ach.length) return;
    if (exhibitionFields.length !== hist.length) return;
    if (soldArtworkFields.length !== soldRows.length) return;

    const nextP: Record<string, string> = {};
    const nextN: Record<string, string> = {};

    awardFields.forEach((f, i) => {
      const row = ach[i];
      if (!row?.media_url) return;
      if (form.getValues(`awards.${i}.file`)) return;
      nextP[`awards-${f.id}`] = row.media_url;
      if (row.media_original_name) nextN[`awards-${f.id}`] = row.media_original_name;
    });

    exhibitionFields.forEach((f, i) => {
      const row = hist[i];
      if (!row?.media_url) return;
      if (form.getValues(`exhibitions.${i}.file`)) return;
      nextP[`exhibitions-${f.id}`] = row.media_url;
      if (row.media_original_name) nextN[`exhibitions-${f.id}`] = row.media_original_name;
    });

    soldArtworkFields.forEach((f, i) => {
      const row = soldRows[i];
      if (!row) return;
      const imgKey = `soldArtworks-${f.id}-image`;
      const proofKey = `soldArtworks-${f.id}-proofOfSale`;
      if (row.artwork_image_url && !form.getValues(`soldArtworks.${i}.image`)) {
        nextP[imgKey] = row.artwork_image_url;
        nextN[imgKey] = "Artwork image";
      }
      if (row.proof_of_sale_url && !form.getValues(`soldArtworks.${i}.proofOfSale`)) {
        const proofName = row.proof_of_sale_original_name ?? "";
        const isPdf =
          proofName.toLowerCase().endsWith(".pdf") || row.proof_of_sale_url.toLowerCase().includes(".pdf");
        nextP[proofKey] = isPdf ? "document" : row.proof_of_sale_url;
        nextN[proofKey] = proofName || "Proof of sale";
      }
    });

    setFilePreviews((prev) => ({ ...prev, ...nextP }));
    setFileNames((prev) => ({ ...prev, ...nextN }));
  }, [onboarding, awardFields, exhibitionFields, soldArtworkFields, form]);

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
    if (dataArray?.[0]?.media_id != null) {
      return String(dataArray[0].media_id);
    }
    const candidates = [d?.data?.id, d?.data?.media_id, d?.data?.mediaId, d?.id, d?.media_id, d?.mediaId, d?.data];
    for (const c of candidates) {
      if (c != null && c !== "") return String(c);
    }
    return null;
  };

  const handleAvatarUpload = async (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a JPEG, PNG, JPG, GIF, WEBP, BMP, or SVG file.",
      });
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
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
    void queryClient.invalidateQueries({ queryKey: ["artist-onboarding"] });
  };

  const onSubmitStep1 = async (values: FormValues) => {
    if (avatarFile && !values.avatar_media_id) {
      toast.error("Please wait for avatar upload to complete");
      return;
    }
    setSubmitting(true);
    try {
      await submitArtistOnboardingStep1({
        artist_name: values.artistName,
        artist_bio: values.bio,
        collector_message: values.collectorMessage || undefined,
        avatar_media_id: values.avatar_media_id ? parseInt(values.avatar_media_id, 10) : undefined,
      })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Step 1 saved");
      setActiveStep(2);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Failed to save";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitStep2 = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const achievements = await Promise.all(
        (values.awards || []).map(async (award) => {
          if (award.file) {
            const mediaId = await uploadFileAndGetMediaId(award.file);
            return {
              title: award.name,
              description: "",
              media_id: mediaId ? parseInt(mediaId, 10) : undefined,
            };
          }
          if (award.existing_media_id != null) {
            return {
              title: award.name,
              description: "",
              media_id: award.existing_media_id,
            };
          }
          return { title: award.name, description: "", media_id: undefined };
        }),
      );
      const history = await Promise.all(
        (values.exhibitions || []).map(async (exhibition) => {
          if (exhibition.file) {
            const mediaId = await uploadFileAndGetMediaId(exhibition.file);
            return {
              title: exhibition.name,
              description: "",
              media_id: mediaId ? parseInt(mediaId, 10) : undefined,
            };
          }
          if (exhibition.existing_media_id != null) {
            return {
              title: exhibition.name,
              description: "",
              media_id: exhibition.existing_media_id,
            };
          }
          return { title: exhibition.name, description: "", media_id: undefined };
        }),
      );
      const previously_sold_artworks = await Promise.all(
        (values.soldArtworks || []).map(async (artwork) => {
          let artwork_image_media_id = artwork.existing_image_media_id;
          let proof_of_sale_media_id = artwork.existing_proof_media_id;
          if (artwork.image) {
            const id = await uploadFileAndGetMediaId(artwork.image);
            if (id) artwork_image_media_id = parseInt(id, 10);
          }
          if (artwork.proofOfSale) {
            const id = await uploadFileAndGetMediaId(artwork.proofOfSale);
            if (id) proof_of_sale_media_id = parseInt(id, 10);
          }
          return {
            artwork_name: artwork.name,
            artwork_image_media_id,
            proof_of_sale_media_id,
            sell_value: artwork.saleValue ? parseFloat(artwork.saleValue) : undefined,
          };
        }),
      );

      await submitArtistOnboardingStep2({
        achievements,
        history,
        previously_sold_artworks,
      })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Step 2 saved");
      setActiveStep(3);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Failed to save";
      toast.error(msg);
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

      await submitArtistOnboardingStep3({
        social_links,
        location: values.location || undefined,
        university: values.university || undefined,
        website_portfolio_link: values.portfolioUrl?.trim() || undefined,
        artist_style: values.artisticStyle || undefined,
      })();
      await fetchProfile();
      invalidateOnboarding();
      toast.success("Application submitted", {
        description: "Our team will review your profile shortly.",
      });
      if (variant === "signup") {
        router.push("/portfolio");
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Failed to save";
      toast.error(msg);
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
              className={cn(
                "flex-1 flex flex-col items-center gap-2 text-left min-w-0",
                disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "w-full h-1.5 rounded-full transition-colors",
                  done || current ? "bg-primary" : "bg-muted",
                  current && "ring-2 ring-primary/40",
                )}
              />
              <span
                className={cn(
                  "text-xs font-mono uppercase tracking-wide",
                  current ? "text-primary" : "text-muted-foreground",
                )}
              >
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
      <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm", className)}>
        {msg}
      </div>
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
              if (!r.success) {
                applyZodIssues(form, r.error.issues);
                return;
              }
              void onSubmitStep1(vals);
            }
            if (activeStep === 2) {
              const r = step2FieldsSchema.safeParse(vals);
              if (!r.success) {
                applyZodIssues(form, r.error.issues);
                return;
              }
              void onSubmitStep2(vals);
            }
            if (activeStep === 3) {
              const r = step3FieldsSchema.safeParse(vals);
              if (!r.success) {
                applyZodIssues(form, r.error.issues);
                return;
              }
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
                      onClick={() => document.getElementById("onb-avatar-input")?.click()}
                    >
                      {isUploadingAvatar ? "Uploading..." : "Upload Image"}
                    </Button>
                    <input
                      id="onb-avatar-input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Optional public avatar (JPEG, PNG, etc., max 5MB).
                </p>
                {form.watch("avatar_media_id") && (
                  <p className="text-[12px] text-primary">Avatar ready ✓</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist Name / Pseudonym</FormLabel>
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
                    <FormLabel>Artist Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about yourself and your art…" className="min-h-[120px]" {...field} />
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
                      <Textarea placeholder="A note for future fractal holders…" className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormDescription>Shown to collectors who hold your work.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {activeStep === 2 && (
            <>
              <div className="space-y-4">
                <FormLabel className="text-base text-foreground/90">Awards</FormLabel>
                {awardFields.map((awardField, index) => (
                  <div key={awardField.id} className="p-4 border border-border/40 rounded-lg space-y-4 relative group">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`awards.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="e.g., Digital Art Prize 2024" className="bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`awards.${index}.file`}
                          render={({ field }) => {
                            const fieldId = `awards-${awardField.id}`;
                            const preview = filePreviews[fieldId];
                            const filename = fileNames[fieldId];
                            return (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Certificate / image</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-sm border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                      {preview ? (
                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                      <div
                                        className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                        onClick={() => document.getElementById(`onb-awards-${awardField.id}`)?.click()}
                                      >
                                        <Upload className="w-4 h-4 shrink-0" />
                                        <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                      </div>
                                      <input
                                        id={`onb-awards-${awardField.id}`}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e, fieldId, (f) => field.onChange(f))}
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
                          setFilePreviews((p) => {
                            const n = { ...p };
                            delete n[`awards-${awardField.id}`];
                            return n;
                          });
                          setFileNames((p) => {
                            const n = { ...p };
                            delete n[`awards-${awardField.id}`];
                            return n;
                          });
                          removeAward(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-sans"
                    onClick={() => appendAward({ name: "" })}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Award
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <FormLabel className="text-base text-foreground/90">Exhibitions</FormLabel>
                {exhibitionFields.map((exhibitionField, index) => (
                  <div key={exhibitionField.id} className="p-4 border border-border/40 rounded-sm space-y-4 relative group">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`exhibitions.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="e.g., Solo show at Modern Gallery" className="bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`exhibitions.${index}.file`}
                          render={({ field }) => {
                            const fieldId = `exhibitions-${exhibitionField.id}`;
                            const preview = filePreviews[fieldId];
                            const filename = fileNames[fieldId];
                            return (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Image</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-sm border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                      {preview ? (
                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                      <div
                                        className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                        onClick={() => document.getElementById(`onb-ex-${exhibitionField.id}`)?.click()}
                                      >
                                        <Upload className="w-4 h-4 shrink-0" />
                                        <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                      </div>
                                      <input
                                        id={`onb-ex-${exhibitionField.id}`}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e, fieldId, (f) => field.onChange(f))}
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
                          setFilePreviews((p) => {
                            const n = { ...p };
                            delete n[`exhibitions-${exhibitionField.id}`];
                            return n;
                          });
                          setFileNames((p) => {
                            const n = { ...p };
                            delete n[`exhibitions-${exhibitionField.id}`];
                            return n;
                          });
                          removeExhibition(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-sans"
                    onClick={() => appendExhibition({ name: "" })}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Exhibition
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <FormLabel className="text-base text-foreground/90">Previously sold artworks</FormLabel>
                <p className="text-[13px] text-muted-foreground">Optional — helps establish your sales track record.</p>
                {soldArtworkFields.map((soldField, index) => (
                  <div key={soldField.id} className="p-5 border border-border/40 rounded-lg space-y-6 relative group">
                    <div className="absolute right-4 top-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          setFilePreviews((p) => {
                            const n = { ...p };
                            delete n[`soldArtworks-${soldField.id}-image`];
                            delete n[`soldArtworks-${soldField.id}-proofOfSale`];
                            return n;
                          });
                          setFileNames((p) => {
                            const n = { ...p };
                            delete n[`soldArtworks-${soldField.id}-image`];
                            delete n[`soldArtworks-${soldField.id}-proofOfSale`];
                            return n;
                          });
                          removeSoldArtwork(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`soldArtworks.${index}.name`}
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
                        name={`soldArtworks.${index}.image`}
                        render={({ field }) => {
                          const fieldId = `soldArtworks-${soldField.id}-image`;
                          const preview = filePreviews[fieldId];
                          const filename = fileNames[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Artwork image</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <div className="relative w-16 h-16 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                    {preview ? (
                                      <img src={preview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Upload className="w-6 h-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div
                                      className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md min-h-10 text-sm cursor-pointer"
                                      onClick={() => document.getElementById(`onb-sold-img-${soldField.id}`)?.click()}
                                    >
                                      <Upload className="w-4 h-4 shrink-0" />
                                      <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                    </div>
                                    <input
                                      id={`onb-sold-img-${soldField.id}`}
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => handleFileSelect(e, fieldId, (f) => field.onChange(f))}
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
                        name={`soldArtworks.${index}.proofOfSale`}
                        render={({ field }) => {
                          const fieldId = `soldArtworks-${soldField.id}-proofOfSale`;
                          const preview = filePreviews[fieldId];
                          const filename = fileNames[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Proof of sale</FormLabel>
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
                                      onClick={() => document.getElementById(`onb-sold-proof-${soldField.id}`)?.click()}
                                    >
                                      <Upload className="w-4 h-4 shrink-0" />
                                      <span className="truncate text-muted-foreground">{filename || "Choose file"}</span>
                                    </div>
                                    <input
                                      id={`onb-sold-proof-${soldField.id}`}
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,application/pdf"
                                      className="hidden"
                                      onChange={(e) => handleFileSelect(e, fieldId, (f) => field.onChange(f))}
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
                      name={`soldArtworks.${index}.saleValue`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Sale value (₹)</FormLabel>
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
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 font-sans"
                    onClick={() => appendSoldArtwork({ name: "", saleValue: "" })}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Sold Artwork
                  </Button>
                </div>
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
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., National Institute of Design" {...field} />
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
                name="artisticStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artistic style</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Abstract, generative" {...field} />
                    </FormControl>
                    <FormDescription>Keywords that describe your practice.</FormDescription>
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
              label={
                submitting
                  ? "Saving…"
                  : activeStep === 3
                    ? "Submit application"
                    : "Save & continue"
              }
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
          <CardTitle className="text-2xl font-serif">Create your artist profile</CardTitle>
          <CardDescription className="font-sans">Three short steps. You can pause anytime and resume from your portfolio.</CardDescription>
        </CardHeader>
        <CardContent>{inner}</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("glass-capsule p-6 md:p-8", className)}>
      <div className="mb-6">
        <h2 className="text-xl font-light tracking-tight text-foreground">Artist onboarding</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete your application to unlock the artist dashboard on the Overview tab.
        </p>
      </div>
      {inner}
    </div>
  );
}
