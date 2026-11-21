import { getCatalogProducts } from "@/db/queries";
import { HomeCatalogPreview } from "@/components/HomeCatalogPreview";
import { ScrollFrameStage } from "@/components/ScrollFrameStage";
import { BRAND } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const products = getCatalogProducts();
  const featured = products.filter((p) => p.is_featured === 1);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleancrate.ng";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    name: BRAND.name,
    description: BRAND.tagline,
    url: siteUrl,
    telephone: "+2349028421436",
    email: BRAND.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Abuja & Lokoja",
      addressCountry: "NG",
    },
    areaServed: ["Abuja", "Lokoja"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ScrollFrameStage featuredProducts={featured} />
      <HomeCatalogPreview products={featured} />
    </>
  );
}
