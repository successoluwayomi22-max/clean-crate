import type { Metadata } from "next";
import { getCatalogProducts } from "@/db/queries";
import { ShopCatalogClient } from "@/components/ShopCatalogClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Food Essentials & Curated Crates",
  description:
    "Browse Clean Crate stone-free Ijebu Garri, crunchy Kuli-kuli, fermented Iru, washed smoked Ponmo, kiln-dried catfish, and curated pantry boxes across Abuja & Lokoja.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const products = getCatalogProducts();
  const initialCategory = params.category || "all";

  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#f6f3ea]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e0c276]">
            CleanCrate.ng Pantry Storefront · Abuja & Lokoja
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white sm:text-5xl">
            Every essential, thoughtfully packed.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#b3c0b6]">
            Select individual staples or curated crates, add them to your crate list, and message us directly on WhatsApp to customize your package size, price quote, and delivery or pickup in Abuja or Lokoja.
          </p>
        </div>

        <ShopCatalogClient products={products} initialCategory={initialCategory} />
      </div>
    </div>
  );
}
