"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import type { ProductWithVariants } from "@/db/queries";
import { ProductCard } from "@/components/ProductCard";

const CATEGORIES = [
  { key: "all", label: "All Essentials" },
  { key: "crates", label: "Curated Crates" },
  { key: "grains", label: "Grains & Garri" },
  { key: "condiments", label: "Kuli-Kuli & Iru" },
  { key: "proteins", label: "Ponmo & Dried Fish" },
];

export function ShopCatalogClient({
  products,
  initialCategory = "all",
}: {
  products: ProductWithVariants[];
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "name_asc">("featured");

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const catOk = category === "all" || p.category.toLowerCase() === category;
      if (!catOk) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q)
      );
    });

    if (sortBy === "name_asc") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, category, search, sortBy]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#121f18] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#cfa84c] text-[#0b130e]"
                    : "border border-white/10 bg-[#0b130e]/70 text-[#d7dfd8] hover:border-white/25 hover:text-white"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex items-center">
            <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#cfa84c]" />
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "featured" | "name_asc")}
              className="w-full rounded-full border border-white/15 bg-[#0b130e] py-2 pl-8 pr-4 text-xs text-white outline-none focus:border-[#cfa84c] sm:w-auto"
            >
              <option value="featured">Sort: Featured</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8da092]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search garri, iru, ponmo..."
              aria-label="Search food essentials"
              className="w-full rounded-full border border-white/15 bg-[#0b130e] py-2 pl-10 pr-4 text-xs text-white placeholder-[#7c8f81] outline-none transition focus:border-[#cfa84c]"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-[#121f18] p-12 text-center">
          <p className="font-display text-2xl text-white">No pantry items matched your search</p>
          <p className="mt-2 text-xs text-[#b4c3b8]">
            Try clearing your filter or search term to see all Clean Crate essentials.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setSearch("");
              setSortBy("featured");
            }}
            className="mt-5 rounded-full bg-[#cfa84c] px-5 py-2 text-xs font-semibold text-[#0b130e]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
