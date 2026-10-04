import { create } from 'zustand';
import { getProfile } from '@/apis/user/userActions';
import { getCookie } from '@/utils/cookieUtils';
import {
    clearArtistProfileIdStorage,
    syncArtistProfileIdFromProfile,
} from '@/utils/artistProfileStorage';

export interface User {
    id: number;
    name: string;
    email: string;
    phoneNumber: string | null;
    emailVerified: boolean;
    activeFlag: boolean;
    createdAt: string;
    updatedAt: string;
    roles: string[];
    permissions: string[];
    isAdmin: boolean;
    artist_profile_id?: number | null;
    artist_profile_approved?: boolean;
    /** ARTIST, or CURATOR / OWNER for the selling profile those roles get once onboarded. */
    artist_creator_type?: "ARTIST" | "CURATOR" | "OWNER" | null;
    /** True for approved artists, curators and owners. */
    can_add_artwork?: boolean;
    billing_state_code?: string | null;
    gstin?: string | null;
    artist_onboarding_last_completed_step?: number | null;
    curator_profile_id?: number | null;
    curator_profile_approved?: boolean;
    curator_onboarding_last_completed_step?: number | null;
    owner_profile_id?: number | null;
    owner_profile_approved?: boolean;
    owner_onboarding_last_completed_step?: number | null;
}

interface UserState {
    user: User | null;
    /** A profile fetch is currently in flight. */
    isLoading: boolean;
    /** A `token` cookie is present (auth credential exists), regardless of whether the profile has loaded. */
    isLoggedIn: boolean;
    /** The first profile-fetch attempt has settled (resolved, errored, or skipped because there was no token). */
    isInitialized: boolean;
    error: string | null;
    fetchProfile: () => Promise<User | null>;
    /** Read the token cookie and load the profile if present. Drives the global auth/loading state. */
    initialize: () => Promise<void>;
    clearUser: () => void;
}

// Request-deduplication guards. These live at module scope (not in the store
// state) so they are shared across every caller without triggering re-renders.
// The same network request can never be in flight more than once: concurrent
// callers (Header + auth pages, React StrictMode double-invoke, multiple
// components) all await the single in-flight promise instead of firing again.
let inFlightProfile: Promise<User | null> | null = null;
let inFlightInit: Promise<void> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    isLoading: false,
    isLoggedIn: false,
    isInitialized: false,
    error: null,

    fetchProfile: async () => {
        // De-dupe: if a profile request is already in flight, reuse it.
        if (inFlightProfile) return inFlightProfile;

        set({ isLoading: true, error: null });
        inFlightProfile = (async () => {
            try {
                const getProfileAction = getProfile();
                const response = await getProfileAction();

                // Assuming response.data.data or similar contains the structured user. Adjust based on your backend response structure.
                const userData = response?.data?.data || response?.data;
                syncArtistProfileIdFromProfile(userData?.artist_profile_id);
                set({ user: userData, isLoading: false, isLoggedIn: true });
                return userData ?? null;
            } catch (err: any) {
                console.error(err);
                set({ error: err?.response?.data?.message || err.message || 'Failed to fetch user profile', isLoading: false });
                return null;
            } finally {
                inFlightProfile = null;
            }
        })();
        return inFlightProfile;
    },

    initialize: async () => {
        // De-dupe: a single initialization runs at a time even if several
        // components (Header in the layout + the auth pages) call it together.
        if (inFlightInit) {
            await inFlightInit;
            const tokenAfterWait = getCookie('token');
            // A credential may have been written while a no-token init was in flight
            // (e.g. Google OAuth callback). Re-run so we actually fetch the profile.
            if (tokenAfterWait && !get().user) {
                inFlightInit = null;
            } else {
                return;
            }
        }

        inFlightInit = (async () => {
            try {
                const token = getCookie('token');
                if (token === undefined || token === '') {
                    // No credential: definitively logged out.
                    set({ isLoggedIn: false, user: null, isLoading: false, isInitialized: true });
                    return;
                }
                // Credential present: mark as logged in immediately so the UI can show a skeleton
                // (instead of the signed-out state) while the profile request is in flight.
                set({ isLoggedIn: true });
                await get().fetchProfile();
                set({ isInitialized: true });
            } finally {
                inFlightInit = null;
            }
        })();
        return inFlightInit;
    },

    clearUser: () => {
        clearArtistProfileIdStorage();
        set({ user: null, error: null, isLoggedIn: false, isInitialized: true });
    },
}));
