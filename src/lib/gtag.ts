import { strings } from "@/utils/strings";

/**
 * Centralized Google Analytics (gtag.js) helpers.
 *
 * The measurement ID is sourced from the env-backed config (`strings.ga_measurement_id`),
 * so it can be swapped per-environment without touching code. When it is empty,
 * analytics is treated as disabled and all helpers become no-ops.
 */

export const GA_MEASUREMENT_ID = strings.ga_measurement_id;

/** Whether analytics is enabled (an ID is configured and we're in the browser). */
export const isAnalyticsEnabled = (): boolean =>
    Boolean(GA_MEASUREMENT_ID) && typeof window !== "undefined" && typeof window.gtag === "function";

/** Track a SPA page view. Call on route changes. */
export const pageview = (url: string): void => {
    if (!isAnalyticsEnabled()) return;
    window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
    });
};

export interface GtagEvent {
    action: string;
    category?: string;
    label?: string;
    value?: number;
    /** Any additional custom parameters supported by GA4. */
    [key: string]: unknown;
}

/** Track a custom event. */
export const event = ({ action, category, label, value, ...rest }: GtagEvent): void => {
    if (!isAnalyticsEnabled()) return;
    window.gtag("event", action, {
        ...(category !== undefined && { event_category: category }),
        ...(label !== undefined && { event_label: label }),
        ...(value !== undefined && { value }),
        ...rest,
    });
};

export {};

declare global {
    interface Window {
        dataLayer: unknown[];
        gtag: (...args: unknown[]) => void;
    }
}
