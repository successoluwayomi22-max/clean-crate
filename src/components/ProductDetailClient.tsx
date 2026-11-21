"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, MapPin, Minus, Plus, ShieldCheck } from "lucide-react";
import type { ProductWithVariants } from "@/db/queries";
import { useCart } from "@/components/CartContext";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

export function ProductDetailClient({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [customNote, setCustomNote] = useState("");
  const [added, setAdded] = useState(false);

  const variant = product.variants[0];
  if (!variant) return null;

  function handleAdd() {
    if (!variant) return;
    addItem(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        productName: product.name,
        variantLabel: customNote.trim()
          ? `Note: ${customNote.trim()}`
          : "Pack Size & Quantity Discussed on WhatsApp",
        unitPriceNgn: 0,
        imagePath: product.image_path,
        maxStock: 99,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  const directWaMessage = [
    `Hello Clean Crate! I would like to order:`,
    `• *Product:* ${product.name}`,
    `• *Quantity / Units:* ${qty}`,
    customNote.trim() ? `• *Preferred Packaging / Note:* ${customNote.trim()}` : null,
    ``,
    `Please share the available package sizes, price, and Abuja / Lokoja delivery or pickup details.`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <Link
        href="/shop"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#b3c0b6] hover:text-[#e0c276]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Pantry Store
      </Link>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-[#121f18]">
            <Image
              src={product.image_path}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-6">
          <span className="inline-block rounded-full border border-[#c9a449]/35 bg-[#123523]/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e0c276]">
            {product.category} · {product.origin}
          </span>

          <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#d7dfd8] sm:text-base">
            {product.description}
          </p>

          <div className="mt-7 rounded-2xl border border-white/10 bg-[#121f18] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e6c97a]">
                  Packaging, Size & Pricing
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  Tailored to your request & discussed directly on WhatsApp
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#123824] px-3 py-1 text-xs font-semibold text-[#7ae0a5]">
                <MapPin className="h-3.5 w-3.5" /> Abuja & Lokoja
              </span>
            </div>

            <div className="mt-5">
              <label
                htmlFor="cc-pack-note"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b3c0b6]"
              >
                Preferred Packaging or Quantity Note (Optional)
              </label>
              <input
                id="cc-pack-note"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Medium jar, family pouch, or bulk crate for Abuja / Lokoja..."
                className="w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#c9a449]"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-[#0d1611] px-2 py-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2 text-[#d7dfd8] hover:text-white"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="tabular-nums min-w-8 text-center text-sm font-semibold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="p-2 text-[#d7dfd8] hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold transition ${
                  added
                    ? "bg-[#2f8f5b] text-white"
                    : "bg-[#c9a449] text-[#0d1611] hover:bg-[#e0c276]"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to Clean Crate
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add to My Crate List
                  </>
                )}
              </button>

              <a
                href={buildWhatsAppUrl(directWaMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f8f5b] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3aa46b] sm:w-auto"
              >
                <WhatsAppSvg className="h-4 w-4" />
                Order Now on WhatsApp ({BRAND.whatsappDisplay})
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#101c15] p-4 text-xs text-[#b3c0b6]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#43aa72]" />
              <div>
                <p className="font-semibold text-white">Storage & Packaging Care</p>
                <p className="mt-1 leading-relaxed">{product.storage_note}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
