import type { Metadata } from "next";
import { ContactConciergeClient } from "@/components/ContactConciergeClient";

export const metadata: Metadata = {
  title: "Contact & Bulk Crate Inquiries",
  description:
    "Contact Clean Crate on WhatsApp (+234 902 842 1436) for custom pantry crates, household orders, and Abuja & Lokoja delivery or pickup.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#f6f3ea]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e0c276]">
            WhatsApp Concierge · Abuja & Lokoja
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white sm:text-5xl">
            Household, bulk & custom crates.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#b3c0b6]">
            Tell us which food essentials you need—our team discusses your exact package size, pricing, and Abuja or Lokoja delivery/pickup directly on WhatsApp.
          </p>
        </div>

        <ContactConciergeClient />
      </div>
    </div>
  );
}
