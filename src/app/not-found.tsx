import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="cc-grain flex min-h-screen items-center justify-center bg-[#0d1611] px-4 pt-20 text-center text-[#f6f3ea]">
      <div className="max-w-md rounded-3xl border border-white/10 bg-[#121f18] p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e0c276]">
          404 · Page Not Found
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold text-white">
          This crate is empty.
        </h1>
        <p className="mt-3 text-sm text-[#b3c0b6]">
          The page you are looking for has moved or does not exist. Explore our food essentials or reserve a crate slot.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#c9a449] px-5 py-2.5 text-xs font-semibold text-[#0d1611]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return Home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
          >
            Browse Pantry
          </Link>
        </div>
      </div>
    </div>
  );
}

