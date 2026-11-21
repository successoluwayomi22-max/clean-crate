import { ensureUpcomingSlots, getDb } from "@/db/client";
import { generateBookingReference, sanitizePlainText } from "@/lib/security";

/**
 * Node's built-in `node:sqlite` returns null-prototype objects (`Object.create(null)`),
 * which React Server Component Flight serialization rejects when passed to Client Components.
 */
function toPlain<T>(row: T): T {
  return Object.assign({}, row);
}

function toPlainList<T>(rows: T[]): T[] {
  return rows.map((row) => Object.assign({}, row));
}

export interface ProductVariantRow {
  id: number;
  product_id: number;
  label: string;
  weight_grams: number;
  price_ngn: number;
  stock_qty: number;
  sku: string;
  is_active: number;
}

export interface ProductWithVariants {
  id: number;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  origin: string;
  storage_note: string;
  image_path: string;
  is_featured: number;
  is_active: number;
  sort_order: number;
  variants: ProductVariantRow[];
}

export interface DeliveryZoneRow {
  id: number;
  name: string;
  state_region: string;
  fee_ngn: number;
  eta_window: string;
  is_pickup: number;
  is_active: number;
}

export interface BookingSlotRow {
  id: number;
  slot_date: string;
  window_code: string;
  window_label: string;
  max_capacity: number;
  booked_count: number;
  remaining: number;
  is_active: number;
}

export interface BookingItemInput {
  variantId: number;
  quantity: number;
}

export interface CreateBookingInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  zoneId: number;
  slotId: number;
  paymentMethod?: "whatsapp";
  idempotencyKey?: string;
  items: BookingItemInput[];
}

export interface BookingReceipt {
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNotes: string;
  fulfillmentType: "delivery" | "pickup";
  zoneName: string;
  slotDate: string;
  slotWindow: string;
  paymentMethod: string;
  paymentStatus: string;
  bookingStatus: string;
  subtotalNgn: number;
  deliveryFeeNgn: number;
  totalNgn: number;
  createdAt: string;
  items: Array<{
    productName: string;
    variantLabel: string;
    unitPriceNgn: number;
    quantity: number;
    lineTotalNgn: number;
  }>;
}

export function getCatalogProducts(options?: {
  category?: string;
  search?: string;
  featuredOnly?: boolean;
}): ProductWithVariants[] {
  const db = getDb();
  const products = toPlainList(
    db
      .prepare(
        `SELECT id, slug, name, category, tagline, description, origin, storage_note, image_path, is_featured, is_active, sort_order
         FROM products
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`
      )
      .all() as Omit<ProductWithVariants, "variants">[]
  );

  const variants = toPlainList(
    db
      .prepare(
        `SELECT id, product_id, label, weight_grams, price_ngn, stock_qty, sku, is_active
         FROM product_variants
         WHERE is_active = 1
         ORDER BY price_ngn ASC`
      )
      .all() as unknown as ProductVariantRow[]
  );

  const variantMap = new Map<number, ProductVariantRow[]>();
  for (const v of variants) {
    const list = variantMap.get(v.product_id) ?? [];
    list.push(v);
    variantMap.set(v.product_id, list);
  }

  let result: ProductWithVariants[] = products
    .map((p) => ({
      ...p,
      variants: variantMap.get(p.id) ?? [],
    }))
    .filter((p) => p.variants.length > 0);

  if (options?.featuredOnly) {
    result = result.filter((p) => p.is_featured === 1);
  }
  if (options?.category && options.category !== "all") {
    const cat = options.category.toLowerCase();
    result = result.filter((p) => p.category.toLowerCase() === cat);
  }
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  return result;
}

export function getProductBySlug(slug: string): ProductWithVariants | null {
  const db = getDb();
  const product = db
    .prepare(
      `SELECT id, slug, name, category, tagline, description, origin, storage_note, image_path, is_featured, is_active, sort_order
       FROM products
       WHERE slug = ? AND is_active = 1`
    )
    .get(slug) as Omit<ProductWithVariants, "variants"> | undefined;

  if (!product) return null;

  const variants = toPlainList(
    db
      .prepare(
        `SELECT id, product_id, label, weight_grams, price_ngn, stock_qty, sku, is_active
         FROM product_variants
         WHERE product_id = ? AND is_active = 1
         ORDER BY price_ngn ASC`
      )
      .all(product.id) as unknown as ProductVariantRow[]
  );

  return { ...toPlain(product), variants };
}

export function getDeliveryZones(): DeliveryZoneRow[] {
  const db = getDb();
  return toPlainList(
    db
      .prepare(
        `SELECT id, name, state_region, fee_ngn, eta_window, is_pickup, is_active
         FROM delivery_zones
         WHERE is_active = 1
         ORDER BY is_pickup ASC, fee_ngn ASC`
      )
      .all() as unknown as DeliveryZoneRow[]
  );
}

export function getUpcomingBookingSlots(): BookingSlotRow[] {
  const db = getDb();
  ensureUpcomingSlots(db, 14);
  const todayIso = new Date().toISOString().slice(0, 10);
  const rows = toPlainList(
    db
      .prepare(
        `SELECT id, slot_date, window_code, window_label, max_capacity, booked_count, is_active
         FROM booking_slots
         WHERE is_active = 1 AND slot_date >= ?
         ORDER BY slot_date ASC,
           CASE window_code WHEN 'morning' THEN 1 WHEN 'afternoon' THEN 2 ELSE 3 END ASC`
      )
      .all(todayIso) as Array<Omit<BookingSlotRow, "remaining">>
  );

  return rows.map((row) => ({
    ...row,
    remaining: Math.max(0, row.max_capacity - row.booked_count),
  }));
}

export class BookingValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createAtomicBooking(input: CreateBookingInput): BookingReceipt {
  const db = getDb();

  // Deduplicate identical variants cleanly
  const mergedQuantities = new Map<number, number>();
  for (const item of input.items) {
    mergedQuantities.set(item.variantId, (mergedQuantities.get(item.variantId) ?? 0) + item.quantity);
  }
  if (mergedQuantities.size === 0) {
    throw new BookingValidationError("Please add at least one Clean Crate item before booking.");
  }

  const cleanName = sanitizePlainText(input.customerName, 120);
  const cleanEmail = sanitizePlainText(input.customerEmail, 160).toLowerCase();
  const cleanPhone = sanitizePlainText(input.customerPhone, 32);
  const cleanAddress = sanitizePlainText(input.deliveryAddress, 280);
  const cleanNotes = sanitizePlainText(input.deliveryNotes || "", 400);
  const cleanIdempotencyKey = input.idempotencyKey
    ? sanitizePlainText(input.idempotencyKey, 80)
    : null;

  db.exec("BEGIN IMMEDIATE");
  try {
    if (cleanIdempotencyKey) {
      const existingByKey = db
        .prepare("SELECT id FROM bookings WHERE idempotency_key = ?")
        .get(cleanIdempotencyKey) as { id: number } | undefined;
      if (existingByKey) {
        db.exec("COMMIT");
        const existingReceipt = buildReceiptById(existingByKey.id, false);
        if (existingReceipt) return existingReceipt;
      }
    }

    const zone = db
      .prepare("SELECT id, name, fee_ngn, is_pickup, is_active FROM delivery_zones WHERE id = ?")
      .get(input.zoneId) as
      | { id: number; name: string; fee_ngn: number; is_pickup: number; is_active: number }
      | undefined;

    if (!zone || zone.is_active !== 1) {
      throw new BookingValidationError("Selected delivery or pickup zone is unavailable.");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const slot = db
      .prepare(
        "SELECT id, slot_date, window_label, max_capacity, booked_count, is_active FROM booking_slots WHERE id = ?"
      )
      .get(input.slotId) as
      | {
          id: number;
          slot_date: string;
          window_label: string;
          max_capacity: number;
          booked_count: number;
          is_active: number;
        }
      | undefined;

    if (!slot || slot.is_active !== 1 || slot.slot_date < todayIso) {
      throw new BookingValidationError("Selected booking date or time slot is no longer available.");
    }
    if (slot.booked_count >= slot.max_capacity) {
      throw new BookingValidationError("That time window is fully booked. Please select another slot.", 409);
    }

    const resolvedItems: Array<{
      productId: number;
      variantId: number;
      productName: string;
      variantLabel: string;
      unitPriceNgn: number;
      quantity: number;
      lineTotalNgn: number;
    }> = [];

    let subtotalNgn = 0;

    for (const [variantId, quantity] of mergedQuantities.entries()) {
      const variant = db
        .prepare(
          `SELECT v.id, v.product_id, v.label, v.price_ngn, v.stock_qty, v.is_active,
                  p.name AS product_name, p.is_active AS product_active
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
           WHERE v.id = ?`
        )
        .get(variantId) as
        | {
            id: number;
            product_id: number;
            label: string;
            price_ngn: number;
            stock_qty: number;
            is_active: number;
            product_name: string;
            product_active: number;
          }
        | undefined;

      if (!variant || variant.is_active !== 1 || variant.product_active !== 1) {
        throw new BookingValidationError("One of the selected items is no longer active.");
      }
      if (variant.stock_qty < quantity) {
        throw new BookingValidationError(
          `Only ${variant.stock_qty} unit(s) left for ${variant.product_name} (${variant.label}).`,
          409
        );
      }

      const decRes = db
        .prepare("UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?")
        .run(quantity, variantId, quantity);
      if (decRes.changes === 0) {
        throw new BookingValidationError(
          `Stock changed while processing ${variant.product_name}. Please refresh your cart.`,
          409
        );
      }

      const lineTotalNgn = variant.price_ngn * quantity;
      subtotalNgn += lineTotalNgn;
      resolvedItems.push({
        productId: variant.product_id,
        variantId: variant.id,
        productName: variant.product_name,
        variantLabel: variant.label,
        unitPriceNgn: variant.price_ngn,
        quantity,
        lineTotalNgn,
      });
    }

    const slotUpdate = db
      .prepare(
        "UPDATE booking_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < max_capacity"
      )
      .run(slot.id);
    if (slotUpdate.changes === 0) {
      throw new BookingValidationError("That time slot just filled up. Please choose another window.", 409);
    }

    const fulfillmentType: "delivery" | "pickup" = zone.is_pickup === 1 ? "pickup" : "delivery";
    const deliveryFeeNgn = fulfillmentType === "pickup" ? 0 : zone.fee_ngn;
    const totalNgn = subtotalNgn + deliveryFeeNgn;
    const paymentMethod = "whatsapp" as const;
    const paymentStatus = "pending" as const;
    const referenceCode = generateBookingReference();

    const bookingInsert = db
      .prepare(
        `INSERT INTO bookings (
          reference_code, customer_name, customer_email, customer_phone,
          delivery_address, delivery_notes, zone_id, slot_id,
          fulfillment_type, payment_method, payment_status, booking_status,
          subtotal_ngn, delivery_fee_ngn, total_ngn, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)`
      )
      .run(
        referenceCode,
        cleanName,
        cleanEmail,
        cleanPhone,
        fulfillmentType === "pickup" ? zone.name : cleanAddress,
        cleanNotes,
        zone.id,
        slot.id,
        fulfillmentType,
        paymentMethod,
        paymentStatus,
        subtotalNgn,
        deliveryFeeNgn,
        totalNgn,
        cleanIdempotencyKey
      );

    const bookingId = Number(bookingInsert.lastInsertRowid);
    const itemInsert = db.prepare(
      `INSERT INTO booking_items (
        booking_id, product_id, variant_id, product_name, variant_label,
        unit_price_ngn, quantity, line_total_ngn
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of resolvedItems) {
      itemInsert.run(
        bookingId,
        item.productId,
        item.variantId,
        item.productName,
        item.variantLabel,
        item.unitPriceNgn,
        item.quantity,
        item.lineTotalNgn
      );
    }

    db.prepare(
      "INSERT INTO audit_logs (actor, action, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)"
    ).run(
      "customer",
      "booking.created",
      "booking",
      referenceCode,
      JSON.stringify({ totalNgn, slotId: slot.id, zoneId: zone.id, paymentMethod })
    );

    db.exec("COMMIT");

    const createdRow = db
      .prepare("SELECT created_at FROM bookings WHERE id = ?")
      .get(bookingId) as { created_at: string };

    return {
      referenceCode,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      deliveryAddress: fulfillmentType === "pickup" ? zone.name : cleanAddress,
      deliveryNotes: cleanNotes,
      fulfillmentType,
      zoneName: zone.name,
      slotDate: slot.slot_date,
      slotWindow: slot.window_label,
      paymentMethod,
      paymentStatus,
      bookingStatus: "confirmed",
      subtotalNgn,
      deliveryFeeNgn,
      totalNgn,
      createdAt: createdRow.created_at,
      items: resolvedItems.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        unitPriceNgn: i.unitPriceNgn,
        quantity: i.quantity,
        lineTotalNgn: i.lineTotalNgn,
      })),
    };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function buildReceiptById(bookingId: number, maskPhone: boolean): BookingReceipt | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT b.*, z.name AS zone_name, s.slot_date, s.window_label
       FROM bookings b
       JOIN delivery_zones z ON z.id = b.zone_id
       JOIN booking_slots s ON s.id = b.slot_id
       WHERE b.id = ?`
    )
    .get(bookingId) as
    | {
        id: number;
        reference_code: string;
        customer_name: string;
        customer_email: string;
        customer_phone: string;
        delivery_address: string;
        delivery_notes: string;
        fulfillment_type: "delivery" | "pickup";
        payment_method: string;
        payment_status: string;
        booking_status: string;
        subtotal_ngn: number;
        delivery_fee_ngn: number;
        total_ngn: number;
        created_at: string;
        zone_name: string;
        slot_date: string;
        window_label: string;
      }
    | undefined;

  if (!row) return null;

  const items = db
    .prepare(
      `SELECT product_name, variant_label, unit_price_ngn, quantity, line_total_ngn
       FROM booking_items
       WHERE booking_id = ?`
    )
    .all(row.id) as Array<{
    product_name: string;
    variant_label: string;
    unit_price_ngn: number;
    quantity: number;
    line_total_ngn: number;
  }>;

  const displayedPhone =
    maskPhone && row.customer_phone.length > 6
      ? `${row.customer_phone.slice(0, 5)}••••${row.customer_phone.slice(-3)}`
      : row.customer_phone;

  return {
    referenceCode: row.reference_code,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: displayedPhone,
    deliveryAddress: row.delivery_address,
    deliveryNotes: row.delivery_notes,
    fulfillmentType: row.fulfillment_type,
    zoneName: row.zone_name,
    slotDate: row.slot_date,
    slotWindow: row.window_label,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    bookingStatus: row.booking_status,
    subtotalNgn: row.subtotal_ngn,
    deliveryFeeNgn: row.delivery_fee_ngn,
    totalNgn: row.total_ngn,
    createdAt: row.created_at,
    items: items.map((i) => ({
      productName: i.product_name,
      variantLabel: i.variant_label,
      unitPriceNgn: i.unit_price_ngn,
      quantity: i.quantity,
      lineTotalNgn: i.line_total_ngn,
    })),
  };
}

function findVerifiedCustomerBookingId(referenceCode: string, verifier: string): {
  id: number;
  reference_code: string;
  slot_id: number;
  booking_status: string;
} | null {
  const db = getDb();
  const normalizedRef = sanitizePlainText(referenceCode, 32).toUpperCase();
  const normalizedVerifier = sanitizePlainText(verifier, 120).toLowerCase();
  if (!normalizedRef || !normalizedVerifier) return null;

  const row = db
    .prepare(
      "SELECT id, reference_code, customer_email, customer_phone, slot_id, booking_status FROM bookings WHERE UPPER(reference_code) = ?"
    )
    .get(normalizedRef) as
    | {
        id: number;
        reference_code: string;
        customer_email: string;
        customer_phone: string;
        slot_id: number;
        booking_status: string;
      }
    | undefined;

  if (!row) return null;
  const phoneDigits = row.customer_phone.replace(/\D/g, "");
  const verifierDigits = normalizedVerifier.replace(/\D/g, "");
  const matchesPhoneTail =
    verifierDigits.length >= 4 && phoneDigits.endsWith(verifierDigits.slice(-4));
  const matchesEmail = row.customer_email.toLowerCase() === normalizedVerifier;

  if (!matchesPhoneTail && !matchesEmail) return null;
  return {
    id: row.id,
    reference_code: row.reference_code,
    slot_id: row.slot_id,
    booking_status: row.booking_status,
  };
}

export function lookupBookingForCustomer(referenceCode: string, verifier: string): BookingReceipt | null {
  const match = findVerifiedCustomerBookingId(referenceCode, verifier);
  if (!match) return null;
  return buildReceiptById(match.id, true);
}

export function rescheduleCustomerBooking(
  referenceCode: string,
  verifier: string,
  newSlotId: number
): BookingReceipt {
  const db = getDb();
  const match = findVerifiedCustomerBookingId(referenceCode, verifier);
  if (!match) {
    throw new BookingValidationError("Booking verification failed.", 404);
  }
  if (match.booking_status !== "confirmed") {
    throw new BookingValidationError(
      "Only confirmed bookings not yet packed can be rescheduled online. Please message us on WhatsApp.",
      409
    );
  }
  if (match.slot_id === newSlotId) {
    const existing = buildReceiptById(match.id, true);
    if (!existing) throw new BookingValidationError("Booking missing.", 404);
    return existing;
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    const targetSlot = db
      .prepare(
        "SELECT id, slot_date, max_capacity, booked_count, is_active FROM booking_slots WHERE id = ?"
      )
      .get(newSlotId) as
      | { id: number; slot_date: string; max_capacity: number; booked_count: number; is_active: number }
      | undefined;

    if (!targetSlot || targetSlot.is_active !== 1 || targetSlot.slot_date < todayIso) {
      throw new BookingValidationError("Selected new time slot is unavailable.");
    }
    if (targetSlot.booked_count >= targetSlot.max_capacity) {
      throw new BookingValidationError("That slot is full. Pick another window.", 409);
    }

    const inc = db
      .prepare(
        "UPDATE booking_slots SET booked_count = booked_count + 1 WHERE id = ? AND booked_count < max_capacity"
      )
      .run(newSlotId);
    if (inc.changes === 0) {
      throw new BookingValidationError("Slot filled while rescheduling.", 409);
    }

    db.prepare(
      "UPDATE booking_slots SET booked_count = MAX(0, booked_count - 1) WHERE id = ?"
    ).run(match.slot_id);

    db.prepare(
      "UPDATE bookings SET slot_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newSlotId, match.id);

    db.prepare(
      "INSERT INTO audit_logs (actor, action, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)"
    ).run(
      "customer",
      "booking.rescheduled",
      "booking",
      match.reference_code,
      JSON.stringify({ fromSlotId: match.slot_id, toSlotId: newSlotId })
    );

    db.exec("COMMIT");
    const updated = buildReceiptById(match.id, true);
    if (!updated) throw new BookingValidationError("Booking missing after update.", 500);
    return updated;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function cancelCustomerBooking(referenceCode: string, verifier: string): BookingReceipt {
  const db = getDb();
  const match = findVerifiedCustomerBookingId(referenceCode, verifier);
  if (!match) {
    throw new BookingValidationError("Booking verification failed.", 404);
  }
  if (match.booking_status === "cancelled") {
    const existing = buildReceiptById(match.id, true);
    if (!existing) throw new BookingValidationError("Booking missing.", 404);
    return existing;
  }
  if (match.booking_status !== "confirmed") {
    throw new BookingValidationError(
      "Only confirmed bookings not yet packed can be cancelled online. Contact Clean Crate on WhatsApp.",
      409
    );
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const items = db
      .prepare("SELECT variant_id, quantity FROM booking_items WHERE booking_id = ?")
      .all(match.id) as Array<{ variant_id: number; quantity: number }>;

    for (const item of items) {
      db.prepare("UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?").run(
        item.quantity,
        item.variant_id
      );
    }

    db.prepare(
      "UPDATE booking_slots SET booked_count = MAX(0, booked_count - 1) WHERE id = ?"
    ).run(match.slot_id);

    db.prepare(
      "UPDATE bookings SET booking_status = 'cancelled', updated_at = datetime('now') WHERE id = ?"
    ).run(match.id);

    db.prepare(
      "INSERT INTO audit_logs (actor, action, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)"
    ).run("customer", "booking.cancelled", "booking", match.reference_code, "{}");

    db.exec("COMMIT");
    const cancelled = buildReceiptById(match.id, true);
    if (!cancelled) throw new BookingValidationError("Booking missing.", 500);
    return cancelled;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getAdminDashboardData() {
  const db = getDb();
  ensureUpcomingSlots(db, 14);

  const kpis = toPlain(
    db
      .prepare(
        `SELECT
          COUNT(*) AS total_bookings,
          COALESCE(SUM(CASE WHEN booking_status != 'cancelled' THEN total_ngn ELSE 0 END), 0) AS total_revenue_ngn,
          COALESCE(SUM(CASE WHEN booking_status IN ('confirmed', 'packing') THEN 1 ELSE 0 END), 0) AS active_bookings
         FROM bookings`
      )
      .get() as { total_bookings: number; total_revenue_ngn: number; active_bookings: number }
  );

  const bookingsRaw = toPlainList(
    db
      .prepare(
        `SELECT b.*, z.name AS zone_name, s.slot_date, s.window_label
         FROM bookings b
         JOIN delivery_zones z ON z.id = b.zone_id
         JOIN booking_slots s ON s.id = b.slot_id
         ORDER BY b.id DESC
         LIMIT 60`
      )
      .all() as Array<Record<string, unknown>>
  );

  const bookingIds = bookingsRaw.map((b) => Number(b.id)).filter(Boolean);
  const itemsByBooking = new Map<number, Array<Record<string, unknown>>>();
  if (bookingIds.length > 0) {
    const allBookingItems = toPlainList(
      db
        .prepare("SELECT booking_id, product_name, variant_label, quantity, line_total_ngn FROM booking_items")
        .all() as Array<Record<string, unknown>>
    );
    for (const item of allBookingItems) {
      const bid = Number(item.booking_id);
      const list = itemsByBooking.get(bid) ?? [];
      list.push(item);
      itemsByBooking.set(bid, list);
    }
  }

  const bookings = bookingsRaw.map((b) => ({
    ...b,
    items: itemsByBooking.get(Number(b.id)) ?? [],
  }));

  const variants = toPlainList(
    db
      .prepare(
        `SELECT v.*, p.name AS product_name, p.category
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         ORDER BY p.sort_order ASC, v.price_ngn ASC`
      )
      .all() as Array<Record<string, unknown>>
  );

  const slots = getUpcomingBookingSlots();
  const auditLogs = toPlainList(
    db
      .prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 40")
      .all() as Array<Record<string, unknown>>
  );

  return { kpis, bookings, variants, slots, auditLogs };
}

export function createProductWithVariantAdmin(input: {
  name: string;
  category: string;
  tagline: string;
  description: string;
  origin: string;
  storageNote: string;
  imagePath: string;
  variantLabel: string;
  weightGrams: number;
  priceNgn: number;
  stockQty: number;
  actor: string;
}): { productId: number; slug: string } {
  const db = getDb();
  const cleanName = sanitizePlainText(input.name, 120);
  const baseSlug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  const sku = `CC-${slug.slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;

  db.exec("BEGIN IMMEDIATE");
  try {
    const prodRes = db
      .prepare(
        `INSERT INTO products (slug, name, category, tagline, description, origin, storage_note, image_path, is_featured, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 99)`
      )
      .run(
        slug,
        cleanName,
        sanitizePlainText(input.category, 32).toLowerCase(),
        sanitizePlainText(input.tagline, 200),
        sanitizePlainText(input.description, 800),
        sanitizePlainText(input.origin, 120),
        sanitizePlainText(input.storageNote, 240),
        input.imagePath
      );
    const productId = Number(prodRes.lastInsertRowid);
    db.prepare(
      `INSERT INTO product_variants (product_id, label, weight_grams, price_ngn, stock_qty, sku, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(
      productId,
      sanitizePlainText(input.variantLabel, 80),
      input.weightGrams,
      input.priceNgn,
      input.stockQty,
      sku
    );

    db.prepare(
      "INSERT INTO audit_logs (actor, action, target_type, target_id, metadata_json) VALUES (?, ?, ?, ?, ?)"
    ).run(input.actor, "product.created", "product", slug, JSON.stringify({ cleanName, priceNgn: input.priceNgn }));

    db.exec("COMMIT");
    return { productId, slug };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

