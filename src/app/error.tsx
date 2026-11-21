"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Clean Crate application error:", error.digest || error.message);
  }, [error]);

  return (
    <div className="cc-grain flex min-h-screen items-center justify-center bg-[#0d1611] px-4 pt-20 text-center text-[#f6f3ea]">
      <div className="max-w-md rounded-3xl border border-white/10 bg-[#121f18] p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e0c276]">
          Unexpected Issue
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-white">
          Something interrupted this page.
        </h1>
        <p className="mt-2.5 text-xs text-[#b3c0b6]">
          Your basket items are preserved safely in your browser. Try refreshing or return to the storefront.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#c9a449] px-5 py-2.5 text-xs font-semibold text-[#0d1611]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

