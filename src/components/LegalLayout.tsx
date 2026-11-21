import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalLayout({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#e8e5dc]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#b3c0b6] hover:text-[#e0c276]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Clean Crate
        </Link>

        <div className="rounded-3xl border border-white/10 bg-[#121f18] p-7 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e0c276]">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-[#8da092]">Last reviewed: {updatedAt}</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#d7dfd8] [&_h2]:font-display [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

