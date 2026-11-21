"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

export function ContactConciergeClient() {
  const [name, setName] = useState("");
  const [stateLoc, setStateLoc] = useState<"Abuja" | "Lokoja">("Abuja");
  const [inquiryType, setInquiryType] = useState("Household / Custom Crate");
  const [details, setDetails] = useState("");

  function handleSendWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    const msg = [
      `*CLEAN CRATE ORDER & CUSTOM INQUIRY*`,
      `Name: ${name}`,
      `State: ${stateLoc}`,
      `Order Type: ${inquiryType}`,
      `Items, Size & Delivery/Pickup Details: ${details}`,
    ].join("\n");
    window.open(buildWhatsAppUrl(msg), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-5">
        <div className="rounded-3xl border border-[#c9a449]/30 bg-[#121f18] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e0c276]">
              Direct Channels
            </p>
            <BrandMark variant="seal" className="h-10 w-10" />
          </div>
          <h2 className="font-display text-3xl font-semibold text-white">
            Speak directly with Clean Crate.
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#b3c0b6]">
            All packaging sizes, pricing, and delivery or pickup arrangements across Abuja and Lokoja are finalized directly with you on WhatsApp.
          </p>
          <ul className="mt-5 space-y-4 text-sm text-[#d7dfd8]">
            <li className="flex items-start gap-3">
              <WhatsAppSvg className="mt-0.5 h-5 w-5 shrink-0 text-[#43aa72]" />
              <div>
                <p className="font-semibold text-white">WhatsApp Orders & Consultation</p>
                <a
                  href={buildWhatsAppUrl("Hello Clean Crate, I'd like to make an inquiry.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#7ae0a5] hover:underline"
                >
                  {BRAND.whatsappDisplay}
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#c9a449]" />
              <div>
                <p className="font-semibold text-white">Service States</p>
                <p className="text-xs text-[#b3c0b6]">
                  Abuja & Lokoja (Delivery and pickup discussed on WhatsApp)
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#c9a449]" />
              <div>
                <p className="font-semibold text-white">Active Hours & 24/7 Concierge</p>
                <p className="text-xs text-[#b3c0b6]">
                  {BRAND.hours} · Automated website assistant available 24/7
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#c9a449]" />
              <div>
                <p className="font-semibold text-white">Email Support</p>
                <p className="text-xs text-[#b3c0b6]">{BRAND.email}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <form
        onSubmit={handleSendWhatsApp}
        className="rounded-3xl border border-white/10 bg-[#121f18] p-6 sm:p-8 lg:col-span-7"
      >
        <div className="flex items-center gap-2 text-[#43aa72]">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            Household · Bulk · Event · Diaspora Crates
          </span>
        </div>
        <h2 className="font-display mt-2 text-3xl font-semibold text-white">
          Send Your Order or Custom Crate Request to WhatsApp
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inq-name" className="block text-xs font-medium text-[#d7dfd8]">
              Your Name *
            </label>
            <input
              id="inq-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chidi Okafor"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#d7dfd8]">
              Your State (Abuja or Lokoja) *
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["Abuja", "Lokoja"] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setStateLoc(loc)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition ${
                    stateLoc === loc
                      ? "border-[#cfa84c] bg-[#cfa84c]/20 text-[#e6c97a]"
                      : "border-white/15 bg-[#0d1611] text-[#b4c3b8]"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {loc}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="inq-type" className="block text-xs font-medium text-[#d7dfd8]">
              Order / Crate Type
            </label>
            <select
              id="inq-type"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            >
              <option>Household / Custom Crate</option>
              <option>Bulk / Family Monthly Restock</option>
              <option>Corporate / Event Gifting Crates</option>
              <option>Diaspora Vacuum-Sealed Export Crate</option>
              <option>Restaurant / Kitchen Supply</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="inq-details" className="block text-xs font-medium text-[#d7dfd8]">
              Items, Preferred Packaging & Delivery/Pickup Details *
            </label>
            <textarea
              id="inq-details"
              required
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us which staples you want (e.g. Ijebu Garri, Kuli-kuli, Fermented Iru, Smoked Ponmo, Dried Fish), how you want them packaged, and whether you want delivery or pickup in Abuja or Lokoja..."
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[#2f8f5b] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#3aa46b]"
          >
            <WhatsAppSvg className="h-4 w-4" />
            Send Request to WhatsApp ({BRAND.whatsappDisplay})
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("cc:open-concierge"))}
            className="inline-flex items-center gap-2 rounded-full border border-[#cfa84c]/45 bg-[#0d1611] px-5 py-3 text-xs font-semibold text-[#e6c97a] transition hover:bg-white/5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Open 24/7 Automated Concierge
          </button>
        </div>
      </form>
    </div>
  );
}
