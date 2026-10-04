export const myCollectionURLS = {
    GET_MY_COLLECTION: "/trading/my-collections",
    SELL_FRACTAL: "/trading/listings",
    GET_MY_LISTINGS: "/trading/listings/my-with-artist-info",
    CANCEL_LISTING: (listingId: number) => `/trading/listings/${listingId}/cancel`,
    ADD_TO_WATCHLIST: "/trading/watchlist",
    HOLDING_CERTIFICATE: (artistProfileId: number) =>
        `/trading/certificate/artist/${artistProfileId}`,
    CERTIFICATE_REISSUE: (artistProfileId: number) =>
        `/trading/certificate/artist/${artistProfileId}/reissue`,
    CERTIFICATE_REISSUE_COMPLETE: "/trading/certificate/reissue/complete",
}