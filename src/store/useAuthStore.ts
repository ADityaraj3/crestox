import { create } from 'zustand';
import { getMagicLink, verifyMagicLink, googleAuth, googleAuthCode, appleAuth } from '@/apis/auth/authActions';
import { AUTH_TOKEN_COOKIE_DAYS, setCookie } from '@/utils/cookieUtils';
import { UserType } from '@/enums/userType';

export interface VerifyResponseData {
    accessToken: string;
    isNewUser: boolean;
    userTypes: UserType[] | string[];
    isNewArtist?: boolean;
    isNewCollector?: boolean;
    isNewCurator?: boolean;
    isNewOwner?: boolean;
}

export type MagicLinkRequestResult =
    | { ok: true }
    | { ok: false; userNotFound?: boolean; email?: string };

export type GoogleSignInResult =
    | VerifyResponseData
    | { userNotFound: true; email?: string }
    | null;

export type AppleSignInResult =
    | VerifyResponseData
    | { userNotFound: true; email?: string }
    | null;

function parseUserNotFoundError(err: unknown): { email?: string } | null {
    const body = (err as { response?: { data?: { error?: string; data?: { email?: string } } } })
        ?.response?.data;
    if (body?.error === 'USER_NOT_FOUND') {
        return { email: body.data?.email };
    }
    return null;
}

interface AuthState {
    email: string;
    setEmail: (email: string) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    isSuccess: boolean;
    setIsSuccess: (isSuccess: boolean) => void;
    isExistingUser: boolean;
    magicLinkMessage: string | null;
    requestMagicLink: (email: string, name?: string, user_type?: string) => Promise<MagicLinkRequestResult>;
    verifyMagicLinkToken: (token: string) => Promise<VerifyResponseData | null>;
    googleSignIn: (
        idToken: string,
        user_type?: string,
        intent?: 'login' | 'signup',
    ) => Promise<GoogleSignInResult>;
    googleSignInWithCode: (
        code: string,
        redirect_uri: string,
        user_type?: string,
        intent?: 'login' | 'signup',
    ) => Promise<GoogleSignInResult>;
    appleSignIn: (
        idToken: string,
        authorizationCode?: string,
        name?: string,
        user_type?: string,
        intent?: 'login' | 'signup',
    ) => Promise<AppleSignInResult>;
    clearStore: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    email: '',
    setEmail: (email) => set({ email }),
    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),
    error: null,
    setError: (error) => set({ error }),
    isSuccess: false,
    setIsSuccess: (isSuccess) => set({ isSuccess }),
    isExistingUser: false,
    magicLinkMessage: null,

    requestMagicLink: async (email: string, name?: string, user_type?: string) => {
        set({ isLoading: true, error: null, isSuccess: false, isExistingUser: false, magicLinkMessage: null });
        try {
            const action = getMagicLink({ email, name, user_type });
            const response = await action();
            const payload = response.data?.data ?? response.data;
            set({
                isSuccess: true,
                isExistingUser: payload?.existingUser === true,
                magicLinkMessage: payload?.message ?? null,
            });
            return { ok: true as const };
        } catch (err: unknown) {
            const notFound = parseUserNotFoundError(err);
            if (notFound) {
                return {
                    ok: false as const,
                    userNotFound: true,
                    email: notFound.email ?? email,
                };
            }
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            set({
                error:
                    axiosErr?.response?.data?.message ||
                    axiosErr.message ||
                    'Something went wrong while sending the magic link',
            });
            return { ok: false as const };
        } finally {
            set({ isLoading: false });
        }
    },

    verifyMagicLinkToken: async (token: string) => {
        set({ isLoading: true, error: null, isSuccess: false });
        try {
            const verifyAction = verifyMagicLink({ token });
            const verifyResponse = await verifyAction();
            const payload = verifyResponse.data?.data ?? verifyResponse.data;
            const accessToken = payload?.accessToken;
            if (typeof accessToken !== 'string' || !accessToken) {
                throw new Error('Verification succeeded without an access token.');
            }

            const result: VerifyResponseData = {
                accessToken,
                isNewUser: payload?.isNewUser === true,
                userTypes: Array.isArray(payload?.userTypes) ? payload.userTypes : [],
                isNewArtist: payload?.isNewArtist === true,
                isNewCollector: payload?.isNewCollector === true,
                isNewCurator: payload?.isNewCurator === true,
                isNewOwner: payload?.isNewOwner === true,
            };
            setCookie('token', accessToken, AUTH_TOKEN_COOKIE_DAYS);
            set({ isSuccess: true });
            return result;
        } catch (err: any) {
            set({ error: err?.response?.data?.message || err.message || 'Verification failed. The link might be expired or invalid.' });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    googleSignIn: async (
        idToken: string,
        user_type?: string,
        intent: 'login' | 'signup' = 'signup',
    ) => {
        set({ isLoading: true, error: null, isSuccess: false });
        try {
            const googleAuthAction = googleAuth({ idToken, user_type, intent });
            const response = await googleAuthAction();

            if (response.status !== 200) {
                set({ error: response.data?.message || 'Google sign-in failed.' });
                return null;
            }

            const accessToken = response.data?.accessToken || response.data?.data?.accessToken;
            const isNewUser = response.data?.isNewUser || response.data?.data?.isNewUser;
            const userTypes = response.data?.userTypes || response.data?.data?.userTypes || [];
            const isNewArtist = response.data?.isNewArtist || response.data?.data?.isNewArtist;
            const isNewCollector = response.data?.isNewCollector || response.data?.data?.isNewCollector;
            const isNewCurator = response.data?.isNewCurator || response.data?.data?.isNewCurator;
            const isNewOwner = response.data?.isNewOwner || response.data?.data?.isNewOwner;

            if (accessToken) {
                setCookie("token", accessToken, AUTH_TOKEN_COOKIE_DAYS);
            }

            set({ isSuccess: true });
            return { accessToken, isNewUser, userTypes, isNewArtist, isNewCollector, isNewCurator, isNewOwner };
        } catch (err: unknown) {
            const notFound = parseUserNotFoundError(err);
            if (notFound) {
                return { userNotFound: true as const, email: notFound.email };
            }
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            console.log(err);
            set({
                error:
                    axiosErr?.response?.data?.message ||
                    axiosErr.message ||
                    'Google sign-in failed.',
            });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    googleSignInWithCode: async (
        code: string,
        redirect_uri: string,
        user_type?: string,
        intent: 'login' | 'signup' = 'signup',
    ) => {
        set({ isLoading: true, error: null, isSuccess: false });
        try {
            const action = googleAuthCode({ code, redirect_uri, user_type, intent });
            const response = await action();

            if (response.status !== 200) {
                set({ error: response.data?.message || 'Google sign-in failed.' });
                return null;
            }

            const accessToken = response.data?.accessToken || response.data?.data?.accessToken;
            const isNewUser = response.data?.isNewUser || response.data?.data?.isNewUser;
            const userTypes = response.data?.userTypes || response.data?.data?.userTypes || [];
            const isNewArtist = response.data?.isNewArtist || response.data?.data?.isNewArtist;
            const isNewCollector = response.data?.isNewCollector || response.data?.data?.isNewCollector;
            const isNewCurator = response.data?.isNewCurator || response.data?.data?.isNewCurator;
            const isNewOwner = response.data?.isNewOwner || response.data?.data?.isNewOwner;

            if (accessToken) {
                setCookie("token", accessToken, AUTH_TOKEN_COOKIE_DAYS);
            }

            set({ isSuccess: true });
            return { accessToken, isNewUser, userTypes, isNewArtist, isNewCollector, isNewCurator, isNewOwner };
        } catch (err: unknown) {
            const notFound = parseUserNotFoundError(err);
            if (notFound) {
                return { userNotFound: true as const, email: notFound.email };
            }
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            set({
                error:
                    axiosErr?.response?.data?.message ||
                    axiosErr.message ||
                    'Google sign-in failed.',
            });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    appleSignIn: async (
        idToken: string,
        authorizationCode?: string,
        name?: string,
        user_type?: string,
        intent: 'login' | 'signup' = 'signup',
    ) => {
        set({ isLoading: true, error: null, isSuccess: false });
        try {
            const appleAuthAction = appleAuth({ idToken, authorizationCode, name, user_type, intent });
            const response = await appleAuthAction();

            if (response.status !== 200) {
                set({ error: response.data?.message || 'Apple sign-in failed.' });
                return null;
            }

            const accessToken = response.data?.accessToken || response.data?.data?.accessToken;
            const isNewUser = response.data?.isNewUser || response.data?.data?.isNewUser;
            const userTypes = response.data?.userTypes || response.data?.data?.userTypes || [];
            const isNewArtist = response.data?.isNewArtist || response.data?.data?.isNewArtist;
            const isNewCollector = response.data?.isNewCollector || response.data?.data?.isNewCollector;
            const isNewCurator = response.data?.isNewCurator || response.data?.data?.isNewCurator;
            const isNewOwner = response.data?.isNewOwner || response.data?.data?.isNewOwner;

            if (accessToken) {
                setCookie("token", accessToken, AUTH_TOKEN_COOKIE_DAYS);
            }

            set({ isSuccess: true });
            return { accessToken, isNewUser, userTypes, isNewArtist, isNewCollector, isNewCurator, isNewOwner };
        } catch (err: unknown) {
            const notFound = parseUserNotFoundError(err);
            if (notFound) {
                return { userNotFound: true as const, email: notFound.email };
            }
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            console.error(err);
            set({
                error:
                    axiosErr?.response?.data?.message ||
                    axiosErr.message ||
                    'Apple sign-in failed.',
            });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    clearStore: () =>
        set({
            email: '',
            isLoading: false,
            error: null,
            isSuccess: false,
            isExistingUser: false,
            magicLinkMessage: null,
        }),
}));

