import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogProducts, getProductBySlug } from "@/db/queries";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailClient } from "@/components/ProductDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return { title: "Product Not Found" };
  }
  return {
    title: product.name,
    description: product.tagline,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      title: `${product.name} | Clean Crate`,
      description: product.tagline,
      images: [{ url: product.image_path, width: 1200, height: 900, alt: product.name }],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const allProducts = getCatalogProducts();
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);
  const minPrice = Math.min(...product.variants.map((v) => v.price_ngn));
  const maxPrice = Math.max(...product.variants.map((v) => v.price_ngn));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleancrate.ng";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${siteUrl}${product.image_path}`,
    brand: { "@type": "Brand", name: "Clean Crate" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      ...(minPrice > 0 ? { price: minPrice } : {}),
      availability: product.variants.some((v) => v.stock_qty > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#f6f3ea]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProductDetailClient product={product} />

        {related.length > 0 && (
          <section className="mt-20 border-t border-white/10 pt-14">
            <h2 className="font-display text-3xl font-semibold text-white">
              Pair nicely with your crate
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

