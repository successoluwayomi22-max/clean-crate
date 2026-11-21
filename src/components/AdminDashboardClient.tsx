"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { WhatsAppSvg } from "@/components/Navbar";
import { buildWhatsAppUrl, formatPriceOrQuote, formatSlotDate } from "@/lib/format";

interface AdminBookingItem {
  product_name: string;
  variant_label: string;
  quantity: number;
  line_total_ngn: number;
}

interface AdminDashboardState {
  admin: { id: number; email: string; name: string; role: string };
  kpis: { total_bookings: number; total_revenue_ngn: number; active_bookings: number };
  bookings: Array<{
    id: number;
    reference_code: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    delivery_address: string;
    delivery_notes: string;
    zone_name: string;
    slot_date: string;
    window_label: string;
    payment_method: string;
    payment_status: string;
    booking_status: string;
    total_ngn: number;
    items: AdminBookingItem[];
  }>;
  variants: Array<{
    id: number;
    product_name: string;
    label: string;
    price_ngn: number;
    stock_qty: number;
    is_active: number;
  }>;
  slots: Array<{
    id: number;
    slot_date: string;
    window_label: string;
    max_capacity: number;
    booked_count: number;
    is_active: number;
  }>;
  auditLogs: Array<{
    id: number;
    actor: string;
    action: string;
    target_type: string;
    target_id: string;
    metadata_json: string;
    created_at: string;
  }>;
}

export function AdminDashboardClient({ initiallyAuthenticated }: { initiallyAuthenticated: boolean }) {
  const [authed, setAuthed] = useState(initiallyAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminDashboardState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "inventory" | "slots" | "security">("bookings");

  // Variant inline edit buffer
  const [variantEdits, setVariantEdits] = useState<
    Record<number, { priceNgn: number; stockQty: number; isActive: boolean }>
  >({});

  // Slot inline capacity buffer
  const [slotEdits, setSlotEdits] = useState<
    Record<number, { maxCapacity: number; isActive: boolean }>
  >({});

  // New Product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProd, setNewProd] = useState({
    name: "",
    category: "grains" as "grains" | "condiments" | "proteins" | "crates" | "addons",
    tagline: "",
    description: "",
    origin: "Clean Crate Studio, Lokoja & Abuja",
    storageNote: "Store sealed in a cool dry place.",
    imagePath: "/images/products/signature-crate.webp",
    variantLabel: "1kg Sealed Pouch",
    weightGrams: 1000,
    priceNgn: 4500,
    stockQty: 25,
  });

  // Password change form
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setAuthed(false);
        setData(null);
        return;
      }
      if (res.ok) {
        const json: AdminDashboardState = await res.json();
        setData(json);
        const vMap: Record<number, { priceNgn: number; stockQty: number; isActive: boolean }> = {};
        for (const v of json.variants) {
          vMap[v.id] = {
            priceNgn: v.price_ngn,
            stockQty: v.stock_qty,
            isActive: v.is_active === 1,
          };
        }
        setVariantEdits(vMap);

        const sMap: Record<number, { maxCapacity: number; isActive: boolean }> = {};
        for (const s of json.slots) {
          sMap[s.id] = { maxCapacity: s.max_capacity, isActive: s.is_active === 1 };
        }
        setSlotEdits(sMap);
        setAuthed(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadDashboard();
    }
  }, [authed, loadDashboard]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || "Sign-in failed.");
        return;
      }
      setPassword("");
      setAuthed(true);
    } catch {
      setAuthError("Unable to reach server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  }

  async function updateBooking(id: number, bookingStatus: string, paymentStatus: string) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingStatus, paymentStatus }),
    });
    if (res.ok) {
      setStatusMessage(`Updated booking #${id}`);
      loadDashboard();
    }
  }

  async function saveVariant(id: number) {
    const edit = variantEdits[id];
    if (!edit) return;
    const res = await fetch(`/api/admin/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    if (res.ok) {
      setStatusMessage(`Saved pack variant #${id}`);
      loadDashboard();
    }
  }

  async function saveSlot(id: number) {
    const edit = slotEdits[id];
    if (!edit) return;
    const res = await fetch(`/api/admin/slots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    if (res.ok) {
      setStatusMessage(`Updated dispatch slot #${id}`);
      loadDashboard();
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProd),
    });
    const json = await res.json();
    if (res.ok) {
      setStatusMessage(`Added product: ${newProd.name}`);
      setShowNewProduct(false);
      setNewProd({
        ...newProd,
        name: "",
        tagline: "",
        description: "",
      });
      loadDashboard();
    } else {
      setStatusMessage(json.error || "Could not create product.");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pwForm),
    });
    const json = await res.json();
    if (res.ok) {
      setPwForm({ currentPassword: "", newPassword: "" });
      setStatusMessage("Admin password updated securely.");
    } else {
      setStatusMessage(json.error || "Password update failed.");
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-[#c9a449]/30 bg-[#121f18] p-7">
        <div className="flex items-center gap-2 text-[#e0c276]">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Protected Operations Portal
          </span>
        </div>
        <h1 className="font-display mt-2 text-3xl font-semibold text-white">
          Clean Crate Admin
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#b3c0b6]">
          Sign in to manage WhatsApp bookings, slot capacities, pantry pricing, and security logs.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="adm-email" className="block text-xs font-medium text-[#d7dfd8]">
              Admin Email
            </label>
            <input
              id="adm-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cleancrate.ng"
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            />
          </div>
          <div>
            <label htmlFor="adm-pass" className="block text-xs font-medium text-[#d7dfd8]">
              Password
            </label>
            <input
              id="adm-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0d1611] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#c9a449]"
            />
          </div>

          {authError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#c9a449] py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#0d1611] transition hover:bg-[#e0c276]"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#e0c276]">
            Signed in as {data?.admin.email}
          </p>
          <h1 className="font-display text-3xl font-semibold text-white">
            Operations & Security Control
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {statusMessage && (
            <span className="rounded-full bg-[#2f8f5b]/25 px-3 py-1 text-xs text-[#7ae0a5]">
              {statusMessage}
            </span>
          )}
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-[#e8e5dc] hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-950/30 px-3.5 py-1.5 text-xs text-red-200 hover:bg-red-950/60"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#121f18] p-5">
              <p className="text-xs text-[#8da092]">Total Bookings</p>
              <p className="tabular-nums mt-1 text-3xl font-semibold text-white">
                {data.kpis.total_bookings}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121f18] p-5">
              <p className="text-xs text-[#8da092]">Active Queue (Confirmed / Packing)</p>
              <p className="tabular-nums mt-1 text-3xl font-semibold text-[#7ae0a5]">
                {data.kpis.active_bookings}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121f18] p-5">
              <p className="text-xs text-[#8da092]">Confirmed Revenue</p>
              <p className="tabular-nums mt-1 text-2xl font-semibold text-[#e0c276] sm:text-3xl">
                {formatPriceOrQuote(data.kpis.total_revenue_ngn, "WhatsApp Quotes")}
              </p>
            </div>
          </div>

          {/* Admin Section Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "bookings", label: "Bookings Queue", icon: ClipboardList },
              { id: "inventory", label: "Inventory & Products", icon: Package },
              { id: "slots", label: "Slot Capacities", icon: CalendarDays },
              { id: "security", label: "Security & Audit Log", icon: ShieldCheck },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[#c9a449] text-[#0d1611]"
                      : "border border-white/15 bg-[#121f18] text-[#d7dfd8] hover:border-white/30"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {activeTab === "bookings" && (
            <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
              <h2 className="font-display text-2xl font-semibold text-white">Recent Bookings</h2>
              {data.bookings.length === 0 ? (
                <p className="mt-3 text-xs text-[#b3c0b6]">No bookings placed yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-white/10 bg-[#0d1611] p-4 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className="font-bold text-[#e0c276]">{b.reference_code}</span>
                          <span className="ml-2 font-semibold text-white">{b.customer_name}</span>
                          <span className="ml-2 text-[#8da092]">{b.customer_phone}</span>
                          <p className="mt-1 text-[#b3c0b6]">
                            {formatSlotDate(b.slot_date)} · {b.window_label} · {b.zone_name}
                          </p>
                          <p className="mt-0.5 text-[#8da092]">Address: {b.delivery_address}</p>
                        </div>

                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                          <span className="tabular-nums text-sm font-semibold text-[#e0c276]">
                            {formatPriceOrQuote(b.total_ngn, "Quote")}
                          </span>
                          <select
                            aria-label={`Payment status for ${b.reference_code}`}
                            value={b.payment_status}
                            onChange={(e) => updateBooking(b.id, b.booking_status, e.target.value)}
                            className="rounded-lg border border-white/15 bg-[#121f18] px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="pending">pending</option>
                            <option value="awaiting_verification">awaiting_verification</option>
                            <option value="paid">paid</option>
                          </select>
                          <select
                            aria-label={`Fulfillment status for ${b.reference_code}`}
                            value={b.booking_status}
                            onChange={(e) => updateBooking(b.id, e.target.value, b.payment_status)}
                            className="rounded-lg border border-white/15 bg-[#121f18] px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="confirmed">confirmed</option>
                            <option value="packing">packing</option>
                            <option value="dispatched">dispatched</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                          <a
                            href={buildWhatsAppUrl(
                              `Hello ${b.customer_name}, updating you on Clean Crate booking ${b.reference_code}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#2f8f5b]/25 px-3 py-1.5 text-[11px] font-semibold text-[#7ae0a5] hover:bg-[#2f8f5b]/40"
                          >
                            <WhatsAppSvg className="h-3.5 w-3.5" /> Chat
                          </a>
                        </div>
                      </div>

                      {b.items?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-2.5">
                          {b.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-white/10 bg-[#121f18] px-2.5 py-1 text-[11px] text-[#d7dfd8]"
                            >
                              {it.quantity}× {it.product_name} ({it.variant_label})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "inventory" && (
            <section className="space-y-6 rounded-3xl border border-white/10 bg-[#121f18] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Pantry Pricing, Stock & New Products
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewProduct((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#c9a449] px-4 py-2 text-xs font-semibold text-[#0d1611]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showNewProduct ? "Close Form" : "Add New Product"}
                </button>
              </div>

              {showNewProduct && (
                <form
                  onSubmit={handleCreateProduct}
                  className="grid gap-3 rounded-2xl border border-[#c9a449]/35 bg-[#0d1611] p-5 text-xs sm:grid-cols-2"
                >
                  <input
                    required
                    placeholder="Product Name (e.g. Crayfish Premium Pack)"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  />
                  <select
                    value={newProd.category}
                    onChange={(e) =>
                      setNewProd({
                        ...newProd,
                        category: e.target.value as typeof newProd.category,
                      })
                    }
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  >
                    <option value="grains">grains</option>
                    <option value="condiments">condiments</option>
                    <option value="proteins">proteins</option>
                    <option value="crates">crates</option>
                    <option value="addons">addons</option>
                  </select>
                  <input
                    required
                    placeholder="Short tagline"
                    value={newProd.tagline}
                    onChange={(e) => setNewProd({ ...newProd, tagline: e.target.value })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white sm:col-span-2"
                  />
                  <textarea
                    required
                    placeholder="Full product description"
                    value={newProd.description}
                    onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white sm:col-span-2"
                  />
                  <input
                    required
                    placeholder="Initial pack label (e.g. 500g Jar)"
                    value={newProd.variantLabel}
                    onChange={(e) => setNewProd({ ...newProd, variantLabel: e.target.value })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  />
                  <select
                    value={newProd.imagePath}
                    onChange={(e) => setNewProd({ ...newProd, imagePath: e.target.value })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  >
                    <option value="/images/products/signature-crate.webp">Crate Photo</option>
                    <option value="/images/products/garri.webp">Garri Pouch Photo</option>
                    <option value="/images/products/kulikuli.webp">Kuli-kuli Jar Photo</option>
                    <option value="/images/products/iru.webp">Iru Photo</option>
                    <option value="/images/products/ponmo.webp">Ponmo Photo</option>
                    <option value="/images/products/dried-fish.webp">Dried Fish Photo</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="Price NGN (0 = WhatsApp Quote)"
                    value={newProd.priceNgn}
                    onChange={(e) => setNewProd({ ...newProd, priceNgn: Number(e.target.value) })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="Stock Qty"
                    value={newProd.stockQty}
                    onChange={(e) => setNewProd({ ...newProd, stockQty: Number(e.target.value) })}
                    className="rounded-xl border border-white/15 bg-[#121f18] px-3 py-2 text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-[#2f8f5b] px-5 py-2.5 font-semibold text-white sm:col-span-2"
                  >
                    Publish Product to Storefront
                  </button>
                </form>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.variants.map((v) => {
                  const edit = variantEdits[v.id] ?? {
                    priceNgn: v.price_ngn,
                    stockQty: v.stock_qty,
                    isActive: v.is_active === 1,
                  };
                  return (
                    <div
                      key={v.id}
                      className="rounded-2xl border border-white/10 bg-[#0d1611] p-4 text-xs"
                    >
                      <p className="font-semibold text-white">{v.product_name}</p>
                      <p className="text-[#b3c0b6]">{v.label}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="text-[10px] text-[#8da092]">
                          Price ₦ (0=Quote)
                          <input
                            type="number"
                            min={0}
                            value={edit.priceNgn}
                            onChange={(e) =>
                              setVariantEdits((prev) => ({
                                ...prev,
                                [v.id]: { ...edit, priceNgn: Number(e.target.value) },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-white/15 bg-[#121f18] px-2 py-1 text-xs text-white"
                          />
                        </label>
                        <label className="text-[10px] text-[#8da092]">
                          Stock Qty
                          <input
                            type="number"
                            min={0}
                            value={edit.stockQty}
                            onChange={(e) =>
                              setVariantEdits((prev) => ({
                                ...prev,
                                [v.id]: { ...edit, stockQty: Number(e.target.value) },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-white/15 bg-[#121f18] px-2 py-1 text-xs text-white"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-[#d7dfd8]">
                          <input
                            type="checkbox"
                            checked={edit.isActive}
                            onChange={(e) =>
                              setVariantEdits((prev) => ({
                                ...prev,
                                [v.id]: { ...edit, isActive: e.target.checked },
                              }))
                            }
                            className="accent-[#2f8f5b]"
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => saveVariant(v.id)}
                          className="rounded-full bg-[#c9a449] px-3 py-1 text-[11px] font-semibold text-[#0d1611] hover:bg-[#e0c276]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "slots" && (
            <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6">
              <h2 className="font-display text-2xl font-semibold text-white">
                14-Day Dispatch Slot Capacity Control
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.slots.slice(0, 24).map((s) => {
                  const edit = slotEdits[s.id] ?? {
                    maxCapacity: s.max_capacity,
                    isActive: s.is_active === 1,
                  };
                  return (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-white/10 bg-[#0d1611] p-4 text-xs"
                    >
                      <p className="font-semibold text-[#e0c276]">{formatSlotDate(s.slot_date)}</p>
                      <p className="text-white">{s.window_label}</p>
                      <p className="mt-1 text-[11px] text-[#8da092]">
                        Booked: {s.booked_count} / {s.max_capacity}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          aria-label={`Capacity for ${s.slot_date} ${s.window_label}`}
                          value={edit.maxCapacity}
                          onChange={(e) =>
                            setSlotEdits((prev) => ({
                              ...prev,
                              [s.id]: { ...edit, maxCapacity: Number(e.target.value) },
                            }))
                          }
                          className="w-20 rounded-lg border border-white/15 bg-[#121f18] px-2 py-1 text-white"
                        />
                        <label className="inline-flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={edit.isActive}
                            onChange={(e) =>
                              setSlotEdits((prev) => ({
                                ...prev,
                                [s.id]: { ...edit, isActive: e.target.checked },
                              }))
                            }
                            className="accent-[#2f8f5b]"
                          />
                          Open
                        </label>
                        <button
                          type="button"
                          onClick={() => saveSlot(s.id)}
                          className="rounded-full bg-[#c9a449] px-3 py-1 text-[11px] font-semibold text-[#0d1611]"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6 lg:col-span-5">
                <div className="flex items-center gap-2 text-[#e0c276]">
                  <KeyRound className="h-4 w-4" />
                  <h2 className="font-display text-2xl font-semibold text-white">
                    Rotate Admin Password
                  </h2>
                </div>
                <p className="mt-1.5 text-xs text-[#b3c0b6]">
                  Changing your password automatically clears any local bootstrap credential file.
                </p>
                <form onSubmit={handleChangePassword} className="mt-4 space-y-3 text-xs">
                  <input
                    type="password"
                    required
                    placeholder="Current password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-[#0d1611] px-3 py-2.5 text-white"
                  />
                  <input
                    type="password"
                    required
                    minLength={10}
                    placeholder="New password (min 10 chars, letter + number)"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-[#0d1611] px-3 py-2.5 text-white"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#c9a449] py-2.5 font-semibold text-[#0d1611]"
                  >
                    Update Password
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#121f18] p-6 lg:col-span-7">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Security & Operations Audit Log
                </h2>
                <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-xs">
                  {data.auditLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d1611] px-3.5 py-2"
                    >
                      <div>
                        <span className="font-semibold text-[#7ae0a5]">{log.action}</span>
                        <span className="ml-2 text-[#b3c0b6]">
                          by {log.actor} · {log.target_type} ({log.target_id})
                        </span>
                      </div>
                      <span className="tabular-nums text-[11px] text-[#8da092]">
                        {log.created_at}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
