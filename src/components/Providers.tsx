"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
    // Every API call is a cross-region round trip (~1-3 s), so data fetched in the
    // last 30 s is reused instead of refetched on each remount (dashboard tab
    // switches) or window focus. Mutations invalidate their queries explicitly.
    const [queryClient] = useState(
        () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
                <TooltipProvider>
                    {children}
                    <Toaster />
                    <Sonner />
                </TooltipProvider>
            </NextThemesProvider>
        </QueryClientProvider>
    );
}
