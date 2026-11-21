"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { ProductWithVariants } from "@/db/queries";
import { useCart } from "@/components/CartContext";
import { WhatsAppSvg } from "@/components/Navbar";
import { buildWhatsAppUrl } from "@/lib/format";

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const primaryVariant = product.variants[0];
  if (!primaryVariant) return null;

  function handleAdd() {
    if (!primaryVariant) return;
    addItem({
      variantId: primaryVariant.id,
      productId: product.id,
      slug: product.slug,
      productName: product.name,
      variantLabel: "Size & Packaging Discussed on WhatsApp",
      unitPriceNgn: 0,
      imagePath: product.image_path,
      maxStock: 99,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const directWaHref = buildWhatsAppUrl(
    `Hello Clean Crate! I would like to order *${product.name}*. Let's discuss the package size, price, and delivery/pickup in Abuja or Lokoja.`
  );

  return (
    <article className="cc-card group flex flex-col overflow-hidden rounded-2xl">
      <Link
        href={`/shop/${product.slug}`}
        className="relative aspect-[4/3] overflow-hidden bg-[#0d1611]"
      >
        <Image
          src={product.image_path}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d1611]/90 to-transparent" />
        <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
          <span className="rounded-full border border-white/20 bg-[#0d1611]/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#e0c276] backdrop-blur-md">
            {product.category}
          </span>
          {product.category === "crates" && (
            <span className="inline-flex items-center rounded-full bg-[#2f8f5b]/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
              Curated Bundle
            </span>
          )}
        </div>
        <span className="absolute bottom-3 left-3.5 text-[11px] font-medium text-[#d7dfd8]">
          {product.origin}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-display text-2xl font-semibold leading-tight text-white transition group-hover:text-[#e0c276]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#b3c0b6]">
          {product.tagline}
        </p>

        <div className="mt-4 mb-5 rounded-xl border border-white/10 bg-[#0d1611]/70 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e6c97a]">
            Flexible Clean Packaging
          </p>
          <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
            Pack size, quantity, and delivery/pickup in Abuja or Lokoja are finalized directly on WhatsApp.
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
          <a
            href={directWaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2f8f5b]/55 bg-[#123824]/75 px-3.5 py-2 text-xs font-semibold text-[#e8e5dc] transition hover:border-[#43b578] hover:bg-[#1a4f33]"
          >
            <WhatsAppSvg className="h-3.5 w-3.5 text-[#43b578]" />
            <span>Inquire</span>
          </a>

          <button
            type="button"
            onClick={handleAdd}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              justAdded
                ? "bg-[#2f8f5b] text-white"
                : "bg-[#c9a449] text-[#0d1611] hover:bg-[#e0c276]"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" /> Added to Crate
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add to Crate
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
