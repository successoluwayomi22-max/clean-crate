"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  LockKeyhole,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import type {
  BookingReceipt,
  BookingSlotRow,
  DeliveryZoneRow,
  ProductWithVariants,
} from "@/db/queries";
import { useCart } from "@/components/CartContext";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl, formatPriceOrQuote, formatSlotDate } from "@/lib/format";

function buildReceiptWhatsAppText(receipt: BookingReceipt): string {
  const lines = [
    `*NEW CLEAN CRATE BOOKING — ${receipt.referenceCode}*`,
    "",
    `*Customer:* ${receipt.customerName}`,
    `*Phone:* ${receipt.customerPhone}`,
    `*Email:* ${receipt.customerEmail}`,
    "",
    `*Fulfillment:* ${receipt.fulfillmentType === "pickup" ? "Self-Pickup (Lokoja / Abuja Hub)" : "Doorstep Delivery"}`,
    `*Zone:* ${receipt.zoneName}`,
    `*Address:* ${receipt.deliveryAddress}`,
    `*Booked Slot:* ${formatSlotDate(receipt.slotDate)} · ${receipt.slotWindow}`,
  ];

  if (receipt.deliveryNotes) {
    lines.push(`*Note:* ${receipt.deliveryNotes}`);
  }

  lines.push("", "*Chosen Goods:*");
  receipt.items.forEach((item, idx) => {
    lines.push(
      item.lineTotalNgn > 0
        ? `${idx + 1}. ${item.quantity}x ${item.productName} (${item.variantLabel}) — ${formatPriceOrQuote(
            item.lineTotalNgn
          )}`
        : `${idx + 1}. ${item.quantity}x ${item.productName} (${item.variantLabel})`
    );
  });

  if (receipt.totalNgn > 0) {
    lines.push(
      "",
      `*Items Subtotal:* ${formatPriceOrQuote(receipt.subtotalNgn)}`,
      `*Delivery Fee:* ${receipt.deliveryFeeNgn === 0 ? "Free Pickup" : formatPriceOrQuote(receipt.deliveryFeeNgn)}`,
      `*TOTAL TO PAY ON WHATSAPP:* ${formatPriceOrQuote(receipt.totalNgn)}`,
      "",
      "Please send payment details so I can confirm this slot."
    );
  } else {
    lines.push(
      "",
      `*Pricing & Dispatch:* Current market quote to be confirmed directly on WhatsApp.`,
      "Please send today's itemized quote and payment details for this booked slot."
    );
  }

  return lines.join("\n");
}

export function BookingPageClient({
  products,
  zones,
  slots,
}: {
  products: ProductWithVariants[];
  zones: DeliveryZoneRow[];
  slots: BookingSlotRow[];
}) {
  const { items, subtotalNgn, addItem, updateQty, removeItem, clearCart } = useCart();

  const deliveryZones = useMemo(() => zones.filter((z) => z.is_pickup === 0), [zones]);
  const pickupZones = useMemo(() => zones.filter((z) => z.is_pickup === 1), [zones]);

  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">("delivery");
  const [selectedZoneId, setSelectedZoneId] = useState<number>(
    deliveryZones[0]?.id ?? zones[0]?.id ?? 0
  );

  const groupedSlots = useMemo(() => {
    const map = new Map<string, BookingSlotRow[]>();
    for (const s of slots) {
      const list = map.get(s.slot_date) ?? [];
      list.push(s);
      map.set(s.slot_date, list);
    }
    return Array.from(map.entries()).slice(0, 10);
  }, [slots]);

  const [activeDateIso, setActiveDateIso] = useState<string>(groupedSlots[0]?.[0] ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState<number>(
    slots.find((s) => s.remaining > 0)?.id ?? 0
  );
  const [showQuickCatalog, setShowQuickCatalog] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [quickVariantByProduct, setQuickVariantByProduct] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const activeZonesList = fulfillmentMode === "pickup" ? pickupZones : deliveryZones;
  const selectedZone =
    activeZonesList.find((z) => z.id === selectedZoneId) ?? activeZonesList[0] ?? zones[0];
  const isPickup = selectedZone?.is_pickup === 1;
  const deliveryFeeNgn = isPickup ? 0 : selectedZone?.fee_ngn ?? 0;
  const totalNgn = subtotalNgn + deliveryFeeNgn;

  const activeDaySlots = useMemo(
    () => groupedSlots.find(([d]) => d === activeDateIso)?.[1] ?? groupedSlots[0]?.[1] ?? [],
    [groupedSlots, activeDateIso]
  );

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  function handleModeSwitch(mode: "delivery" | "pickup") {
    setFulfillmentMode(mode);
    const list = mode === "pickup" ? pickupZones : deliveryZones;
    if (list[0]) {
      setSelectedZoneId(list[0].id);
    }
  }

  function handleDateSelect(dateIso: string, daySlots: BookingSlotRow[]) {
    setActiveDateIso(dateIso);
    if (!daySlots.some((s) => s.id === selectedSlotId)) {
      const firstOpen = daySlots.find((s) => s.remaining > 0);
      if (firstOpen) setSelectedSlotId(firstOpen.id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg("Please add at least one Clean Crate item before confirming a slot.");
      return;
    }
    if (!selectedZone || !selectedSlotId) {
      setErrorMsg("Please select a delivery zone and an open time slot.");
      return;
    }
    if (!isPickup && deliveryAddress.trim().length < 6) {
      setErrorMsg("Please enter your complete street delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          deliveryAddress: isPickup ? `${selectedZone.name}` : deliveryAddress,
          deliveryNotes,
          zoneId: selectedZone.id,
          slotId: selectedSlotId,
          paymentMethod: "whatsapp",
          idempotencyKey,
          website: honeypotWebsite,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not reserve this slot. Please try again.");
        return;
      }
      setReceipt(data.booking as BookingReceipt);
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        setIdempotencyKey(crypto.randomUUID());
      }
      clearCart();
    } catch {
      setErrorMsg("Network error while confirming your booking. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    const waText = buildReceiptWhatsAppText(receipt);
    const waHref = buildWhatsAppUrl(waText);

    async function handleCopy() {
      try {
        await navigator.clipboard.writeText(waText);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 1800);
      } catch {
        // ignore clipboard unavailability
      }
    }

    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#c9a449]/40 bg-[#122119] p-6 sm:p-10">
        <div className="flex items-center gap-3 text-[#43aa72]">
          <CheckCircle2 className="h-7 w-7" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Slot Locked · Complete Payment on WhatsApp
          </span>
        </div>

        <h1 className="font-display mt-3 text-4xl font-semibold text-white">
          Booking Reference: {receipt.referenceCode}
        </h1>
        <p className="mt-2 text-sm text-[#d7dfd8]">
          Your goods and dispatch slot are now reserved in our system. Click the green button below to open WhatsApp with every chosen item, weight, address, and slot pre-filled so you can finalize payment directly with Clean Crate.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-full bg-[#2f8f5b] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg transition hover:bg-[#3aa46b] sm:flex-none"
          >
            <WhatsAppSvg className="h-4 w-4" />
            Send Booking & Pay on WhatsApp ({BRAND.whatsappDisplay})
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            {copiedText ? <Check className="h-4 w-4 text-[#43aa72]" /> : <Copy className="h-4 w-4" />}
            {copiedText ? "Copied Summary" : "Copy Order Text"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-[#0d1611] p-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8da092]">Booked Window</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatSlotDate(receipt.slotDate)} · {receipt.slotWindow}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8da092]">Zone & Address</p>
            <p className="mt-1 text-sm font-semibold text-white">{receipt.zoneName}</p>
            <p className="text-xs text-[#b3c0b6]">{receipt.deliveryAddress}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1611] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e0c276]">
            Chosen Goods Locked in This Booking
          </h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {receipt.items.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-3 py-2.5">
                <span>
                  {item.quantity}× {item.productName}{" "}
                  <span className="text-xs text-[#8da092]">({item.variantLabel})</span>
                </span>
                <span className="tabular-nums shrink-0 font-medium text-white">
                  {formatPriceOrQuote(item.lineTotalNgn, "Market Quote")}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-[#b3c0b6]">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatPriceOrQuote(receipt.subtotalNgn, "Quoted on WhatsApp")}
              </span>
            </div>
            <div className="flex justify-between text-[#b3c0b6]">
              <span>Delivery Fee</span>
              <span className="tabular-nums">
                {receipt.fulfillmentType === "pickup"
                  ? "Free Pickup"
                  : formatPriceOrQuote(receipt.deliveryFeeNgn, "Quoted on WhatsApp")}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold text-[#e0c276]">
              <span>Payment via WhatsApp</span>
              <span className="tabular-nums">
                {formatPriceOrQuote(receipt.totalNgn, "Confirmed on WhatsApp")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#2f8f5b]/35 bg-[#0a140f] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7ae0a5]">
            WhatsApp Message Preview
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#d7dfd8]">
            {waText}
          </pre>
        </div>

        <div className="mt-6">
          <Link
            href={`/track?ref=${encodeURIComponent(receipt.referenceCode)}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#c9a449]/40 px-5 py-2.5 text-xs font-semibold text-[#e0c276] hover:bg-white/5"
          >
            Track This Booking <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <form onSubmit={handleSubmit} className="space-y-8 lg:col-span-8">
        {/* Step 1: Build & Adjust Crate */}
        <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0c276]">
                Step 01
              </span>
              <h2 className="font-display text-2xl font-semibold text-white">
                Chosen Goods in Your Crate
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickCatalog((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a449]/45 bg-[#123523]/70 px-3.5 py-1.5 text-xs font-semibold text-[#e0c276] transition hover:bg-[#1a4b32]"
            >
              <Plus className="h-3.5 w-3.5" />
              {showQuickCatalog ? "Hide Quick-Add" : "Add More Items"}
            </button>
          </div>

          {items.length > 0 && (
            <ul className="mt-4 divide-y divide-white/10">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0d1611]">
                      <Image
                        src={item.imagePath}
                        alt={item.productName}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-white">{item.productName}</span>
                      <span className="text-xs text-[#b3c0b6]">
                        {item.variantLabel} · {formatPriceOrQuote(item.unitPriceNgn, "Quote on WhatsApp")}
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    <div className="inline-flex items-center rounded-full border border-white/15 bg-[#0d1611]">
                      <button
                        type="button"
                        onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        aria-label={`Decrease ${item.productName}`}
                        className="p-1.5 text-[#d7dfd8] hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="tabular-nums min-w-6 text-center text-xs font-semibold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        aria-label={`Increase ${item.productName}`}
                        className="p-1.5 text-[#d7dfd8] hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="tabular-nums min-w-20 text-right font-semibold text-[#e0c276]">
                      {formatPriceOrQuote(item.unitPriceNgn * item.quantity, "WhatsApp Quote")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      aria-label={`Remove ${item.productName}`}
                      className="rounded p-1 text-[#8da092] hover:bg-white/10 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(items.length === 0 || showQuickCatalog) && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#c9a449]/35 bg-[#0d1611]/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e0c276]">
                {items.length === 0 ? "Select Essentials to Start Booking" : "Quick-Add Food Essentials"}
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {products.map((p) => {
                  const chosenVariantId = quickVariantByProduct[p.id] ?? p.variants[0]?.id;
                  const v = p.variants.find((item) => item.id === chosenVariantId) ?? p.variants[0];
                  if (!v) return null;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between gap-2.5 rounded-xl border border-white/10 bg-[#14231b] p-3"
                    >
                      <div>
                        <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                        <p className="tabular-nums text-[11px] text-[#e0c276]">
                          {formatPriceOrQuote(v.price_ngn, "Quote on WhatsApp")} · {v.stock_qty} ready
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Select pack size for ${p.name}`}
                          value={v.id}
                          onChange={(e) =>
                            setQuickVariantByProduct((prev) => ({
                              ...prev,
                              [p.id]: Number(e.target.value),
                            }))
                          }
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0d1611] px-2 py-1 text-[11px] text-white outline-none focus:border-[#c9a449]"
                        >
                          {p.variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.label}
                              {variant.price_ngn > 0 ? ` (${formatPriceOrQuote(variant.price_ngn)})` : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={v.stock_qty <= 0}
                          onClick={() =>
                            addItem({
                              variantId: v.id,
                              productId: p.id,
                              slug: p.slug,
                              productName: p.name,
                              variantLabel: v.label,
                              unitPriceNgn: v.price_ngn,
                              imagePath: p.image_path,
                              maxStock: v.stock_qty,
                            })
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#c9a449] px-3 py-1.5 text-[11px] font-semibold text-[#0d1611] transition hover:bg-[#e0c276] disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Fulfillment Mode & Zone */}
        <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0c276]">
            Step 02
          </span>
          <h2 className="font-display text-2xl font-semibold text-white">
            Delivery Zone or Self-Pickup
          </h2>

          <div className="mt-4 inline-flex max-w-full flex-wrap rounded-2xl border border-white/15 bg-[#0d1611] p-1 sm:rounded-full">
            <button
              type="button"
              onClick={() => handleModeSwitch("delivery")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                fulfillmentMode === "delivery"
                  ? "bg-[#c9a449] text-[#0d1611]"
                  : "text-[#d7dfd8] hover:text-white"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              Doorstep Delivery
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("pickup")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                fulfillmentMode === "pickup"
                  ? "bg-[#c9a449] text-[#0d1611]"
                  : "text-[#d7dfd8] hover:text-white"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Lokoja / Abuja Pickup (Free)
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {activeZonesList.map((zone) => {
              const active = zone.id === selectedZone?.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[#c9a449] bg-[#173625]"
                      : "border-white/10 bg-[#0d1611] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{zone.name}</span>
                    <span className="tabular-nums shrink-0 text-xs font-bold text-[#e0c276]">
                      {zone.is_pickup ? "Free" : formatPriceOrQuote(zone.fee_ngn, "WhatsApp Quote")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8da092]">{zone.eta_window}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 3: Clean Date Strip + Time Window Selector */}
        <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0c276]">
                Step 03
              </span>
              <h2 className="font-display text-2xl font-semibold text-white">
                Select Date & Dispatch Window
              </h2>
            </div>
            <CalendarDays className="h-5 w-5 text-[#43aa72]" />
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
            {groupedSlots.map(([dateIso, daySlots]) => {
              const totalRemaining = daySlots.reduce((sum, s) => sum + s.remaining, 0);
              const active = dateIso === activeDateIso;
              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => handleDateSelect(dateIso, daySlots)}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left transition ${
                    active
                      ? "border-[#c9a449] bg-[#173625] text-white"
                      : "border-white/10 bg-[#0d1611] text-[#d7dfd8] hover:border-white/25"
                  }`}
                >
                  <span className="block text-xs font-semibold">{formatSlotDate(dateIso)}</span>
                  <span className="tabular-nums mt-0.5 block text-[10px] text-[#7ae0a5]">
                    {totalRemaining} slots open
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {activeDaySlots.map((slot) => {
              const soldOut = slot.remaining <= 0;
              const active = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    soldOut
                      ? "cursor-not-allowed border-white/5 bg-white/5 opacity-45"
                      : active
                      ? "border-[#c9a449] bg-[#173625] text-white"
                      : "border-white/10 bg-[#0d1611] text-[#d7dfd8] hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5 text-[#43aa72]" />
                    {slot.window_label}
                  </div>
                  <span className="tabular-nums mt-1 block text-[11px] text-[#8da092]">
                    {soldOut ? "Fully booked" : `${slot.remaining} of ${slot.max_capacity} open`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 4: Contact & WhatsApp-Only Payment */}
        <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e0c276]">
            Step 04
          </span>
          <h2 className="font-display text-2xl font-semibold text-white">
            Contact & WhatsApp Confirmation
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cc-name" className="block text-xs font-medium text-[#d7dfd8]">
                Full Name *
              </label>
              <input
                id="cc-name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Tunde Adebayo"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
              />
            </div>

            <div>
              <label htmlFor="cc-phone" className="block text-xs font-medium text-[#d7dfd8]">
                WhatsApp / Phone Number *
              </label>
              <input
                id="cc-phone"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +234 803 000 0000"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="cc-email" className="block text-xs font-medium text-[#d7dfd8]">
                Email Address (used for booking tracking) *
              </label>
              <input
                id="cc-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
              />
            </div>

            {!isPickup ? (
              <div className="sm:col-span-2">
                <label htmlFor="cc-address" className="block text-xs font-medium text-[#d7dfd8]">
                  Street Delivery Address *
                </label>
                <input
                  id="cc-address"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House number, street, estate / landmark"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
                />
              </div>
            ) : (
              <div className="sm:col-span-2 rounded-2xl border border-[#2f8f5b]/40 bg-[#123523]/40 p-4 text-xs text-[#d7dfd8]">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <MapPin className="h-4 w-4 text-[#43aa72]" />
                  Pickup Studio: {BRAND.pickupHub}
                </div>
                <p className="mt-1 text-[#b3c0b6]">
                  Your sealed crate will be tagged with your reference code inside your chosen window.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="cc-notes" className="block text-xs font-medium text-[#d7dfd8]">
                Delivery or Packing Note (Optional)
              </label>
              <input
                id="cc-notes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Call gate security on arrival, or pack gift ribbon"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
              />
            </div>

            {/* Anti-bot honeypot field hidden from human visitors */}
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="cc-website">Leave empty</label>
              <input
                id="cc-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotWebsite}
                onChange={(e) => setHoneypotWebsite(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#2f8f5b]/45 bg-[#123523]/55 p-4">
            <div className="flex items-center gap-2.5 text-white">
              <WhatsAppSvg className="h-5 w-5 text-[#43aa72]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7ae0a5]">
                  Payment Method: WhatsApp Direct ({BRAND.whatsappDisplay})
                </p>
                <p className="mt-0.5 text-xs text-[#d7dfd8]">
                  After reserving your slot below, your complete list of chosen goods, booked slot, and total will load straight into WhatsApp so you can pay and confirm directly with Clean Crate.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-400/40 bg-red-950/50 px-4 py-3 text-xs text-red-200"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a449] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#0d1611] transition hover:bg-[#e0c276] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-4 w-4" />
            {submitting
              ? "Locking Your Slot..."
              : totalNgn > 0
              ? `Reserve Slot & Prepare WhatsApp Order · ${formatPriceOrQuote(totalNgn)}`
              : "Reserve Slot & Get Quote on WhatsApp"}
          </button>
        </section>
      </form>

      {/* Sticky Live Booking & WhatsApp Summary */}
      <aside className="lg:col-span-4">
        <div className="sticky top-24 space-y-4 rounded-3xl border border-[#c9a449]/30 bg-[#121f18] p-6">
          <h3 className="font-display text-2xl font-semibold text-white">Crate Booking Summary</h3>

          {items.length > 0 && (
            <ul className="max-h-52 space-y-2 overflow-y-auto border-b border-white/10 pb-3 text-xs">
              {items.map((item) => (
                <li key={item.variantId} className="flex justify-between gap-2 text-[#d7dfd8]">
                  <span className="truncate">
                    {item.quantity}× {item.productName} ({item.variantLabel})
                  </span>
                  <span className="tabular-nums shrink-0 font-medium text-white">
                    {formatPriceOrQuote(item.unitPriceNgn * item.quantity, "Quote")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-b border-white/10 pb-4 text-xs">
            <div className="flex justify-between text-[#b3c0b6]">
              <span>Slot Selected</span>
              <span className="font-medium text-white">
                {selectedSlot
                  ? `${formatSlotDate(selectedSlot.slot_date)} · ${selectedSlot.window_label}`
                  : "Pick a slot"}
              </span>
            </div>
            <div className="flex justify-between text-[#b3c0b6]">
              <span>Crate Subtotal</span>
              <span className="tabular-nums font-medium text-white">
                {formatPriceOrQuote(subtotalNgn, "Quote on WhatsApp")}
              </span>
            </div>
            <div className="flex justify-between text-[#b3c0b6]">
              <span>Dispatch Fee</span>
              <span className="tabular-nums font-medium text-white">
                {isPickup ? "Free Pickup" : formatPriceOrQuote(deliveryFeeNgn, "Quote on WhatsApp")}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-[#d7dfd8]">Payment</span>
            <span className="tabular-nums text-lg font-semibold text-[#e0c276]">
              {totalNgn > 0 ? formatPriceOrQuote(totalNgn) : "Confirmed on WhatsApp"}
            </span>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-[#0d1611] p-4 text-[11px] leading-relaxed text-[#b3c0b6]">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#43aa72]" />
            <span>
              Stock, delivery fees, and time-slot caps are verified inside an atomic server transaction before generating your WhatsApp order slip.
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
