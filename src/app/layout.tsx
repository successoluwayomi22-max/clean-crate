import type { Metadata } from "next";
import localFont from "next/font/local";
import { CartProvider } from "@/components/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieBanner } from "@/components/CookieBanner";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { Footer } from "@/components/Footer";
import GlowCursor from "@/components/GlowCursor";
import { Navbar } from "@/components/Navbar";
import SwarmCursor from "@/components/SwarmCursor";
import { BRAND } from "@/lib/format";
import "./globals.css";

const displayFont = localFont({
  src: "./fonts/cormorant-garamond.woff2",
  weight: "500 700",
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const sansFont = localFont({
  src: "./fonts/plus-jakarta-sans.woff2",
  weight: "400 700",
  variable: "--font-sans",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleancrate.ng";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Clean Crate — Quality Food Essentials & Scheduled Crate Booking",
    template: "%s | Clean Crate",
  },
  description:
    "At Clean Crate, we are committed to bringing you quality food essentials, thoughtfully sourced and neatly packaged. Book fresh crates in Lokoja & Abuja via WhatsApp.",
  keywords: [
    "Clean Crate",
    "Lokoja food essentials",
    "Abuja food delivery",
    "Ijebu Garri",
    "Kuli-kuli",
    "Iru locust beans",
    "Smoked Ponmo",
    "Kiln-dried catfish",
    "Clean Crate booking",
  ],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: "Clean Crate — Thoughtfully Sourced Nigerian Food Essentials",
    description: BRAND.tagline,
    url: siteUrl,
    images: [
      {
        url: "/images/products/signature-crate.webp",
        width: 1200,
        height: 900,
        alt: "Clean Crate thoughtfully packaged Nigerian food essentials crate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clean Crate — Food Essentials & Crate Booking",
    description: BRAND.tagline,
    images: ["/images/products/signature-crate.webp"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="min-h-screen bg-[#0b130e] text-[#f7f4ec] antialiased selection:bg-[#cfa84c]/30 selection:text-white">
        <div aria-hidden="true" className="cc-light-beam" />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          <GlowCursor
            color="#e6c97a"
            secondaryColor="#2f8f5b"
            intensity={1.3}
            trailWidth={3}
            linger={1.4}
            glow={1.2}
            quality="medium"
            maxDevicePixelRatio={1.25}
            clickBurst
            scrollSpark
            theme="dark"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          <SwarmCursor
            count={320}
            size={2.5}
            color="#e6c97a"
            accentColor="#43b578"
            spread={90}
            swirl={0.6}
            dpr={1.25}
            clickEffect="burst"
          />
        </div>
        <CartProvider>
          <Navbar />
          <CartDrawer />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <FloatingWhatsApp />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  );
}

