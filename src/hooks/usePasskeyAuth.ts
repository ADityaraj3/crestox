"use client"

import { useState, useCallback } from 'react';
import {
    passkeyRegisterOptions,
    passkeyRegister,
    passkeyAuthenticateOptions,
    passkeyAuthenticate,
} from '@/apis/auth/authActions';
import { AUTH_TOKEN_COOKIE_DAYS, setCookie } from '@/utils/cookieUtils';

interface PasskeyAuthResult {
    accessToken: string;
    isNewUser: boolean;
    userTypes: string[];
    isNewArtist?: boolean;
    isNewCollector?: boolean;
    isNewCurator?: boolean;
    isNewOwner?: boolean;
}

/**
 * Dynamically import @simplewebauthn/browser so the page doesn't crash
 * if the package hasn't been installed yet.
 */
async function getSimpleWebAuthn() {
    try {
        return await import('@simplewebauthn/browser');
    } catch {
        throw new Error(
            '@simplewebauthn/browser is not installed. Run: npm install @simplewebauthn/browser',
        );
    }
}

export function usePasskeyAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Register a new passkey for the currently logged-in user.
     * Requires a valid auth token in cookies.
     */
    const registerPasskey = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { startRegistration } = await getSimpleWebAuthn();

            // 1. Get registration options from server
            const optionsAction = passkeyRegisterOptions();
            const optionsRes = await optionsAction();
            const options = optionsRes.data?.data || optionsRes.data;

            // 2. Create credential via browser WebAuthn API
            const credential = await startRegistration({ optionsJSON: options });

            // 3. Send credential to server for verification
            const registerAction = passkeyRegister({ credential });
            const registerRes = await registerAction();
            const result = registerRes.data?.data || registerRes.data;

            return result?.verified === true;
        } catch (err: any) {
            const message =
                err?.name === 'NotAllowedError'
                    ? 'Passkey registration was cancelled.'
                    : err?.response?.data?.message || err?.message || 'Passkey registration failed.';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Authenticate with a passkey (no login required).
     * Uses discoverable credentials — the browser shows available passkeys.
     */
    const authenticateWithPasskey = useCallback(async (): Promise<PasskeyAuthResult | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const { startAuthentication } = await getSimpleWebAuthn();

            // 1. Get authentication options from server
            const optionsAction = passkeyAuthenticateOptions();
            const optionsRes = await optionsAction();
            const options = optionsRes.data?.data || optionsRes.data;

            // 2. Authenticate via browser WebAuthn API
            const credential = await startAuthentication({ optionsJSON: options });

            // 3. Send assertion to server for verification
            const authAction = passkeyAuthenticate({ credential });
            const authRes = await authAction();
            const result = authRes.data?.data || authRes.data;

            if (result?.accessToken) {
                setCookie('token', result.accessToken, AUTH_TOKEN_COOKIE_DAYS);
            }

            return result;
        } catch (err: any) {
            const message =
                err?.name === 'NotAllowedError'
                    ? 'Passkey authentication was cancelled.'
                    : err?.response?.data?.message || err?.message || 'Passkey authentication failed.';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        registerPasskey,
        authenticateWithPasskey,
        isLoading,
        error,
    };
}
