import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { ProductWithVariants } from "@/db/queries";
import { BrandMark } from "@/components/BrandMark";
import { WhatsAppSvg } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

export function HomeCatalogPreview({
  products,
}: {
  products: ProductWithVariants[];
}) {
  const waCustomHref = buildWhatsAppUrl(
    "Hello Clean Crate! I would like to discuss product sizes, pricing, and delivery/pickup in Abuja or Lokoja."
  );

  return (
    <div id="storefront" className="cc-grain relative bg-[#0b130e] text-[#f7f4ec]">
      {/* Curated Essentials & Crates */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e6c97a]">
              Pantry & Curated Crates
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Fresh staples, packed cleanly.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#b4c3b8]">
              Select the staples you need for your kitchen. Every package size, price quote, and delivery or pickup arrangement across <strong className="text-white">Abuja & Lokoja</strong> is tailored directly with you on WhatsApp ({BRAND.whatsappDisplay}).
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#cfa84c]/45 bg-[#123824]/75 px-5 py-2.5 text-xs font-semibold text-[#e6c97a] transition hover:border-[#cfa84c] hover:bg-[#1a4f33] md:self-auto"
          >
            View All Pantry Items <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Clean Crate Standard — Editorial 3-Pillar Section */}
      <section id="standard" className="border-y border-white/10 bg-[#0f1a13]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#43b578]">
                The Clean Crate Standard
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Built for kitchens across Abuja & Lokoja that care how food arrives.
              </h2>
            </div>
            <BrandMark variant="emblem" className="h-20 w-44 self-start lg:self-auto" />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="cc-card rounded-2xl p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#cfa84c]/35 bg-[#123824] text-[#e6c97a]">
                <PackageCheck className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold text-white">
                Sorted & Stone-Free
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#b4c3b8]">
                Our Ijebu & Bendel Garri undergoes stainless double-sieving, Ponmo is pre-washed & cleanly scraped, and catfish is dried inside wood kilns without roadside dust.
              </p>
            </div>

            <div className="cc-card rounded-2xl p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#cfa84c]/35 bg-[#123824] text-[#e6c97a]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold text-white">
                Custom Clean Packaging
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#b4c3b8]">
                Odour-prone condiments like fermented Iru are vacuum-sealed, while Kuli-kuli and grains are packed fresh in airtight jars, pouches, or crates sized to your order.
              </p>
            </div>

            <div className="cc-card rounded-2xl p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#cfa84c]/35 bg-[#123824] text-[#e6c97a]">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold text-white">
                Abuja & Lokoja Fulfillment
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#b4c3b8]">
                Whether you need doorstep delivery or convenient pickup in Abuja or Lokoja, we arrange everything directly with you on WhatsApp for a smooth experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Ordering & WhatsApp Automation Works (Abuja & Lokoja Only) */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e6c97a]">
              Simple Direct Ordering
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
              How Clean Crate works in Abuja & Lokoja.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#b4c3b8]">
              We don’t lock you into rigid pack measurements. Tell us what staples your household or event needs, and we package to match.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="cc-card rounded-2xl p-5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6c97a]">
                  STEP 01
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">
                  Pick Your Staples
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#b4c3b8]">
                  Browse our Garri, Kuli-Kuli, Fermented Iru, Smoked Ponmo, Dried Catfish, and Curated Crates.
                </p>
              </div>

              <div className="cc-card rounded-2xl p-5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6c97a]">
                  STEP 02
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">
                  Discuss Size & Price
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#b4c3b8]">
                  Send your crate list to our WhatsApp to choose your preferred package size and confirm current pricing.
                </p>
              </div>

              <div className="cc-card rounded-2xl p-5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-[#e6c97a]">
                  STEP 03
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold text-white">
                  Abuja & Lokoja Delivery
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#b4c3b8]">
                  Confirm your delivery or pickup directly on WhatsApp across <strong className="text-white">Abuja</strong> and <strong className="text-white">Lokoja</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="cc-glass-dark rounded-3xl p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2f8f5b]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7ae0a5]">
                  <MessageSquare className="h-3.5 w-3.5" /> 24/7 WhatsApp Concierge
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#e6c97a]">
                  <MapPin className="h-3.5 w-3.5 text-[#43b578]" /> Abuja & Lokoja
                </span>
              </div>

              <h3 className="font-display mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Order or inquire anytime, day or night.
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-[#d7dfd8] sm:text-sm">
                Even if the owner is briefly away, our automated website concierge answers your questions immediately and prepares your complete order ticket for WhatsApp ({BRAND.whatsappDisplay}).
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
                  <p className="text-xs font-semibold text-white">Abuja</p>
                  <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
                    Delivery & pickup arranged directly on WhatsApp.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
                  <p className="text-xs font-semibold text-white">Lokoja</p>
                  <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
                    Delivery & pickup arranged directly on WhatsApp.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <a
                  href={waCustomHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2f8f5b] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#3aa46b]"
                >
                  <WhatsAppSvg className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfa84c]/45 bg-[#123824]/70 px-5 py-3 text-xs font-semibold text-[#e6c97a] transition hover:bg-[#1a4f33]"
                >
                  Custom / Bulk Crate <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
