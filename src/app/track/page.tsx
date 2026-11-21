import type { Metadata } from "next";
import { TrackOrderClient } from "@/components/TrackOrderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Your Crate Booking",
  description:
    "Check live packing and dispatch status for your Clean Crate food essentials booking using your reference code.",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#f6f3ea]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e0c276]">
            Live Crate Status
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white sm:text-5xl">
            Track your Clean Crate booking.
          </h1>
          <p className="mt-3 text-sm text-[#b3c0b6]">
            Enter your reference code alongside the email or last 4 phone digits used at checkout for privacy verification.
          </p>
        </div>

        <TrackOrderClient initialRef={params.ref || ""} />
      </div>
    </div>
  );
}

