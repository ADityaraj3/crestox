import instance from '@/utils/apiCalls';
import { ARTIST_URLS } from './artistUrls';

// --- Basic details response ---
export interface ArtistBasicDetails {
    artist_name: string;
    bio: string | null;
    location: string | null;
    university_name: string | null;
    avatar_url: string | null;
    social_media_links: { platform: string; url: string }[];
    total_fractals: number;
    available_fractals: number;
    current_share_value: number;
    /** Present when the request is authenticated; whether this artist is on the user watchlist */
    is_in_watchlist?: boolean;
}

// --- Achievements response ---
export interface ArtistAchievement {
    id: number;
    title: string;
    description: string | null;
    media: {
        media_id: number;
        file_path: string;
        original_file_name: string;
    } | null;
    display_order: number;
    created_at: string;
}

// --- History response ---
export interface ArtistHistory {
    id: number;
    title: string;
    description: string | null;
    media: {
        media_id: number;
        file_path: string;
        original_file_name: string;
    } | null;
    display_order: number;
    created_at: string;
}

// --- Collectors response ---
export interface ArtistCollector {
    name: string;
    total_shares_held: number;
    started_holding_date: string;
}

// --- Price history response ---
export interface ArtistPriceHistory {
    current_price: number;
    history: { month: string; price: number }[];
}

/** GET /artists/:id/analytics — same metrics as artwork analytics; chart is fractal price over time */
export interface ArtistAnalyticsPayload {
    artist_profile_id: number;
    currency: 'INR';
    fractal_price_history: { label: string; price: number }[];
    grade_distribution: { grade: string; count: number }[];
    unique_collectors: number;
    total_portfolio_value: number;
    fractal_price: number;
    avg_hold_days: number | null;
}

export interface ArtistArtwork {
    artistProfileId: number;
}

export interface FeaturedArtist {
    artist_profile_id: number | null;
    artist_id: number;
    artist_name: string;
    artist_bio: string | null;
    avatar_url: string | null;
    total_fractals: number;
    available_fractals: number;
    type?: 'artist' | 'curator' | 'owner';
}

/** Single artwork entry on GET /artists/homepage */
export interface HomepageArtwork {
    url: string;
    name: string;
}

/** GET /artists/homepage — spotlight section */
export interface HomepageArtist {
    artist_id: number;
    artist_profile_id: number;
    artist_name: string;
    description: string | null;
    /** Admin-set marketing line from artist profile */
    homepage_tagline?: string | null;
    /** Artist profile / avatar image URL */
    artist_avatar_url?: string | null;
    fractal_price: number;
    fractals_sold_percentage: number;
    total_portfolio_value: number;
    artworks: HomepageArtwork[];
}

interface FeaturedArtistsResponse {
    success: boolean;
    data: FeaturedArtist[];
    error?: string;
    message?: string;
}

export const getFeaturedArtists =
    (keyword?: string) =>
    async (): Promise<FeaturedArtist[]> => {
        try {
            const response = await instance.get<FeaturedArtistsResponse>(ARTIST_URLS.FEATURED_ARTISTS, {
                params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
            });
            return response.data?.data ?? [];
        } catch (err: any) {
            console.error({ err });
            throw err;
        }
    };

export const getHomepageArtists = () => async (): Promise<HomepageArtist[]> => {
    try {
        const response = await instance.get<{ data?: HomepageArtist[] }>(ARTIST_URLS.HOMEPAGE_ARTISTS);
        const list = response.data?.data;
        return Array.isArray(list) ? list : [];
    } catch (err: any) {
        console.error({ err });
        throw err;
    }
};

export const getAllArtists =
    (params: { page?: number; limit?: number; isApproved?: boolean } = {}) =>
    async (): Promise<any> => {
        try {
            const response = await instance.get(ARTIST_URLS.GET_ALL_ARTISTS, {
                params,
            });
            return response.data?.data ?? [];
        } catch (err: any) {
            console.error({ err });
            throw err;
        }
    };

export const applyAsArtist = (data: any) => async () => {
    try {
        const response = await instance.post(ARTIST_URLS.CREATE_ARTIST, data);
        console.log({ response, data });
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

export interface ArtistOnboardingState {
    last_completed_step: number;
    artist_profile_id: number | null;
    is_approved: boolean;
    step1: {
        artist_name: string;
        artist_bio: string;
        collector_message: string;
        avatar_media_id: number | null;
        avatar_url?: string | null;
    };
    step2: {
        achievements: Array<{
            title: string;
            description: string | null;
            media_id: number | null;
            media_url?: string | null;
            media_original_name?: string | null;
        }>;
        history: Array<{
            title: string;
            description: string | null;
            media_id: number | null;
            media_url?: string | null;
            media_original_name?: string | null;
        }>;
        previously_sold_artworks: Array<{
            artwork_name: string;
            artwork_image_media_id: number | null;
            proof_of_sale_media_id: number | null;
            sell_value: number | null;
            artwork_image_url?: string | null;
            proof_of_sale_url?: string | null;
            proof_of_sale_original_name?: string | null;
        }>;
    };
    step3: {
        social_links: Array<{ platform: string; url: string }>;
        location: string;
        university: string;
        website_portfolio_link: string;
        artist_style: string;
    };
}

export const getArtistOnboardingState = () => async (): Promise<ArtistOnboardingState> => {
    const response = await instance.get<{ data?: ArtistOnboardingState }>(ARTIST_URLS.MY_ONBOARDING);
    const payload = response.data?.data as ArtistOnboardingState | undefined;
    if (!payload) {
        throw new Error('Missing onboarding payload');
    }
    return payload;
};

export const submitArtistOnboardingStep1 = (data: { artist_name: string; artist_bio: string; collector_message?: string; avatar_media_id?: number | null }) => async () => {
    return instance.post(ARTIST_URLS.ONBOARDING_STEP_1, data);
};

export const submitArtistOnboardingStep2 =
    (data: {
        achievements?: Array<{
            title: string;
            description?: string;
            media_id?: number;
        }>;
        history?: Array<{
            title: string;
            description?: string;
            media_id?: number;
        }>;
        previously_sold_artworks?: Array<{
            artwork_name: string;
            artwork_image_media_id?: number;
            proof_of_sale_media_id?: number;
            sell_value?: number;
        }>;
    }) =>
    async () => {
        return instance.patch(ARTIST_URLS.ONBOARDING_STEP_2, data);
    };

export const submitArtistOnboardingStep3 =
    (data: { social_links?: Array<{ platform: string; url: string }>; location?: string; university?: string; website_portfolio_link?: string; artist_style?: string }) => async () => {
        return instance.patch(ARTIST_URLS.ONBOARDING_STEP_3, data);
    };

export const getArtistBasicDetails = (id: number) => async (): Promise<ArtistBasicDetails | null> => {
    const response = await instance.get(ARTIST_URLS.BASIC_DETAILS(id));
    return response.data?.data ?? null;
};

export const getArtistAchievements = (id: number) => async (): Promise<ArtistAchievement[]> => {
    const response = await instance.get(ARTIST_URLS.ACHIEVEMENTS(id));
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
};

export const getArtistHistory = (id: number) => async (): Promise<ArtistHistory[]> => {
    const response = await instance.get(ARTIST_URLS.HISTORY(id));
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
};

export const getArtistCollectors = (id: number) => async (): Promise<ArtistCollector[]> => {
    const response = await instance.get(ARTIST_URLS.COLLECTORS(id));
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
};

export const getArtistPriceHistory = (id: number) => async (): Promise<ArtistPriceHistory> => {
    const response = await instance.get(ARTIST_URLS.PRICE_HISTORY(id));
    return response.data?.data ?? { current_price: 0, history: [] };
};

export const getArtistAnalytics = (id: number) => async () => {
    try {
        const response = await instance.get(ARTIST_URLS.ANALYTICS(id));
        return response;
    } catch (err: any) {
        console.error({ err });
        throw err;
    }
};

export const getArtistArtworks = (id: number) => async (): Promise<any[]> => {
    const response = await instance.get(ARTIST_URLS.ARTWORKS(id));
    const body = response.data;
    const data = body?.data ?? body?.artworks ?? body;
    const list = Array.isArray(data) ? data : [];
    return list;
};

export const getBufferPriceOfArtwork = (id: number) => async (): Promise<number> => {
    const response = await instance.get(ARTIST_URLS.BUFFER_PRICE_OF_ARTWORK(id));
    const data = response.data?.data;
    const currentPrice = data?.current_price;
    const value = currentPrice != null ? parseFloat(String(currentPrice)) : NaN;
    return Number.isFinite(value) ? value : 0;
};

export interface BuyFillLine {
    source: 'SECONDARY_SALE' | 'PRIMARY_SALE';
    quantity: number;
    price_per_share: string;
    subtotal: string;
    buyer_pays: string;
}

export interface BufferPriceQuote {
    current_price: number;
    /** Dynamic slippage buffer (Dynamic Buffer Addendum) added to the charge; unused part is refunded. */
    buffer_percent: number | null;
    /** Buffer before the 15% ceiling; above it the buyer must acknowledge high volatility. */
    raw_buffer_percent?: number | null;
    high_volatility_warning?: boolean;
    fill_breakdown: BuyFillLine[];
    fill_subtotal_pre_tax: string | null;
    /** Estimate including GST and the 2% buyer fee on resale fills. */
    fill_total_buyer_pays: string | null;
    /** What Razorpay will charge: estimate + buffer. */
    max_charge?: string | null;
    total_available_shares: number | null;
    sufficient_for_quantity: boolean | null;
}

export const getBufferPriceQuote = (artworkId: number, quantity?: number) => async (): Promise<BufferPriceQuote> => {
    const response = await instance.get(ARTIST_URLS.BUFFER_PRICE_QUOTE(artworkId, quantity));
    const data = response.data?.data;
    const currentPrice = data?.current_price;
    const price = currentPrice != null ? parseFloat(String(currentPrice)) : NaN;
    const bufferPercent = data?.buffer_percent != null ? parseFloat(String(data.buffer_percent)) : null;
    const rawFill = data?.fill_breakdown;
    const fill_breakdown: BuyFillLine[] = Array.isArray(rawFill)
        ? rawFill.map((row: any) => ({
              source: row.source === 'PRIMARY_SALE' ? 'PRIMARY_SALE' : 'SECONDARY_SALE',
              quantity: Number(row.quantity) || 0,
              price_per_share: String(row.price_per_share ?? '0'),
              subtotal: String(row.subtotal ?? '0'),
              buyer_pays: String(row.buyer_pays ?? '0'),
          }))
        : [];
    const fillSub = data?.fill_subtotal_pre_tax;
    const fillTotal = data?.fill_total_buyer_pays;
    const totalAvail = data?.total_available_shares;
    const sufficient = data?.sufficient_for_quantity;
    return {
        current_price: Number.isFinite(price) ? price : 0,
        buffer_percent: bufferPercent != null && Number.isFinite(bufferPercent) ? bufferPercent : null,
        fill_breakdown,
        fill_subtotal_pre_tax: fillSub != null ? String(fillSub) : null,
        fill_total_buyer_pays: fillTotal != null ? String(fillTotal) : null,
        total_available_shares: totalAvail != null && Number.isFinite(Number(totalAvail)) ? Number(totalAvail) : null,
        sufficient_for_quantity: typeof sufficient === 'boolean' ? sufficient : null,
        raw_buffer_percent: data?.raw_buffer_percent != null ? Number(data.raw_buffer_percent) : null,
        high_volatility_warning: data?.high_volatility_warning === true,
        max_charge: data?.max_charge != null ? String(data.max_charge) : null,
    };
};

export const collectFractals = (data: any) => async () => {
    const response = await instance.post(ARTIST_URLS.COLLECT_FRACTALS, data);
    return response.data?.data ?? null;
};

export interface InitiateBuyResponse {
    razorpay_order_id: string;
    razorpay_key_id: string;
    amount: string;
    estimated_cost: string;
    buffer_pct: string;
    raw_buffer_pct?: string;
    high_volatility?: boolean;
    max_charge: string;
    expires_at: string;
    price_disclaimer: string;
    currency: string;
    receipt: string;
    artwork_id: number;
    quantity: number;
    current_fractal_price: string;
    cost_breakdown: Array<{
        source: 'SECONDARY_SALE' | 'PRIMARY_SALE';
        quantity: number;
        price_per_share: string;
        subtotal: string;
        buyer_pays: string;
    }>;
}

export const initiateBuyOrder =
    (data: { artwork_id: number; quantity: number; quoted_price?: number; acknowledge_high_volatility?: boolean }) =>
    async (): Promise<InitiateBuyResponse> => {
        const response = await instance.post(ARTIST_URLS.INITIATE_BUY, data);
        return response.data?.data;
    };

/** Releases the reserved fractals of a checkout the buyer closed without paying. */
export const cancelBuyOrder = (razorpayOrderId: string) => async (): Promise<{ status: string; message: string }> => {
    const response = await instance.post(ARTIST_URLS.CANCEL_BUY(razorpayOrderId));
    return response.data?.data;
};

/** Error code returned (HTTP 409) when the buyer must acknowledge high volatility first. */
export const HIGH_VOLATILITY_ACK_REQUIRED = 'HIGH_VOLATILITY_ACK_REQUIRED';

export interface CompleteBuyOrderResponse {
    status?: 'COMPLETED' | 'ALREADY_COMPLETED' | 'PROCESSING';
    message?: string;
    total_shares_purchased?: number;
    total_amount?: string;
    fractal_price_before?: string;
    fractal_price_after?: string;
    /** Portfolio-level count of fractals still available (primary + listed secondary). */
    available_shares_after?: number;
    /** Per-artwork available fractals (use on art detail page). */
    artwork_available_shares_after?: number;
    amount_captured?: string;
    refund_amount?: string;
    razorpay_payment_id?: string;
    fills?: unknown[];
}

export const completeBuyOrder =
    (data: {
        artwork_id: number;
        quantity: number;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        max_slippage_pct?: number;
        quoted_price?: number;
        payment_response?: Record<string, unknown>;
    }) =>
    async (): Promise<CompleteBuyOrderResponse> => {
        const response = await instance.post(ARTIST_URLS.COMPLETE_BUY, data);
        return response.data?.data;
    };

export interface BuyOrderStatusResponse {
    razorpay_order_id: string;
    artwork_id: number;
    quantity: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'FAILED_PRICE_MOVED' | 'EXPIRED' | 'CANCELLED';
    terminal: boolean;
    message: string;
    amount: string;
    amount_captured: string | null;
    executed_cost: string | null;
    refund_status: 'NONE' | 'PENDING' | 'COMPLETED' | 'FAILED';
    refund_amount: string | null;
    expires_at: string | null;
    updated_at: string | null;
}

export const getBuyOrderStatus = (razorpayOrderId: string) => async (): Promise<BuyOrderStatusResponse> => {
    const response = await instance.get(ARTIST_URLS.BUY_STATUS(razorpayOrderId));
    return response.data?.data;
};
