import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { BRAND } from "@/lib/format";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Clean Crate collects, safeguards, and retains personal booking and delivery data.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Data Governance & NDPA Alignment"
      title="Privacy Policy"
      updatedAt="November 2026"
    >
      <p>
        Clean Crate respects your privacy and handles personal information strictly in line with the Nigeria Data Protection Act (NDPA) and modern security standards.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Contact and identity details provided during booking: full name, email address, and WhatsApp/phone number.</li>
        <li>Delivery details: street address, dispatch zone, pickup preference, and optional gate instructions.</li>
        <li>Order & slot records: items selected, pack sizes, timestamps, and booking reference codes.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>
        We use your details solely to verify your booking slot, prepare and seal your food crate, coordinate courier dispatch or Lokoja/Abuja hub pickup, verify payments, and answer support requests. We never sell or rent customer lists to third-party marketers.
      </p>

      <h2>3. Security Safeguards</h2>
      <p>
        All booking submissions pass through strict input validation, server-side pricing checks, rate limiting, and encrypted transport. Order lookup on the public tracker requires both your reference code and your matching email or last four phone digits so strangers cannot inspect your address.
      </p>

      <h2>4. Retention & Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of non-statutory booking contact records at any time via WhatsApp ({BRAND.whatsappDisplay}) or by writing to {BRAND.email}.
      </p>
    </LegalLayout>
  );
}

