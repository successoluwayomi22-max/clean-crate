import Link from "next/link";
import { Clock, Mail, MapPin, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

export function Footer() {
  const waHref = buildWhatsAppUrl(
    "Hello Clean Crate, I would like to discuss an order or bulk crate in Abuja / Lokoja."
  );

  return (
    <footer className="border-t border-[#c9a449]/20 bg-[#09100c] text-[#d7dfd8]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <BrandMark className="h-11 w-11" />
              <div>
                <span className="font-display block text-xl font-bold text-white">
                  Clean<span className="text-[#e6c97a]">Crate</span>
                  <span className="text-xs font-bold text-[#43b578]">.ng</span>
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b4c3b8]">
                  {BRAND.motto}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#a6b5aa]">
              At Clean Crate, we are committed to bringing you quality food essentials, thoughtfully sourced and neatly packaged across Abuja & Lokoja.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2f8f5b]/40 bg-[#123523]/50 px-3 py-1 text-[11px] text-[#a7dfc0]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#43aa72]" />
              <span>Hygienically Sealed & Verified</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e0c276]">
              Our Pantry
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/shop" className="hover:text-white">
                  All Food Essentials
                </Link>
              </li>
              <li>
                <Link href="/shop?category=crates" className="hover:text-white">
                  Curated Clean Crates
                </Link>
              </li>
              <li>
                <Link href="/shop?category=grains" className="hover:text-white">
                  Ijebu & Yellow Garri
                </Link>
              </li>
              <li>
                <Link href="/shop?category=condiments" className="hover:text-white">
                  Kuli-Kuli & Fermented Iru
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Custom & Bulk Crates
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e0c276]">
              Policies & Compliance
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/privacy-policy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white">
                  Refund & Perishables Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-[#8da092] hover:text-white">
                  Operations Portal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e0c276]">
              Direct Contact & Locations
            </h3>
            <ul className="mt-4 space-y-3 text-xs">
              <li>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-white hover:text-[#e0c276]"
                >
                  <WhatsAppSvg className="h-4 w-4 text-[#43aa72]" />
                  <span>WhatsApp: {BRAND.whatsappDisplay}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-[#a6b5aa]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a449]" />
                <span>Serving Abuja & Lokoja (Delivery & Pickup discussed on WhatsApp)</span>
              </li>
              <li className="flex items-center gap-2 text-[#a6b5aa]">
                <Clock className="h-4 w-4 shrink-0 text-[#c9a449]" />
                <span>{BRAND.hours} (24/7 Website Concierge)</span>
              </li>
              <li className="flex items-center gap-2 text-[#a6b5aa]">
                <Mail className="h-4 w-4 shrink-0 text-[#c9a449]" />
                <span>{BRAND.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-[#8da092] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} CleanCrate.ng. All rights reserved.</p>
          <p>Garri · Kuli-Kuli · Iru · Ponmo · Kiln-Dried Fish · Curated Crates</p>
        </div>
      </div>
    </footer>
  );
}
