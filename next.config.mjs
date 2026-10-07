const isDev = process.env.NODE_ENV !== 'production';

// Backend origins the browser calls directly (see src/utils/strings.ts).
// Extra origins can be added per deployment via CSP_EXTRA_CONNECT_SRC
// (space- or comma-separated) without a code change.
const backendOrigins = [
  'https://crestox-backend-git-main-crestox-art-exchange.vercel.app',
  'https://crestox-backend-production-6031.up.railway.app',
  'https://*.crestox.com',
  ...(process.env.CSP_EXTRA_CONNECT_SRC ?? '')
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(isDev ? ['http://localhost:8989', 'ws://localhost:3000'] : []),
];

// Content-Security-Policy. The key protections: scripts only from this site,
// Razorpay checkout and Apple sign-in; network calls only to our API and the
// payment / sign-in providers (an injected script cannot ship a stolen token
// to an attacker's server with fetch/XHR); no framing of the site (clickjacking).
// Next.js App Router emits inline bootstrap scripts, so 'unsafe-inline' stays
// in script-src until a nonce-based setup is introduced.
const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
    'https://checkout.razorpay.com',
    'https://appleid.cdn-apple.com',
    // Google Analytics (gtag.js), see src/components/analytics/GoogleAnalytics.tsx
    'https://*.googletagmanager.com',
  ]
    .filter(Boolean)
    .join(' '),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https: http://commondatastorage.googleapis.com",
  [
    "connect-src 'self'",
    ...backendOrigins,
    'https://*.razorpay.com',
    'https://appleid.apple.com',
    // Google Analytics collection endpoints
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
  ].join(' '),
  "frame-src 'self' https://*.razorpay.com https://appleid.apple.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.razorpay.com https://appleid.apple.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isDev
    ? []
    : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
