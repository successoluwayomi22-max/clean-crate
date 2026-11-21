"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useCart } from "@/components/CartContext";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

const NAV_LINKS = [
  { href: "/#story", label: "Experience" },
  { href: "/shop", label: "Our Pantry" },
  { href: "/#standard", label: "Clean Standard" },
  { href: "/contact", label: "Contact & Bulk" },
];

export function WhatsAppSvg({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.76 14.12c-.24.67-1.42 1.28-1.97 1.36-.52.08-1.18.11-1.9-.12-.44-.14-1-.33-1.72-.64-3.02-1.3-4.99-4.35-5.14-4.55-.15-.2-1.23-1.64-1.23-3.13s.78-2.22 1.06-2.52c.28-.3.61-.38.81-.38h.58c.19 0 .44-.07.69.53.25.6.86 2.09.94 2.24.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.15-.31.31-.13.62.18.3.79 1.3 1.7 2.11 1.17 1.04 2.15 1.37 2.46 1.52.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.41-.25.69-.15.28.1 1.78.84 2.08.99.3.15.51.23.58.35.08.13.08.73-.16 1.4Z" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { totalItems, openDrawer } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const whatsappHref = buildWhatsAppUrl(
    "Hello Clean Crate, I would like to inquire about your food essentials in Abuja / Lokoja."
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#cfa84c]/25 bg-[#0b130e]/92 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          : "bg-gradient-to-b from-[#0b130e]/90 via-[#0b130e]/50 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Advanced Official CleanCrate.ng Brand Lockup */}
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <BrandMark className="h-11 w-11 sm:h-12 sm:w-12" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                Clean<span className="text-[#e6c97a]">Crate</span>
              </span>
              <span className="text-xs font-bold text-[#43b578]">.ng</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b4c3b8] sm:text-[10px]">
              Clean Food. Simply Packaged.
            </span>
          </div>
        </Link>

        {/* Center: Clean Editorial Pill Navigation (No Generic AI Icons) */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 rounded-full border border-white/12 bg-[#0d1812]/80 px-2.5 py-1.5 backdrop-blur-md lg:flex"
        >
          {NAV_LINKS.map((item) => {
            const isHashLink = item.href.startsWith("/#");
            const active = !isHashLink && pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.08em] transition-all duration-200 ${
                  active
                    ? "bg-[#cfa84c] text-[#0b130e] shadow-sm"
                    : "text-[#e8e5dc] hover:bg-white/8 hover:text-[#e6c97a]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Crate List & WhatsApp Direct Action */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-[#43b578]/50 bg-[#123824]/85 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#43b578] hover:bg-[#194d32] md:inline-flex"
          >
            <WhatsAppSvg className="h-3.5 w-3.5 text-[#43b578]" />
            <span>Order on WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open crate list with ${totalItems} items`}
            className="relative inline-flex items-center gap-2 rounded-full border border-[#cfa84c]/50 bg-[#0d1611]/90 px-3.5 py-2 text-xs font-semibold text-[#f6f3ea] transition hover:border-[#e6c97a] hover:bg-[#14231b]"
          >
            <ShoppingBag className="h-4 w-4 text-[#e6c97a]" />
            <span className="hidden sm:inline">My Crate</span>
            <span className="tabular-nums inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#cfa84c] px-1.5 text-[11px] font-bold text-[#0b130e]">
              {totalItems}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0d1812]/90 text-white transition hover:border-[#cfa84c]/50 lg:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#cfa84c]/20 bg-[#0b130e]/98 px-4 py-5 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {NAV_LINKS.map((item) => {
              const isHashLink = item.href.startsWith("/#");
              const active = !isHashLink && pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#cfa84c]/20 text-[#e6c97a] border border-[#cfa84c]/40"
                      : "text-[#f6f3ea] hover:bg-white/5 hover:text-[#e6c97a]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-[#cfa84c]">→</span>
                </Link>
              );
            })}

            <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-white/10 pt-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openDrawer();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfa84c]/45 bg-[#122219] px-4 py-3 text-xs font-semibold text-[#e6c97a]"
              >
                <ShoppingBag className="h-4 w-4" />
                View My Crate ({totalItems})
              </button>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2f8f5b] px-4 py-3 text-xs font-semibold text-white"
              >
                <WhatsAppSvg className="h-4 w-4" />
                WhatsApp ({BRAND.whatsappDisplay})
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
