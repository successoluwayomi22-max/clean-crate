"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";

const COOKIE_KEY = "cc_cookie_consent_v1";

interface ConsentState {
  essential: true;
  analytics: boolean;
  savedAt: string;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(COOKIE_KEY);
      if (!existing) {
        const timer = setTimeout(() => setVisible(true), 900);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function persistConsent(analytics: boolean) {
    const payload: ConsentState = {
      essential: true,
      analytics,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify(payload));
      document.cookie = `cc_consent=${analytics ? "all" : "essential"}; path=/; max-age=15552000; SameSite=Lax`;
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-md sm:right-auto cc-glass-dark rounded-2xl p-5 text-sm text-[#f6f3ea] transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[#e0c276]">
          <Cookie className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            Privacy & Cookies
          </span>
        </div>
        <button
          type="button"
          onClick={() => persistConsent(false)}
          aria-label="Use essential cookies only"
          className="rounded-lg p-1 text-[#b3c0b6] hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-[#d7dfd8]">
        We use strictly necessary storage to keep your Clean Crate items and booking
        session secure. Optional analytics are disabled until you consent. Read our{" "}
        <Link href="/cookies" className="underline decoration-[#c9a449]/70 hover:text-white">
          Cookie Policy
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="underline decoration-[#c9a449]/70 hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>

      {showPrefs && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#43aa72]" />
              Essential (Cart & Security)
            </span>
            <span className="text-[11px] uppercase tracking-wider text-[#43aa72]">Always Active</span>
          </div>
          <label className="flex cursor-pointer items-center justify-between pt-1">
            <span className="text-[#d7dfd8]">Storefront Performance Analytics</span>
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(e) => setAnalyticsEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#2f8f5b]"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => persistConsent(true)}
          className="rounded-full bg-[#c9a449] px-4 py-1.5 text-xs font-semibold text-[#0d1611] transition hover:bg-[#e0c276]"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={() => persistConsent(false)}
          className="rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[#f6f3ea] transition hover:bg-white/15"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => (showPrefs ? persistConsent(analyticsEnabled) : setShowPrefs(true))}
          className="ml-auto text-xs font-medium text-[#e0c276] underline-offset-4 hover:underline"
        >
          {showPrefs ? "Save Choice" : "Preferences"}
        </button>
      </div>
    </aside>
  );
}

