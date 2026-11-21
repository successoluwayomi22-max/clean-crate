export const BRAND = {
  name: "Clean Crate",
  domain: "CleanCrate.ng",
  motto: "Clean Food. Simply Packaged.",
  tagline: "Quality food essentials, thoughtfully sourced and neatly packaged.",
  whatsappRaw: "2349028421436",
  whatsappDisplay: "+234 902 842 1436",
  email: "orders@cleancrate.ng",
  pickupHub: "Abuja & Lokoja",
  hours: "Mon – Sat · 08:00 – 19:00 WAT",
  serviceCities: "Abuja & Lokoja",
} as const;

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function formatPriceOrQuote(amount: number, emptyLabel = "Discussed on WhatsApp"): string {
  if (!amount || amount <= 0) return emptyLabel;
  return formatNaira(amount);
}

export function formatSlotDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${BRAND.whatsappRaw}?text=${encodeURIComponent(message)}`;
}
