import { Metadata } from "next";
import { interpolateTemplate } from "@/utils/getPageMetadata";

const BASE_URL =
    process.env.BACKEND_URL ||
    "https://crestox-backend-production-6031.up.railway.app/api";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;

    // Fetch entity data and DB template in parallel
    const [artworkRes, templateRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/artwork/${id}`, { next: { revalidate: 3600 } }),
        fetch(`${BASE_URL}/seo/metadata?path=${encodeURIComponent("/art/[id]")}`, {
            next: { revalidate: 3600 },
        }),
    ]);

    // Parse artwork entity
    let artwork: Record<string, unknown> = {};
    if (artworkRes.status === "fulfilled" && artworkRes.value.ok) {
        const json = await artworkRes.value.json();
        artwork = json?.data ?? json ?? {};
    }

    const artistProfile = artwork.artist_profile;
    const artistNameFromProfile =
        artistProfile &&
        typeof artistProfile === "object" &&
        "artist_name" in artistProfile
            ? artistProfile.artist_name
            : null;

    // GET /artwork/:id returns `name`, `artwork_media` and `current_fractal_price`.
    const artworkMedia = Array.isArray(artwork?.artwork_media)
        ? (artwork.artwork_media as Array<{ media?: { file_path?: string } }>)
        : [];
    const artworkName = String(artwork?.name ?? artwork?.artwork_name ?? "Artwork");
    const description = artwork?.description ? String(artwork.description) : null;
    const primaryImage = artworkMedia[0]?.media?.file_path ?? artwork?.primary_image_url;
    const image = primaryImage ? String(primaryImage) : null;
    const artistName = String(artistNameFromProfile ?? artwork?.artist_name ?? "Crestox");

    // Build variable map for template interpolation
    const vars: Record<string, string> = {
        artwork_name: artworkName,
        description: description ?? "",
        artist_name: artistName,
        valuation: String(artwork?.value ?? artwork?.valuation ?? ""),
        available_shares: String(artwork?.available_shares ?? ""),
        fractal_price: String(artwork?.current_fractal_price ?? artwork?.fractal_price ?? ""),
    };

    // Derive title and description: use DB template if available, else fall back
    let title = `${artworkName} | Crestox`;
    let metaDescription = description ?? `Invest in fractional ownership of "${artworkName}" on Crestox.`;
    let ogImageAlt: string | null = null;

    if (templateRes.status === "fulfilled" && templateRes.value.ok) {
        const json = await templateRes.value.json();
        const tmpl = json?.data ?? json;
        if (tmpl?.title) title = interpolateTemplate(tmpl.title, vars);
        if (tmpl?.description) metaDescription = interpolateTemplate(tmpl.description, vars);
        if (tmpl?.og_image_alt) ogImageAlt = interpolateTemplate(tmpl.og_image_alt, vars);
    }

    const metadata: Metadata = { title, description: metaDescription };

    if (image) {
        const ogImage = ogImageAlt ? { url: image, alt: ogImageAlt } : { url: image };
        metadata.openGraph = { title, description: metaDescription, images: [ogImage] };
        metadata.twitter = {
            card: "summary_large_image",
            title,
            description: metaDescription,
            images: [image],
        };
    }

    return metadata;
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
