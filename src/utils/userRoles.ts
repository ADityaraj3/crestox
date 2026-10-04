import type { User } from "@/store/useUserStore";

export type CreatorRole = "artist" | "curator" | "owner";

/**
 * The backend seeds the curator role with the slug `curators` (plural), while
 * artist/owner/collector are singular. The profile endpoint also returns roles
 * as objects (`{ roleSlug, roleName, ... }`) even though the frontend `User`
 * type historically declared `roles: string[]`. This helper normalizes both
 * shapes into a lowercase list of slugs.
 */
export function getRoleSlugs(
  user: Pick<User, "roles"> | null | undefined,
): string[] {
  const roles = user?.roles as unknown;
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => {
      if (typeof r === "string") return r.toLowerCase();
      if (r && typeof r === "object") {
        const obj = r as Record<string, unknown>;
        const slug = obj.roleSlug ?? obj.role_slug ?? obj.roleName ?? obj.role_name;
        return typeof slug === "string" ? slug.toLowerCase() : "";
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Determine which onboarding/dashboard a user should see in the portfolio
 * overview. A single user can hold several roles (everyone is also a
 * `collector`), so we prefer the "creator" role in a fixed priority order.
 * Returns `null` when the user has no creator role (e.g. a pure collector).
 */
export function getPrimaryCreatorRole(
  user: Pick<User, "roles" | "artist_creator_type" | "artist_profile_approved"> | null | undefined,
): CreatorRole | null {
  const slugs = getRoleSlugs(user);
  // Curators and owners get an artist-type selling profile (and the artist
  // role) when they finish onboarding. Once approved they use the full artist
  // dashboard; until then they see their own application status.
  const creatorType = user?.artist_creator_type;
  if (creatorType === "CURATOR" || creatorType === "OWNER") {
    if (user?.artist_profile_approved) return "artist";
    return creatorType === "CURATOR" ? "curator" : "owner";
  }
  if (slugs.includes("artist")) return "artist";
  if (slugs.includes("curator") || slugs.includes("curators")) return "curator";
  if (slugs.includes("owner")) return "owner";
  return null;
}
