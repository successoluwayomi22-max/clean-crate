"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Check,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useCart } from "@/components/CartContext";
import { BrandMark } from "@/components/BrandMark";
import { WhatsAppSvg } from "@/components/Navbar";
import { BRAND, buildWhatsAppUrl } from "@/lib/format";

type QuickTopicId = "order" | "packaging" | "locations" | "custom";

interface TopicExchange {
  id: QuickTopicId;
  question: string;
  answer: string;
}

const CONCIERGE_TOPICS: TopicExchange[] = [
  {
    id: "order",
    question: "How do I place an order?",
    answer:
      "Add the food essentials you want (Ijebu Garri, Kuli-Kuli, Fermented Iru, Smoked Ponmo, Kiln-Dried Fish, or Curated Crates) to your Crate list, or fill the quick form below. Everything opens directly on our WhatsApp (+234 902 842 1436) where we finalize your preferred pack size, current price, and delivery.",
  },
  {
    id: "packaging",
    question: "What pack sizes & prices do you have?",
    answer:
      "We package cleanly to match your exact household or bulk needs—from single pouches and airtight jars to full family or event crates. Because we pack fresh and quote real-time prices, your exact quantity, pack size, and pricing are discussed directly on WhatsApp.",
  },
  {
    id: "locations",
    question: "Where do you deliver or operate?",
    answer:
      "Clean Crate operates and delivers across Abuja and Lokoja. Whether you need doorstep delivery or pickup in Abuja or Lokoja, we arrange the exact timing with you directly on WhatsApp.",
  },
  {
    id: "custom",
    question: "What if the owner is offline right now?",
    answer:
      "You can still build your crate and send your request 24/7 using the automated assistant below! Your structured order ticket is saved and delivered straight to our WhatsApp queue so the owner responds with your quote first thing when online.",
  },
];

const STAPLE_CHOICES = [
  "Ijebu Gold-Crisp Garri",
  "Bendel Gold Yellow Garri",
  "Roasted Peanut Kuli-Kuli",
  "Hygienic Fermented Iru",
  "Washed & Smoked Ponmo",
  "Kiln-Dried Smoked Catfish",
  "Curated Gift / Family Crate",
];

function checkIsWithinBusinessHours(): boolean {
  try {
    // WAT is UTC+1
    const now = new Date();
    const utcHours = now.getUTCHours();
    const watHour = (utcHours + 1) % 24;
    const watDay = now.getUTCDay(); // 0 = Sun, 1..6 = Mon..Sat
    return watDay >= 1 && watDay <= 6 && watHour >= 8 && watHour < 19;
  } catch {
    return true;
  }
}

export function FloatingWhatsApp() {
  const pathname = usePathname();
  const { items, isDrawerOpen } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<QuickTopicId>("order");
  const [isOnlineHours, setIsOnlineHours] = useState(true);

  // Automated order ticket form state
  const [customerName, setCustomerName] = useState("");
  const [locationState, setLocationState] = useState<"Abuja" | "Lokoja">("Abuja");
  const [selectedStaples, setSelectedStaples] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");

  useEffect(() => {
    setIsOnlineHours(checkIsWithinBusinessHours());
  }, []);

  useEffect(() => {
    const onOpenConcierge = () => setIsOpen(true);
    window.addEventListener("cc:open-concierge", onOpenConcierge);
    return () => window.removeEventListener("cc:open-concierge", onOpenConcierge);
  }, []);

  if (pathname?.startsWith("/admin") || isDrawerOpen) {
    return null;
  }

  function toggleStaple(name: string) {
    setSelectedStaples((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  }

  function handleSendAutomatedTicket(e: React.FormEvent) {
    e.preventDefault();

    const basketLines =
      items.length > 0
        ? items.map((i, idx) => `${idx + 1}. ${i.productName} (Qty: ${i.quantity})`)
        : [];

    const manualLines = selectedStaples.map((s) => `• ${s}`);

    const lines = [
      `*CLEAN CRATE — AUTOMATED WEBSITE ORDER & INQUIRY*`,
      `----------------------------------------`,
      `*Customer Name:* ${customerName.trim() || "Valued Customer"}`,
      `*Location (State):* ${locationState}`,
      `*Status:* ${
        isOnlineHours
          ? "Sent during active hours"
          : "Automated Away-Hours Ticket (Please reply when available)"
      }`,
    ];

    if (basketLines.length > 0) {
      lines.push("", `*Items in Website Crate:*`, ...basketLines);
    }

    if (manualLines.length > 0) {
      lines.push("", `*Selected Essentials:*`, ...manualLines);
    }

    if (customNote.trim()) {
      lines.push("", `*Pack Size / Delivery / Pickup Details:*`, customNote.trim());
    } else {
      lines.push(
        "",
        `*Request:* Please let me know available pack sizes, current pricing, and ${locationState} delivery/pickup arrangement.`
      );
    }

    window.open(buildWhatsAppUrl(lines.join("\n")), "_blank", "noopener,noreferrer");
  }

  const currentTopic =
    CONCIERGE_TOPICS.find((t) => t.id === activeTopic) ?? CONCIERGE_TOPICS[0];

  return (
    <>
      {/* Floating Trigger Pill */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-label="Open Clean Crate Automated WhatsApp Concierge"
          className="group relative inline-flex items-center gap-2.5 rounded-full border border-[#cfa84c]/55 bg-[#0e2619]/95 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.65)] backdrop-blur-md transition duration-300 hover:scale-[1.02] hover:border-[#e6c97a] hover:bg-[#143523]"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#43b578] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#43b578]" />
          </span>
          <WhatsAppSvg className="h-4 w-4 text-[#43b578]" />
          <span>{ isOpen ? "Close Concierge" : "24/7 WhatsApp Concierge" }</span>
          {items.length > 0 && !isOpen && (
            <span className="tabular-nums rounded-full bg-[#cfa84c] px-1.5 py-0.5 text-[10px] font-bold text-[#0b130e]">
              {items.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Automated Concierge Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Clean Crate 24/7 Automated WhatsApp Concierge"
          className="fixed bottom-18 right-3 z-50 flex max-h-[84dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-[#cfa84c]/40 bg-[#0d1812]/98 text-[#f7f4ec] shadow-[0_28px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:bottom-20 sm:right-6"
        >
          {/* Concierge Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#123824] via-[#0f291c] to-[#122219] px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <BrandMark variant="seal" className="h-10 w-10 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-lg font-semibold leading-none text-white">
                    Clean Crate Concierge
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2f8f5b]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#7ae0a5]">
                    24/7 Auto
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[#b4c3b8]">
                  <Clock className="h-3 w-3 text-[#e6c97a]" />
                  {isOnlineHours
                    ? "Owner Online · Fast WhatsApp Response"
                    : "Automated Assistant Active · Instant Order Ticket"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close concierge"
              className="rounded-full border border-white/15 bg-black/25 p-1.5 text-[#d7dfd8] transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {/* Instant Automated Greeting & FAQ Responses */}
            <div className="rounded-2xl border border-white/10 bg-[#13241b] p-3.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e6c97a]">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Instant Answers
                </span>
                <span className="text-[#7ae0a5]">Abuja & Lokoja</span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {CONCIERGE_TOPICS.map((topic) => {
                  const active = topic.id === activeTopic;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setActiveTopic(topic.id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? "bg-[#cfa84c] text-[#0b130e] font-semibold"
                          : "border border-white/10 bg-[#0b130e]/70 text-[#d7dfd8] hover:border-[#cfa84c]/40"
                      }`}
                    >
                      {topic.question}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl border border-[#2f8f5b]/30 bg-[#0b130e]/85 p-3 text-xs leading-relaxed text-[#e8e5dc]">
                {currentTopic.answer}
              </div>
            </div>

            {/* Automated WhatsApp Order & Consultation Builder */}
            <form onSubmit={handleSendAutomatedTicket} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e6c97a]">
                  Prepare Your WhatsApp Order
                </p>
                <span className="text-[10px] text-[#b4c3b8]">
                  Pack size & delivery discussed in chat
                </span>
              </div>

              {items.length > 0 && (
                <div className="rounded-xl border border-[#cfa84c]/35 bg-[#12281c] p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-[#e6c97a]" />
                      Items from your Crate ({items.length})
                    </span>
                    <span className="text-[10px] text-[#7ae0a5]">Auto-attached</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#d7dfd8]">
                    {items.map((i) => `${i.productName} (×${i.quantity})`).join(", ")}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="cc-concierge-name" className="block text-[11px] font-medium text-[#d7dfd8]">
                    Your Name
                  </label>
                  <input
                    id="cc-concierge-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Amina / Tunde"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b130e] px-3 py-2 text-xs text-white outline-none focus:border-[#cfa84c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#d7dfd8]">
                    Your State / Location
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {(["Abuja", "Lokoja"] as const).map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocationState(loc)}
                        className={`inline-flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition ${
                          locationState === loc
                            ? "border-[#cfa84c] bg-[#cfa84c]/20 text-[#e6c97a]"
                            : "border-white/15 bg-[#0b130e] text-[#b4c3b8] hover:text-white"
                        }`}
                      >
                        <MapPin className="h-3 w-3" />
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-[#d7dfd8]">
                  Tap Essentials to Discuss (Optional)
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {STAPLE_CHOICES.map((staple) => {
                    const chosen = selectedStaples.includes(staple);
                    return (
                      <button
                        key={staple}
                        type="button"
                        onClick={() => toggleStaple(staple)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] transition ${
                          chosen
                            ? "border-[#43b578] bg-[#123824] font-semibold text-white"
                            : "border-white/10 bg-[#0b130e] text-[#b4c3b8] hover:border-white/25"
                        }`}
                      >
                        {chosen && <Check className="h-3 w-3 text-[#43b578]" />}
                        {staple}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="cc-concierge-note" className="block text-[11px] font-medium text-[#d7dfd8]">
                  Pack Size, Quantity, Delivery or Pickup Note
                </label>
                <textarea
                  id="cc-concierge-note"
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Tell us the quantity or pack size you want, and whether you prefer delivery or pickup in Abuja or Lokoja..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b130e] px-3 py-2 text-xs text-white outline-none focus:border-[#cfa84c]"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f8f5b] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg transition hover:bg-[#3aa46b]"
              >
                <WhatsAppSvg className="h-4 w-4" />
                Send to Clean Crate WhatsApp
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
