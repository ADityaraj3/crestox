import instance from "@/utils/apiCalls";
import { ARTWORK_URLS } from "./artworkUrls";

export interface FeaturedTickerArtwork {
    artwork_id: number;
    artwork_name: string;
    artist_name: string | null;
    primary_image_url: string | null;
    description: string | null;
    fractal_price: number;
    change_24h: number;
    valuation: number;
    available_shares: number;
}

export const getFeaturedArtworksForTicker = () => async (): Promise<FeaturedTickerArtwork[]> => {
    try {
        const response = await instance.get(ARTWORK_URLS.GET_FEATURED_ARTWORKS);
        const data = response.data?.data ?? response.data;
        return Array.isArray(data) ? data : [];
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

// Lightweight fetch of just the primary image URLs of featured/curated artworks.
// Backed by the cached `/artwork/curated-masterpieces` endpoint.
export const getFeaturedArtworkImages = () => async (): Promise<string[]> => {
    try {
        const response = await instance.get(ARTWORK_URLS.GET_CURATED_MASTERPIECES);
        const data = response.data?.data ?? response.data;
        if (!Array.isArray(data)) return [];
        return data
            .map((item: { primary_image_url?: string | null }) => item?.primary_image_url?.trim() ?? "")
            .filter((url: string): url is string => url.length > 0);
    } catch (err: any) {
        console.log({ err });
        return [];
    }
};

export const createArtwork = (data: any) => async () => {
    try {
        const response = await instance.post(ARTWORK_URLS.CREATE_ARTWORK, data);
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

export const getArtworkById = (id: string) => async () => {
    try {
        const response = await instance.get(ARTWORK_URLS.GET_ARTWORK_BY_ID.replace(":id", id));
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

export const getArtworksByArtist = (artistProfileId: string) => async () => {
    try {
        const response = await instance.get(ARTWORK_URLS.GET_ATWORKS_BY_ARTIST.replace("{artistProfileId}", artistProfileId));
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

export const getPriceHistory = (artworkId: string, params?: any) => async () => {
    try {
        const response = await instance.get(ARTWORK_URLS.GET_PRICE_HISTORY.replace("{id}", artworkId), { params });
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

/** Aggregated analytics for artwork detail (valuation series, grades, collectors, portfolio, fractal price, hold time). */
export interface ArtworkAnalyticsPayload {
    valuation_history: { label: string; price: number }[];
    grade_distribution: { grade: string; count: number }[];
    unique_collectors: number;
    total_portfolio_value: number;
    fractal_price: number;
    avg_hold_days: number | null;
}

export const getArtworkAnalytics = (artworkId: string) => async () => {
    try {
        const response = await instance.get(
            ARTWORK_URLS.GET_ARTWORK_ANALYTICS.replace("{id}", artworkId),
        );
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

export type VerifiedArtworkSort = "relevance" | "price_asc" | "price_desc" | "performance";

export interface VerifiedArtwork {
    artwork_id: number;
    artwork_name: string;
    primary_image_url: string | null;
    primary_image_orientation: string | null;
    artist_name?: string | null;
    valuation?: string | number | null;
}

export interface VerifiedArtworksPage {
    list: VerifiedArtwork[];
    next_cursor: number | null;
}

export const getVerifiedArtworks =
    (params: { take?: number; cursor?: number | null; sort?: VerifiedArtworkSort } = {}) =>
    async (): Promise<VerifiedArtworksPage> => {
        try {
            const response = await instance.get(ARTWORK_URLS.GET_VERIFIED_ARTWORKS, {
                params: {
                    take: params.take ?? 20,
                    ...(params.cursor != null ? { cursor: params.cursor } : {}),
                    ...(params.sort ? { sort: params.sort } : {}),
                },
            });
            const data = response.data?.data ?? response.data;
            return {
                list: Array.isArray(data?.list) ? data.list : [],
                next_cursor: data?.next_cursor ?? null,
            };
        } catch (err: any) {
            console.log({ err });
            throw err;
        }
    };

export type PriceApprovalStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "SUPERSEDED";

export interface PriceApprovalDetails {
    status: PriceApprovalStatus;
    artwork_id: number;
    artwork_name: string | null;
    price_before: number;
    price_after: number;
    notes: string | null;
}

export interface PriceApprovalResponseResult {
    status: "APPROVED" | "REJECTED";
    message: string;
}

export const getPriceApproval =
    (token: string) => async (): Promise<PriceApprovalDetails> => {
        const response = await instance.get<{ data?: PriceApprovalDetails }>(
            ARTWORK_URLS.PRICE_APPROVAL_GET(token)
        );
        const payload = response.data?.data as PriceApprovalDetails | undefined;
        if (!payload) {
            throw new Error("Missing price approval payload");
        }
        return payload;
    };

export const respondToPriceApproval =
    (token: string, action: "approve" | "reject") =>
    async (): Promise<PriceApprovalResponseResult> => {
        const response = await instance.post<{ data?: PriceApprovalResponseResult }>(
            ARTWORK_URLS.PRICE_APPROVAL_RESPOND(token),
            { action }
        );
        const payload = response.data?.data as
            | PriceApprovalResponseResult
            | undefined;
        if (!payload) {
            throw new Error("Missing price approval response payload");
        }
        return payload;
    };
