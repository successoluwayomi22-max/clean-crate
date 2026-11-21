"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  variantId: number;
  productId: number;
  slug: string;
  productName: string;
  variantLabel: string;
  unitPriceNgn: number;
  imagePath: string;
  quantity: number;
  maxStock: number;
}

interface CartContextValue {
  items: CartItem[];
  isDrawerOpen: boolean;
  totalItems: number;
  subtotalNgn: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQty: (variantId: number, qty: number) => void;
  removeItem: (variantId: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const STORAGE_KEY = "cc_crate_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (entry) =>
                entry &&
                typeof entry.variantId === "number" &&
                typeof entry.quantity === "number" &&
                entry.quantity > 0
            )
          );
        }
      }
    } catch {
      // Ignore storage parsing errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    const safeQty = Math.max(1, Math.min(30, qty));
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const nextQty = Math.min(item.maxStock || 30, existing.quantity + safeQty);
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, quantity: nextQty } : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.maxStock || 30, safeQty) }];
    });
    setIsDrawerOpen(true);
  }, []);

  const updateQty = useCallback((variantId: number, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(i.maxStock || 30, Math.max(1, qty)) }
          : i
      )
    );
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalNgn = items.reduce((sum, i) => sum + i.unitPriceNgn * i.quantity, 0);
    return {
      items,
      isDrawerOpen,
      totalItems,
      subtotalNgn,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      openDrawer,
      closeDrawer,
    };
  }, [items, isDrawerOpen, addItem, updateQty, removeItem, clearCart, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}

