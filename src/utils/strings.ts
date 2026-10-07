export const strings = {
    // base_url: process.env.BACKEND_URL,
    base_url: "https://crestox-backend-git-main-crestox-art-exchange.vercel.app/api",
    // base_url: "http://localhost:8989/api",
    // base_url: process.env.BACKEND_URL || "https://crestox-backend-production-6031.up.railway.app/api",
    
    // Google OAuth - Replace with your actual Client ID from Google Cloud Console
    google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com",

    // Apple Sign In
    apple_client_id: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "your.apple.service.id",
    apple_redirect_uri: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || "https://your-domain.com/auth/apple/callback",

    // Google Analytics (gtag.js) - set NEXT_PUBLIC_GA_MEASUREMENT_ID to enable.
    // Leave empty to disable analytics entirely (e.g. in local/dev).
    ga_measurement_id: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
};
 