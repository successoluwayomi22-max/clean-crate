"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import type { BookingReceipt, BookingSlotRow } from "@/db/queries";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl, formatPriceOrQuote, formatSlotDate } from "@/lib/format";

const STEPS = [
  { key: "confirmed", label: "Slot Confirmed", icon: CheckCircle2 },
  { key: "packing", label: "Hygienic Packing", icon: PackageCheck },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "completed", label: "Delivered", icon: ShieldCheck },
] as const;

export function TrackOrderClient({ initialRef = "" }: { initialRef?: string }) {
  const [referenceCode, setReferenceCode] = useState(initialRef);
  const [verifier, setVerifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingReceipt | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<BookingSlotRow[]>([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<number>(0);
  const [managing, setManaging] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionNotice(null);
    setRescheduleOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceCode, verifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBooking(null);
        setError(data.error || "Booking not found.");
        return;
      }
      setBooking(data.booking as BookingReceipt);
    } catch {
      setError("Network error while looking up booking.");
    } finally {
      setLoading(false);
    }
  }

  async function openReschedulePanel() {
    setError(null);
    setActionNotice(null);
    const res = await fetch("/api/bookings/manage");
    if (res.ok) {
      const json = await res.json();
      const slots: BookingSlotRow[] = json.slots || [];
      setAvailableSlots(slots);
      if (slots[0]) setSelectedNewSlotId(slots[0].id);
      setRescheduleOpen(true);
    }
  }

  async function handleReschedule() {
    if (!booking || !selectedNewSlotId) return;
    setManaging(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          referenceCode: booking.referenceCode,
          verifier,
          newSlotId: selectedNewSlotId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to reschedule.");
        return;
      }
      setBooking(data.booking as BookingReceipt);
      setRescheduleOpen(false);
      setActionNotice("Your delivery/pickup window has been updated cleanly.");
    } finally {
      setManaging(false);
    }
  }

  async function handleCancel() {
    if (!booking) return;
    if (!window.confirm(`Cancel booking ${booking.referenceCode} and release your reserved items?`)) {
      return;
    }
    setManaging(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          referenceCode: booking.referenceCode,
          verifier,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to cancel booking.");
        return;
      }
      setBooking(data.booking as BookingReceipt);
      setRescheduleOpen(false);
      setActionNotice("Booking cancelled and reserved stock restored.");
    } finally {
      setManaging(false);
    }
  }

  const activeIdx = booking
    ? Math.max(
        0,
        STEPS.findIndex((s) => s.key === booking.bookingStatus)
      )
    : -1;

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={handleLookup}
        className="rounded-3xl border border-white/10 bg-[#121f18] p-6 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="track-ref" className="block text-xs font-medium text-[#d7dfd8]">
              Booking Reference Code
            </label>
            <input
              id="track-ref"
              required
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. CC-2026-8F4A2B"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm uppercase text-white outline-none focus:border-[#c9a449]"
            />
          </div>

          <div>
            <label htmlFor="track-verify" className="block text-xs font-medium text-[#d7dfd8]">
              Email or Last 4 Phone Digits
            </label>
            <input
              id="track-verify"
              required
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              placeholder="you@example.com or 1436"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/35 bg-red-950/50 px-4 py-2.5 text-xs text-red-200"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#c9a449] px-6 py-2.5 text-xs font-semibold text-[#0d1611] transition hover:bg-[#e0c276] disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" />
          {loading ? "Checking Status..." : "Track Crate Booking"}
        </button>
      </form>

      {booking && (
        <div className="mt-8 rounded-3xl border border-[#c9a449]/30 bg-[#122119] p-6 sm:p-8">
          {actionNotice && (
            <div className="mb-4 rounded-xl border border-[#43aa72]/45 bg-[#123523]/70 px-4 py-2.5 text-xs text-[#a7dfc0]">
              {actionNotice}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#e0c276]">
                {booking.referenceCode}
              </p>
              <h2 className="font-display mt-1 text-3xl font-semibold text-white">
                {booking.bookingStatus === "cancelled"
                  ? "Booking Cancelled"
                  : `${formatSlotDate(booking.slotDate)} · ${booking.slotWindow}`}
              </h2>
            </div>
            <span className="rounded-full border border-white/15 bg-[#0d1611] px-3 py-1 text-xs font-medium capitalize text-[#7ae0a5]">
              WhatsApp Payment: {booking.paymentStatus.replace("_", " ")}
            </span>
          </div>

          {booking.bookingStatus !== "cancelled" && (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx <= activeIdx;
                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border p-3.5 text-center ${
                      done
                        ? "border-[#43aa72]/60 bg-[#153624] text-white"
                        : "border-white/10 bg-[#0d1611] text-[#7c8f81]"
                    }`}
                  >
                    <Icon className={`mx-auto h-5 w-5 ${done ? "text-[#7ae0a5]" : "text-[#7c8f81]"}`} />
                    <p className="mt-2 text-xs font-semibold">{step.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1611] p-4 text-xs">
            <p className="font-semibold text-[#e0c276]">Chosen Goods in Crate</p>
            <ul className="mt-2 space-y-1.5 text-[#d7dfd8]">
              {booking.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span>
                    {item.quantity}× {item.productName} ({item.variantLabel})
                  </span>
                  <span className="tabular-nums shrink-0">{formatPriceOrQuote(item.lineTotalNgn, "Quote")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-2.5 font-semibold text-white">
              <span>Total ({booking.zoneName})</span>
              <span className="tabular-nums text-[#e0c276]">
                {formatPriceOrQuote(booking.totalNgn, "Confirmed on WhatsApp")}
              </span>
            </div>
          </div>

          {booking.bookingStatus === "confirmed" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openReschedulePanel}
                className="inline-flex items-center gap-2 rounded-full border border-[#c9a449]/45 bg-[#123523]/60 px-4 py-2 text-xs font-semibold text-[#e0c276] hover:bg-[#1a4b32]"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Reschedule Time Slot
              </button>
              <button
                type="button"
                disabled={managing}
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-full border border-red-400/35 bg-red-950/35 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/60"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Booking
              </button>
            </div>
          )}

          {rescheduleOpen && (
            <div className="mt-5 rounded-2xl border border-[#c9a449]/35 bg-[#0d1611] p-4">
              <p className="text-xs font-semibold text-white">Select a New Open Window</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <select
                  aria-label="Choose new dispatch slot"
                  value={selectedNewSlotId}
                  onChange={(e) => setSelectedNewSlotId(Number(e.target.value))}
                  className="flex-1 rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-xs text-white"
                >
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatSlotDate(s.slot_date)} · {s.window_label} ({s.remaining} left)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={managing}
                  onClick={handleReschedule}
                  className="rounded-full bg-[#c9a449] px-5 py-2 text-xs font-semibold text-[#0d1611] hover:bg-[#e0c276]"
                >
                  {managing ? "Saving..." : "Confirm New Slot"}
                </button>
              </div>
            </div>
          )}

          <a
            href={buildWhatsAppUrl(
              `Hello Clean Crate, following up on booking ${booking.referenceCode} (${formatSlotDate(
                booking.slotDate
              )} · ${booking.slotWindow}) — Items: ${booking.items
                .map((i) => `${i.quantity}x ${i.productName} (${i.variantLabel})`)
                .join(", ")}. ${
                booking.totalNgn > 0
                  ? `Total: ${formatPriceOrQuote(booking.totalNgn)}.`
                  : "Quote confirmed via WhatsApp."
              }`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#7ae0a5] hover:underline"
          >
            <WhatsAppSvg className="h-4 w-4" />
            Send / Pay This Booking on WhatsApp ({BRAND.whatsappDisplay})
          </a>
        </div>
      )}
    </div>
  );
}
