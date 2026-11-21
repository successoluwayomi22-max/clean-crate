import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db/client";
import {
  BookingValidationError,
  cancelCustomerBooking,
  createAtomicBooking,
  getAdminDashboardData,
  getCatalogProducts,
  getDeliveryZones,
  getUpcomingBookingSlots,
  lookupBookingForCustomer,
  rescheduleCustomerBooking,
} from "../src/db/queries";
import { hashPassword, verifyPassword } from "../src/lib/security";

function runChecks() {
  console.log("1. Checking generated assets & 90 real video WebP frames...");
  const manifestPath = path.join(process.cwd(), "public", "frames", "manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Missing frames manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.totalFrames, 90, "Expected 90 extracted real video frames");
  assert.ok(fs.existsSync(path.join(process.cwd(), "public", "frames", "v2_frame_0001.webp")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "public", "frames", "v2_frame_0090.webp")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "public", "images", "brand", "logo-seal.webp")));
  assert.ok(fs.existsSync(path.join(process.cwd(), "public", "images", "brand", "logo-emblem.webp")));

  console.log("2. Checking SQLite schema, RSC plain-object prototypes & seeded catalog...");
  const db = getDb();
  const products = getCatalogProducts();
  assert.ok(products.length >= 6, "Expected at least 6 seeded products");
  assert.equal(Object.getPrototypeOf(products[0]), Object.prototype, "Product must be plain object");
  assert.equal(Object.getPrototypeOf(products[0].variants[0]), Object.prototype, "Variant must be plain object");
  const slugs = new Set(products.map((p) => p.slug));
  for (const required of ["ijebu-garri", "crunchy-kulikuli", "fermented-iru", "smoked-ponmo", "kiln-dried-fish"]) {
    assert.ok(slugs.has(required), `Missing seeded product slug: ${required}`);
  }

  const zones = getDeliveryZones();
  assert.ok(zones.length >= 2, "Expected Abuja & Lokoja service states");
  assert.ok(
    zones.some((z) => z.name === "Lokoja") && zones.some((z) => z.name === "Abuja"),
    "Expected Lokoja & Abuja state zones"
  );
  assert.equal(Object.getPrototypeOf(zones[0]), Object.prototype, "Zone must be plain object");
  const slots = getUpcomingBookingSlots();
  assert.ok(slots.length >= 15, "Expected upcoming booking slots");
  assert.equal(Object.getPrototypeOf(slots[0]), Object.prototype, "Slot must be plain object");

  console.log("3. Checking password hashing & verification...");
  const hashed = hashPassword("CleanCrateTest#2026");
  assert.ok(verifyPassword("CleanCrateTest#2026", hashed), "Password verification failed");
  assert.ok(!verifyPassword("wrong-password", hashed), "Wrong password unexpectedly passed");

  console.log("4. Checking atomic booking, WhatsApp-only method & idempotency...");
  const garri = products.find((p) => p.slug === "ijebu-garri");
  assert.ok(garri, "Expected ijebu-garri product");
  const variant = garri.variants[0];
  const zone = zones.find((z) => z.is_pickup === 0);
  assert.ok(zone, "Expected delivery zone");
  const openSlots = slots.filter((s) => s.remaining > 0);
  const slot1 = openSlots[0];
  const slot2 = openSlots[1];
  const beforeStock = variant.stock_qty;
  const beforeSlot1Booked = slot1.booked_count;
  const beforeSlot2Booked = slot2.booked_count;
  const idemKey = `verify-${Date.now()}`;

  const receipt = createAtomicBooking({
    customerName: "Verification Tester",
    customerEmail: "verify@cleancrate.ng",
    customerPhone: "+2348099991436",
    deliveryAddress: "12 Admiralty Way, Lekki Phase 1",
    deliveryNotes: "Test atomic booking",
    zoneId: zone.id,
    slotId: slot1.id,
    paymentMethod: "whatsapp",
    idempotencyKey: idemKey,
    items: [{ variantId: variant.id, quantity: 2 }],
  });

  assert.equal(receipt.paymentMethod, "whatsapp");
  assert.equal(receipt.subtotalNgn, variant.price_ngn * 2);
  assert.equal(receipt.deliveryFeeNgn, zone.fee_ngn);
  assert.equal(receipt.totalNgn, variant.price_ngn * 2 + zone.fee_ngn);

  // Duplicate idempotent request returns identical reference without charging stock twice
  const duplicateReceipt = createAtomicBooking({
    customerName: "Verification Tester",
    customerEmail: "verify@cleancrate.ng",
    customerPhone: "+2348099991436",
    deliveryAddress: "12 Admiralty Way, Lekki Phase 1",
    deliveryNotes: "Test atomic booking",
    zoneId: zone.id,
    slotId: slot1.id,
    paymentMethod: "whatsapp",
    idempotencyKey: idemKey,
    items: [{ variantId: variant.id, quantity: 2 }],
  });
  assert.equal(duplicateReceipt.referenceCode, receipt.referenceCode, "Idempotency returned different booking");

  const afterVariant = db.prepare("SELECT stock_qty FROM product_variants WHERE id = ?").get(variant.id);
  const afterSlot1 = db.prepare("SELECT booked_count FROM booking_slots WHERE id = ?").get(slot1.id);
  assert.equal(afterVariant.stock_qty, beforeStock - 2, "Stock decremented incorrectly");
  assert.equal(afterSlot1.booked_count, beforeSlot1Booked + 1, "Slot count incremented incorrectly");

  console.log("5. Checking tracking privacy guard & self-service reschedule/cancel...");
  assert.equal(
    lookupBookingForCustomer(receipt.referenceCode, "wrong@email.com"),
    null,
    "Tracking leaked order with wrong verifier"
  );
  const verifiedTrack = lookupBookingForCustomer(receipt.referenceCode, "1436");
  assert.ok(verifiedTrack, "Tracking failed with valid phone last-4 verifier");

  const rescheduled = rescheduleCustomerBooking(receipt.referenceCode, "1436", slot2.id);
  assert.equal(rescheduled.slotWindow, slot2.window_label);
  const slot1AfterMove = db.prepare("SELECT booked_count FROM booking_slots WHERE id = ?").get(slot1.id);
  const slot2AfterMove = db.prepare("SELECT booked_count FROM booking_slots WHERE id = ?").get(slot2.id);
  assert.equal(slot1AfterMove.booked_count, beforeSlot1Booked, "Old slot count not released");
  assert.equal(slot2AfterMove.booked_count, beforeSlot2Booked + 1, "New slot count not incremented");

  const cancelled = cancelCustomerBooking(receipt.referenceCode, "1436");
  assert.equal(cancelled.bookingStatus, "cancelled");
  const stockRestored = db.prepare("SELECT stock_qty FROM product_variants WHERE id = ?").get(variant.id);
  const slot2Restored = db.prepare("SELECT booked_count FROM booking_slots WHERE id = ?").get(slot2.id);
  assert.equal(stockRestored.stock_qty, beforeStock, "Stock not restored on cancel");
  assert.equal(slot2Restored.booked_count, beforeSlot2Booked, "Slot not released on cancel");

  console.log("6. Checking oversell protection & admin dashboard integrity...");
  assert.throws(
    () =>
      createAtomicBooking({
        customerName: "Oversell Attacker",
        customerEmail: "a@b.com",
        customerPhone: "+2348011112222",
        deliveryAddress: "Lagos",
        zoneId: zone.id,
        slotId: slot1.id,
        paymentMethod: "whatsapp",
        items: [{ variantId: variant.id, quantity: 99999 }],
      }),
    BookingValidationError
  );

  const adminData = getAdminDashboardData();
  assert.ok(Array.isArray(adminData.variants) && adminData.variants.length > 0);
  assert.ok(Array.isArray(adminData.slots) && adminData.slots.length > 0);

  // Clean up test rows cleanly
  db.exec("BEGIN IMMEDIATE");
  db.prepare("DELETE FROM bookings WHERE reference_code = ?").run(receipt.referenceCode);
  db.prepare("DELETE FROM audit_logs WHERE target_id = ?").run(receipt.referenceCode);
  db.exec("COMMIT");

  console.log("ALL CLEAN CRATE FULL-STACK & SECURITY VERIFICATIONS PASSED!");
}

runChecks();
