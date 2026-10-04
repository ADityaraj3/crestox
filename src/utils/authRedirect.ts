import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { UserType } from "@/enums/userType";

export function buildSignupUrl(email: string, userType?: UserType | null) {
    const params = new URLSearchParams({ email, from: "login" });
    if (userType) {
        params.set("user_type", userType);
    }
    return `/signup?${params.toString()}`;
}

export function redirectUnknownUserToSignup(
    router: AppRouterInstance,
    email: string,
    userType?: UserType | null,
) {
    router.push(buildSignupUrl(email, userType));
}

type PostAuthUser = {
    userTypes?: Array<string | UserType>;
    isNewUser?: boolean;
    isNewArtist?: boolean;
    isNewCurator?: boolean;
    isNewOwner?: boolean;
    isNewCollector?: boolean;
};

function hasRole(types: string[], ...roles: string[]) {
    return roles.some((role) => types.includes(role));
}

/**
 * After magic-link / Google / Apple / passkey auth, send creator roles to
 * /portfolio (where their application form lives). Never send them to the
 * standalone /onboarding/* pages.
 */
export function getPostAuthPath(result: PostAuthUser): string {
    const types = (result.userTypes ?? []).map((t) => String(t).toLowerCase());
    const isArtist = result.isNewArtist || hasRole(types, UserType.ARTIST, "artist");
    const isCurator =
        result.isNewCurator || hasRole(types, UserType.CURATOR, "curator", "curators");
    const isOwner = result.isNewOwner || hasRole(types, UserType.OWNER, "owner");
    const isCollector = result.isNewCollector || hasRole(types, UserType.COLLECTOR, "collector");

    if (isArtist || isCurator || isOwner) return "/portfolio";
    if (result.isNewUser || result.isNewCollector) return "/explore";
    if (isCollector) return "/collection";
    return "/";
}
