import instance from "@/utils/apiCalls";
import { myCollectionURLS } from "./myCollectionUrls";

export const getMyCollection = async () => {
    try {
        const response = await instance.get(myCollectionURLS.GET_MY_COLLECTION);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export const sellFractal = async (data: any) => {
    try {
        const response = await instance.post(myCollectionURLS.SELL_FRACTAL, data);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export const getMyListings = async () => {
    try {
        const response = await instance.get(myCollectionURLS.GET_MY_LISTINGS);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export const cancelListing = async (listingId: number) => {
    const response = await instance.post(myCollectionURLS.CANCEL_LISTING(listingId));
    return response.data?.data ?? response.data;
}

export const getWatchlist = async () => {
    try {
        const response = await instance.get(myCollectionURLS.ADD_TO_WATCHLIST);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export interface ToggleWatchlistResponse {
    is_in_watchlist: boolean;
    message?: string;
}

/** POST /trading/watchlist — toggles artist on the user watchlist */
export const toggleArtistWatchlist = async (data: { artist_profile_id: number }) => {
    const response = await instance.post(myCollectionURLS.ADD_TO_WATCHLIST, data);
    return (response.data?.data ?? response.data) as ToggleWatchlistResponse;
};

export const addToWatchlist = async (data: any) => {
    try {
        const response = await instance.post(myCollectionURLS.ADD_TO_WATCHLIST, data);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export interface HoldingCertificateArtwork {
    artwork_id: number;
    artwork_name: string;
    artwork_image_url: string | null;
}

export interface HoldingCertificateData {
    auth_number: string;
    share_count: number;
    issued_at: string;
    /** Service fee before GST, e.g. "99.00". */
    reissue_fee?: string;
    reissue_fee_gst_rate?: number;
    owner: { name: string };
    artist: {
        artist_name: string;
        collector_message: string | null;
    };
    artworks: HoldingCertificateArtwork[];
}

export const getHoldingCertificate = async (
    artistProfileId: number,
): Promise<HoldingCertificateData> => {
    const response = await instance.get(
        myCollectionURLS.HOLDING_CERTIFICATE(artistProfileId),
    );
    return (response.data?.data ?? response.data) as HoldingCertificateData;
};

export interface CertificateReissueOrder {
    razorpay_order_id: string;
    razorpay_key_id: string;
    amount: string;
    currency: string;
}

/** Starts a paid (₹99 + GST) reissue: returns a Razorpay order to pay. */
export const initiateCertificateReissue = async (artistProfileId: number): Promise<CertificateReissueOrder> => {
    const response = await instance.post(myCollectionURLS.CERTIFICATE_REISSUE(artistProfileId));
    return (response.data?.data ?? response.data) as CertificateReissueOrder;
};

export const completeCertificateReissue = async (data: {
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
}): Promise<{ status: string; message: string }> => {
    const response = await instance.post(myCollectionURLS.CERTIFICATE_REISSUE_COMPLETE, data);
    return response.data?.data ?? response.data;
};
