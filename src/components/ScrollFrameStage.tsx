"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Leaf,
  MapPin,
  PackageCheck,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { ProductWithVariants } from "@/db/queries";
import { useCart } from "@/components/CartContext";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

const TOTAL_FRAMES = 90;

function frameUrl(idx: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, idx));
  return `/frames/v2_frame_${String(clamped + 1).padStart(4, "0")}.webp`;
}

/**
 * Full-bleed edge-to-edge cover rendering (zero black bars on left/right/top/bottom).
 */
function drawResponsiveVideoFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
) {
  const iw = img.naturalWidth || 1024;
  const ih = img.naturalHeight || 576;

  const scale = Math.max(w / iw, h / ih) * 1.01;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

export function ScrollFrameStage({
  featuredProducts,
}: {
  featuredProducts: ProductWithVariants[];
}) {
  const { addItem } = useCart();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesCache = useRef<Map<number, HTMLImageElement>>(new Map());

  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);
  const rafIdRef = useRef(0);

  const [activeFrame, setActiveFrame] = useState(0);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const findNearestCachedImage = useCallback((idx: number): HTMLImageElement | null => {
    const exact = framesCache.current.get(idx);
    if (exact) return exact;
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      if (idx - offset >= 0 && framesCache.current.has(idx - offset)) {
        return framesCache.current.get(idx - offset) ?? null;
      }
      if (idx + offset < TOTAL_FRAMES && framesCache.current.has(idx + offset)) {
        return framesCache.current.get(idx + offset) ?? null;
      }
    }
    return null;
  }, []);

  const paintFrame = useCallback(
    (frameIdx: number, force = false) => {
      if (!force && frameIdx === lastDrawnFrameRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d", { alpha: false });
      const img = findNearestCachedImage(frameIdx);
      if (ctx && img) {
        lastDrawnFrameRef.current = frameIdx;
        drawResponsiveVideoFrame(ctx, img, canvas.width, canvas.height);
      }
    },
    [findNearestCachedImage]
  );

  const scheduleAnimation = useCallback(() => {
    if (rafIdRef.current) return;

    const step = () => {
      const diff = targetFrameRef.current - currentFrameRef.current;
      if (Math.abs(diff) > 0.05) {
        // Fast, responsive 0.48 lerp that settles in a few frames
        currentFrameRef.current += diff * 0.48;
      } else {
        currentFrameRef.current = targetFrameRef.current;
      }

      const frameIdx = Math.max(
        0,
        Math.min(TOTAL_FRAMES - 1, Math.round(currentFrameRef.current))
      );

      paintFrame(frameIdx);
      setActiveFrame((prev) => (prev !== frameIdx ? frameIdx : prev));

      if (Math.abs(targetFrameRef.current - currentFrameRef.current) > 0.05) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        rafIdRef.current = 0;
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, [paintFrame]);

  // Fast multi-tier parallel preloader (~1.5 MB total for all 90 frames)
  useEffect(() => {
    let cancelled = false;

    const loadSingle = (idx: number) =>
      new Promise<void>((resolve) => {
        if (framesCache.current.has(idx)) {
          resolve();
          return;
        }
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) {
            framesCache.current.set(idx, img);
            const active = Math.round(currentFrameRef.current);
            if (idx === active || lastDrawnFrameRef.current === -1) {
              paintFrame(active, true);
            }
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = frameUrl(idx);
      });

    async function preloadSequence() {
      // Tier 0: Immediate first frame
      await loadSingle(0);
      if (cancelled) return;

      // Tier 1: Coarse keyframes across entire video (15 frames = ~250 KB, loads in <0.3s)
      const tier1: number[] = [];
      for (let i = 6; i < TOTAL_FRAMES; i += 6) tier1.push(i);
      tier1.push(TOTAL_FRAMES - 1);
      await Promise.all(tier1.map(loadSingle));
      if (cancelled) return;

      // Tier 2: Mid keyframes (every 2nd frame)
      const tier2: number[] = [];
      for (let i = 2; i < TOTAL_FRAMES; i += 2) {
        if (!framesCache.current.has(i)) tier2.push(i);
      }
      for (let i = 0; i < tier2.length; i += 14) {
        if (cancelled) return;
        await Promise.all(tier2.slice(i, i + 14).map(loadSingle));
      }

      // Tier 3: All remaining odd frames
      const tier3: number[] = [];
      for (let i = 1; i < TOTAL_FRAMES; i++) {
        if (!framesCache.current.has(i)) tier3.push(i);
      }
      for (let i = 0; i < tier3.length; i += 14) {
        if (cancelled) return;
        await Promise.all(tier3.slice(i, i + 14).map(loadSingle));
      }
    }

    preloadSequence();
    return () => {
      cancelled = true;
    };
  }, [paintFrame]);

  // Event-driven scroll & resize handler (zero idle CPU/GPU draw loop)
  useEffect(() => {
    const updateScrollTarget = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      targetFrameRef.current = progress * (TOTAL_FRAMES - 1);
      scheduleAnimation();
    };

    const handleResize = () => {
      lastDrawnFrameRef.current = -1;
      updateScrollTarget();
      paintFrame(Math.round(currentFrameRef.current), true);
    };

    window.addEventListener("scroll", updateScrollTarget, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    updateScrollTarget();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      window.removeEventListener("scroll", updateScrollTarget);
      window.removeEventListener("resize", handleResize);
    };
  }, [paintFrame, scheduleAnimation]);

  const chapter = useMemo(() => {
    if (activeFrame < 18) return 0;
    if (activeFrame < 42) return 1;
    if (activeFrame < 68) return 2;
    return 3;
  }, [activeFrame]);

  const quickProducts = featuredProducts.slice(0, 5);
  const waDirectOrderHref = buildWhatsAppUrl(
    "Hello Clean Crate! I'd like to discuss pack sizes, pricing, and delivery/pickup in Abuja or Lokoja."
  );

  return (
    <section
      id="story"
      ref={containerRef}
      aria-label="Clean Crate interactive preparation story"
      className="relative h-[185vh] w-full bg-[#0b130e] sm:h-[200vh]"
    >
      <div ref={stageRef} className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        {/* Instant first-frame fallback image so the background is visible at 0ms before canvas frames hydrate */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/frames/v2_frame_0001.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="relative z-[1] block h-full w-full object-cover"
          aria-hidden="true"
        />

        {/* Subtle bottom-only cinema gradient keeping the video's top/middle crystal clear */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#0b130e]/90 via-[#0b130e]/15 to-transparent"
        />

        {/* Top-right simple skip-to-pantry button */}
        <div className="pointer-events-none absolute inset-x-4 top-22 z-20 flex justify-end sm:inset-x-8">
          <a
            href="#storefront"
            className="pointer-events-auto cc-glass-dark inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#e6c97a] transition hover:border-[#cfa84c] hover:bg-[#123824]"
          >
            Explore Pantry <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Bottom Narrative Glassmorphism Cards */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 mx-auto max-w-7xl px-4 sm:bottom-8 sm:px-6 lg:px-8">
          <div className="pointer-events-auto max-w-2xl">
            {chapter === 0 && (
              <div key="beat-0" className="cc-glass-dark cc-beat-enter rounded-2xl p-4 sm:rounded-3xl sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e6c97a] sm:text-[11px]">
                  CleanCrate.ng · Abuja & Lokoja
                </p>
                <h1 className="font-display mt-1.5 text-2xl font-semibold leading-tight text-white sm:text-5xl">
                  Clean Food.
                  <br />
                  Simply Packaged.
                </h1>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#e8e5dc] sm:mt-2.5 sm:text-sm">
                  At Clean Crate, we bring you thoughtfully sourced, hygienically sealed Nigerian food essentials across Abuja & Lokoja. Scroll gently to experience the ritual.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                  <a
                    href={waDirectOrderHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#2f8f5b] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3aa46b] active:scale-95 sm:px-5"
                  >
                    <WhatsAppSvg className="h-3.5 w-3.5" />
                    Order on WhatsApp
                  </a>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 rounded-full border border-[#cfa84c]/45 bg-[#123824]/75 px-4 py-2.5 text-xs font-semibold text-[#e6c97a] transition hover:bg-[#1a4f33] sm:px-5"
                  >
                    Browse Pantry <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {chapter === 1 && (
              <div key="beat-1" className="cc-glass-dark cc-beat-enter rounded-2xl p-4 sm:rounded-3xl sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#43b578] sm:text-[11px]">
                  Thoughtfully Prepared
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold text-white sm:text-4xl">
                  Double-sieved, stone-free, and sealed for freshness.
                </h2>
                <div className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <Leaf className="h-4 w-4 text-[#43b578]" />
                    <p className="mt-1 text-xs font-semibold text-white">Zero Grit or Stones</p>
                    <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
                      Crisp Ijebu garri, roasted kuli-kuli, pre-washed ponmo & kiln-dried fish.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <PackageCheck className="h-4 w-4 text-[#e6c97a]" />
                    <p className="mt-1 text-xs font-semibold text-white">Custom Packaging</p>
                    <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
                      Pouches, jars, and crates tailored to the exact quantity you discuss with us.
                    </p>
                  </div>
                  <div className="hidden rounded-xl border border-white/10 bg-black/35 p-3 sm:block">
                    <ShieldCheck className="h-4 w-4 text-[#e6c97a]" />
                    <p className="mt-1 text-xs font-semibold text-white">WhatsApp Direct</p>
                    <p className="mt-0.5 text-[11px] text-[#b4c3b8]">
                      Size, pricing, delivery & pickup confirmed directly on WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {chapter === 2 && (
              <div key="beat-2" className="cc-glass-dark cc-beat-enter rounded-2xl p-4 sm:rounded-3xl sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e6c97a] sm:text-[11px]">
                      Signature Staples
                    </p>
                    <h2 className="font-display mt-0.5 text-xl font-semibold text-white sm:text-3xl">
                      Tap to add essentials to your WhatsApp Crate
                    </h2>
                  </div>
                  <Link
                    href="/shop"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#e6c97a] hover:underline"
                  >
                    All Items <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {quickProducts.map((p, idx) => {
                    const v = p.variants[0];
                    if (!v) return null;
                    const added = justAddedId === v.id;
                    return (
                      <div
                        key={p.id}
                        className={`${
                          idx >= 3 ? "hidden sm:flex" : "flex"
                        } items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                          <p className="text-[10px] text-[#e6c97a]">
                            Size & price on WhatsApp
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            addItem({
                              variantId: v.id,
                              productId: p.id,
                              slug: p.slug,
                              productName: p.name,
                              variantLabel: "Custom Pack (Discuss on WhatsApp)",
                              unitPriceNgn: 0,
                              imagePath: p.image_path,
                              maxStock: 99,
                            });
                            setJustAddedId(v.id);
                            setTimeout(() => setJustAddedId(null), 900);
                          }}
                          aria-label={`Add ${p.name} to crate`}
                          className={`shrink-0 rounded-full p-1.5 transition active:scale-90 ${
                            added
                              ? "bg-[#2f8f5b] text-white"
                              : "bg-[#cfa84c] text-[#0b130e] hover:bg-[#e6c97a]"
                          }`}
                        >
                          {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {chapter === 3 && (
              <div key="beat-3" className="cc-glass-dark cc-beat-enter rounded-2xl p-4 sm:rounded-3xl sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e6c97a] sm:text-[11px]">
                  Serving Abuja & Lokoja
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold text-white sm:text-4xl">
                  Ready for your kitchen in Abuja or Lokoja.
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#d7dfd8] sm:text-sm">
                  Select your staples and message us directly on WhatsApp ({BRAND.whatsappDisplay}) to customize your package size and arrange delivery or pickup in <strong className="text-white">Abuja</strong> or <strong className="text-white">Lokoja</strong>.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={waDirectOrderHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#cfa84c] px-5 py-2.5 text-xs font-semibold text-[#0b130e] transition hover:bg-[#e6c97a]"
                  >
                    <WhatsAppSvg className="h-3.5 w-3.5" />
                    Discuss Order on WhatsApp
                  </a>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#b4c3b8]">
                    <MapPin className="h-3.5 w-3.5 text-[#43b578]" />
                    Abuja & Lokoja
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
