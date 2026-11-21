import Image from "next/image";

/**
 * Advanced BrandMark Component using the official CleanCrate.ng logos
 * combined with an elevated 3D gold-beveled medallion frame, ambient halo,
 * and specular sheen on hover.
 */
export function BrandMark({
  className = "h-11 w-11",
  variant = "seal",
}: {
  className?: string;
  variant?: "seal" | "emblem";
}) {
  if (variant === "emblem") {
    return (
      <div
        className={`group/logo relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-[#cfa84c]/45 bg-gradient-to-br from-[#ffffff] via-[#f9f6ed] to-[#efe7d0] px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 hover:border-[#e6c97a] ${className}`}
      >
        <Image
          src="/images/brand/logo-emblem.webp"
          alt="CleanCrate.ng — Clean Food. Simply Packaged."
          width={220}
          height={145}
          className="h-full w-auto object-contain transition-transform duration-300 group-hover/logo:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className={`group/logo relative inline-flex shrink-0 items-center justify-center rounded-full p-[2px] shadow-[0_0_24px_rgba(207,168,76,0.28),0_6px_16px_rgba(0,0,0,0.55)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(230,201,122,0.48)] ${className}`}
      style={{
        background:
          "conic-gradient(from 140deg, #b8892b 0deg, #f3dc99 95deg, #cfa84c 190deg, #8e6618 265deg, #f3dc99 330deg, #b8892b 360deg)",
      }}
    >
      {/* Inner recessed dark-gold bezel ring */}
      <div className="relative h-full w-full overflow-hidden rounded-full border border-[#0b130e]/40 bg-[#faf7ef] p-[1.5px]">
        <Image
          src="/images/brand/logo-seal.webp"
          alt="CleanCrate.ng Official Seal"
          fill
          sizes="64px"
          priority
          className="rounded-full object-contain transition-transform duration-500 group-hover/logo:scale-[1.05]"
        />
        {/* Subtle glass specular reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/15 to-white/30 opacity-65 transition-opacity duration-300 group-hover/logo:opacity-90"
        />
      </div>
    </div>
  );
}
