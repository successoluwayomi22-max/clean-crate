import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Details on essential session storage and optional cookie preferences at Clean Crate.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalLayout
      eyebrow="Transparency & Consent"
      title="Cookie Policy"
      updatedAt="November 2026"
    >
      <p>
        Clean Crate keeps browser storage minimal and transparent. We do not embed invasive ad-tech trackers or third-party data brokers.
      </p>

      <h2>1. Essential Storage (Always Active)</h2>
      <ul>
        <li>
          <strong>Crate Basket (<code>cc_crate_cart_v1</code>):</strong> Remembers the products and pack sizes in your basket while you browse before booking.
        </li>
        <li>
          <strong>Consent Preference (<code>cc_consent</code>):</strong> Saves whether you selected Essential Only or Accept All so the banner stays out of your way.
        </li>
        <li>
          <strong>Operations Session Cookie (<code>cc_admin_session</code>):</strong> HttpOnly signed session cookie used solely when staff sign in to the protected operations portal.
        </li>
      </ul>

      <h2>2. Optional Performance Analytics</h2>
      <p>
        Optional storefront performance measurements remain disabled unless you explicitly opt in using the Cookie Banner preferences.
      </p>
    </LegalLayout>
  );
}

