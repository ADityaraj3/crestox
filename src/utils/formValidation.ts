import * as z from "zod";

/** Accepts "https://site.com", "site.com/path"; rejects "not-a-valid-url". */
export function isValidWebUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return /^https?:$/.test(url.protocol) && /\.[a-z]{2,}$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/** Required text that may not be blank or whitespace only. */
export const requiredText = (message: string) => z.string().trim().min(1, { message });

/** Optional website: empty is fine, anything else must be a valid URL. */
export const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isValidWebUrl(v), { message: "Enter a valid website (e.g. https://example.com)." });

/** Optional social profile: a URL or a plain @handle. */
export const optionalSocial = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^@?[A-Za-z0-9._-]{1,64}$/.test(v) || isValidWebUrl(v), {
    message: "Enter a profile URL or @handle.",
  });

/** Optional whole number of years, 0–100. */
export const optionalYears = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || (/^\d{1,3}$/.test(v) && Number(v) <= 100), {
    message: "Enter a number of years between 0 and 100.",
  });

/** Optional INR amount: non-negative, at most 2 decimals. */
export const optionalAmount = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Enter an amount of 0 or more (up to 2 decimals).",
  });

const SOCIAL_BASE: Record<string, string> = {
  instagram: "https://instagram.com/",
  twitter: "https://x.com/",
  linkedin: "https://www.linkedin.com/in/",
};

/** Turns "@handle" into the platform URL the server expects; keeps URLs as typed. */
export function toSocialUrl(platform: string, value: string): string {
  const v = value.trim();
  if (isValidWebUrl(v)) return v;
  return `${SOCIAL_BASE[platform] ?? "https://"}${v.replace(/^@/, "")}`;
}
