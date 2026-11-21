import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { BRAND } from "@/lib/format";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing Clean Crate food crate orders, scheduled delivery slots, and pickup reservations.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Customer Agreement"
      title="Terms of Service"
      updatedAt="November 2026"
    >
      <p>
        By placing a reservation or purchasing food essentials through Clean Crate, you agree to these clear terms of service.
      </p>

      <h2>1. Crate Reservations & Market Quotes</h2>
      <p>
        Because agricultural staple prices move with market harvests, Clean Crate currently confirms final item pricing and dispatch quotes directly on WhatsApp ({BRAND.whatsappDisplay}) once your crate and slot are booked.
      </p>

      <h2>2. Lokoja & Abuja Delivery Windows & Pickup</h2>
      <p>
        Booked delivery slots cover a scheduled dispatch window across Lokoja and Abuja. Please ensure someone is reachable on your provided phone/WhatsApp number during your chosen window. Unclaimed self-pickup crates at {BRAND.pickupHub} are held safely for up to 24 hours before rescheduling.
      </p>

      <h2>3. Bulk & Diaspora Custom Crates</h2>
      <p>
        Large event, catering, or export-ready vacuum packaging orders confirmed via WhatsApp follow the agreed batch timeline and invoice terms shared prior to sealing.
      </p>
    </LegalLayout>
  );
}

