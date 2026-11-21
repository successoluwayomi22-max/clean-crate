"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { WhatsAppSvg } from "@/components/Navbar";
import { buildWhatsAppUrl } from "@/lib/format";

export function CartDrawer() {
  const { items, isDrawerOpen, updateQty, removeItem, closeDrawer } = useCart();
  const [selectedState, setSelectedState] = useState<"Abuja" | "Lokoja">("Abuja");
  const [customNote, setCustomNote] = useState("");

  if (!isDrawerOpen) return null;

  const quickWhatsAppText = [
    `*CLEAN CRATE ORDER INQUIRY (${selectedState})*`,
    "",
    "Hello Clean Crate! I would like to order these food essentials:",
    "",
    ...items.map((i, idx) => `${idx + 1}. *${i.productName}* (Units: ${i.quantity})`),
    "",
    `*State / Location:* ${selectedState}`,
    customNote.trim() ? `*Packaging / Delivery Note:* ${customNote.trim()}` : null,
    "",
    "Please let me know the available package sizes, price quote, and delivery or pickup arrangement.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={closeDrawer}
        aria-hidden="true"
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
      />

      <aside
        aria-label="Your Clean Crate"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#cfa84c]/25 bg-[#0f1a14] text-[#f7f4ec] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e6c97a]">
              Your Selection
            </p>
            <h2 className="font-display text-2xl font-semibold text-white">
              Clean Crate Basket
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close basket"
            className="rounded-lg border border-white/10 p-2 text-[#b4c3b8] transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#cfa84c]/30 bg-[#123824]/50 text-[#e6c97a]">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="font-display text-xl text-white">Your crate list is empty</p>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#b4c3b8]">
                Add stone-free Ijebu Garri, roasted Kuli-kuli, hygienic Iru, Ponmo, or Kiln-Dried Fish, then message us on WhatsApp to finalize your pack size and Abuja or Lokoja delivery.
              </p>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#cfa84c] px-5 py-2.5 text-xs font-semibold text-[#0b130e] transition hover:bg-[#e6c97a]"
              >
                Browse Food Essentials
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-3.5">
                {items.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex gap-3.5 rounded-2xl border border-white/10 bg-[#14211a] p-3.5"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b130e]">
                      <Image
                        src={item.imagePath}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/shop/${item.slug}`}
                            onClick={closeDrawer}
                            className="text-sm font-semibold text-white hover:text-[#e6c97a]"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-[11px] text-[#b4c3b8]">
                            Pack size & price discussed on WhatsApp
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={`Remove ${item.productName}`}
                          className="rounded p-1 text-[#8da092] transition hover:bg-white/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-white/15 bg-[#0b130e]">
                          <button
                            type="button"
                            onClick={() => updateQty(item.variantId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1.5 text-[#d7dfd8] hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="tabular-nums min-w-7 text-center text-xs font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.variantId, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-1.5 text-[#d7dfd8] hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-[11px] font-semibold text-[#e6c97a]">
                          WhatsApp Quote
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-white/10 bg-[#121e17] p-4 space-y-3">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#e6c97a]">
                    Your State
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(["Abuja", "Lokoja"] as const).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setSelectedState(loc)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
                          selectedState === loc
                            ? "border-[#cfa84c] bg-[#cfa84c]/20 text-[#e6c97a]"
                            : "border-white/15 bg-[#0b130e] text-[#b4c3b8]"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="cc-drawer-note" className="block text-[11px] font-medium text-[#d7dfd8]">
                    Pack Size / Delivery / Pickup Note (Optional)
                  </label>
                  <input
                    id="cc-drawer-note"
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Desired size or quantity, delivery or pickup..."
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b130e] px-3 py-2 text-xs text-white outline-none focus:border-[#cfa84c]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 bg-[#0b130e] px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b4c3b8]">Size, Delivery & Pickup</span>
              <span className="font-semibold text-[#e6c97a]">
                Finalized on WhatsApp ({selectedState})
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8da092]">
              Your selected items will open directly in WhatsApp so you can discuss your exact package size, current pricing, and delivery or pickup in Abuja or Lokoja.
            </p>
            <div className="mt-4">
              <a
                href={buildWhatsAppUrl(quickWhatsAppText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f8f5b] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg transition hover:bg-[#3aa46b]"
              >
                <WhatsAppSvg className="h-4 w-4" />
                Send Items & Discuss on WhatsApp
              </a>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
