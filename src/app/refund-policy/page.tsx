import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { BRAND } from "@/lib/format";

export const metadata: Metadata = {
  title: "Refund & Perishables Policy",
  description: "Clean Crate freshness guarantee, sealed food return rules, and slot rescheduling policy.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Quality & Hygiene Guarantee"
      title="Refund & Perishables Policy"
      updatedAt="November 2026"
    >
      <p>
        Because Clean Crate handles packaged food essentials — including Garri, Kuli-kuli, fermented Iru, smoked Ponmo, and kiln-dried catfish — hygiene and tamper-evident safety guide every replacement or refund.
      </p>

      <h2>1. Eligible Replacement or Refund Cases</h2>
      <ul>
        <li>An item arrives with a broken tamper-evident seal or damaged vacuum pouch.</li>
        <li>You received the wrong pack weight, item, or incomplete crate compared to your booking summary.</li>
        <li>Quality falls visibly below Clean Crate&apos;s stone-free, moisture-safe standard at inspection.</li>
      </ul>

      <h2>2. Inspection & Reporting Window</h2>
      <p>
        Please inspect your crate upon arrival and send clear photos along with your booking reference (<code>CC-...</code>) within <strong>24 hours of delivery</strong> via WhatsApp at {BRAND.whatsappDisplay} or {BRAND.email}. For temperature-sensitive items like washed Ponmo and Iru, keep items refrigerated while we arrange an express swap or refund.
      </p>

      <h2>3. Non-Returnable Opened Food</h2>
      <p>
        Once a food pouch or jar seal has been opened after clean delivery, we cannot accept physical returns for health and food-safety reasons unless a hidden defect is documented within the 24-hour window.
      </p>

      <h2>4. Rescheduling & Cancellations</h2>
      <p>
        Need to move your delivery window? Notify us at least <strong>4 hours before your booked slot</strong> to shift to another open window at zero extra fee. Confirmed orders cancelled prior to packing receive a full refund within 2–3 business days.
      </p>
    </LegalLayout>
  );
}

