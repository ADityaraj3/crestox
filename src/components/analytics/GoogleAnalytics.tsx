"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { GA_MEASUREMENT_ID, pageview } from "@/lib/gtag";

/**
 * Tracks client-side route changes as GA page views.
 * Kept in its own component because `useSearchParams` requires a Suspense boundary.
 */
function RouteChangeTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!pathname) return;
        const query = searchParams?.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        pageview(url);
    }, [pathname, searchParams]);

    return null;
}

/**
 * Unified Google Analytics (gtag.js) integration.
 *
 * - Injects the gtag scripts via `next/script` (strategy="afterInteractive").
 * - The measurement ID is env-driven (`NEXT_PUBLIC_GA_MEASUREMENT_ID`).
 * - Renders nothing when no ID is configured, so dev/local stays clean.
 * - Automatically reports SPA navigations.
 */
export function GoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });
                `}
            </Script>
            <Suspense fallback={null}>
                <RouteChangeTracker />
            </Suspense>
        </>
    );
}

export default GoogleAnalytics;
