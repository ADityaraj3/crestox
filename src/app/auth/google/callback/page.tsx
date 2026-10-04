"use client"

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import { getPostAuthPath, redirectUnknownUserToSignup } from '@/utils/authRedirect';
import { UserType } from '@/enums/userType';
import { LoaderCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function GoogleCallbackContent() {
    const router = useRouter();
    const { googleSignIn } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        if (processed) return;
        setProcessed(true);

        // The implicit flow returns params in the URL hash fragment (#id_token=...&state=...)
        const hash = window.location.hash.substring(1); // remove leading #
        const params = new URLSearchParams(hash);

        const idToken = params.get('id_token');
        const stateParam = params.get('state');
        const errorParam = params.get('error') || new URLSearchParams(window.location.search).get('error');

        if (errorParam) {
            setError(`Google sign-in was cancelled or failed: ${errorParam}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
        }

        if (!idToken) {
            setError('No ID token received from Google.');
            setTimeout(() => router.push('/login'), 3000);
            return;
        }

        let intent: 'login' | 'signup' = 'signup';
        let userType: UserType | undefined;

        if (stateParam) {
            try {
                const state = JSON.parse(atob(stateParam));
                intent = state.intent || 'signup';
                const rawUserType = state.userType;
                userType = Object.values(UserType).includes(rawUserType as UserType)
                    ? (rawUserType as UserType)
                    : undefined;
            } catch {
                // ignore invalid state
            }
        }

        (async () => {
            try {
                // Use the existing googleSignIn which calls POST /auth/google with idToken
                const result = await googleSignIn(idToken, userType, intent);

                if (result && "userNotFound" in result && result.userNotFound) {
                    const email = result.email;
                    toast.warning(
                        email
                            ? `No account found for ${email}. Please sign up to continue.`
                            : "No account found for this Google email. Please sign up to continue.",
                    );
                    if (email) {
                        redirectUnknownUserToSignup(router, email, userType || null);
                    } else {
                        router.push(userType ? `/signup?user_type=${userType}&from=login` : "/signup?from=login");
                    }
                    return;
                }

                if (result && "accessToken" in result && result.accessToken) {
                    await useUserStore.getState().initialize();
                    toast.success(intent === 'login' ? "Successfully logged in with Google!" : "Successfully signed up with Google!");
                    router.push(getPostAuthPath(result));
                    return;
                }

                setError('Google authentication failed. Please try again.');
                setTimeout(() => router.push('/login'), 3000);
            } catch (err) {
                console.error("Google callback error:", err);
                setError('Google authentication failed. Please try again.');
                setTimeout(() => router.push('/login'), 3000);
            }
        })();
    }, [router, googleSignIn, processed]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    {error ? (
                        <div className="text-center space-y-4">
                            <p className="text-destructive font-medium">{error}</p>
                            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-4">
                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Completing Google sign-in...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <GoogleCallbackContent />
        </Suspense>
    );
}
