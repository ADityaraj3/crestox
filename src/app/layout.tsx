import "./globals.css";
import Providers from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import NexttopLoader from "nextjs-toploader";

export const metadata = {
    title: "Crestox",
    description: "Crestox - Fractional Art Ownership",
    icons: {
        icon: "/favicon.ico",
        apple: "/logo.png",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <GoogleAnalytics />
                <NexttopLoader />
                <Providers>
                    <Header />
                    {children}
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
