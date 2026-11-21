import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "@/lib/security";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cleancrate.db");

let dbInstance: DatabaseSync | null = null;
let initialized = false;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);
  }
  if (!initialized) {
    initialized = true;
    initSchema(dbInstance);
    seedDatabaseIfNeeded(dbInstance);
    ensureUpcomingSlots(dbInstance, 14);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      origin TEXT NOT NULL,
      storage_note TEXT NOT NULL,
      image_path TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      weight_grams INTEGER NOT NULL,
      price_ngn INTEGER NOT NULL CHECK (price_ngn >= 0),
      stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
      sku TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      state_region TEXT NOT NULL,
      fee_ngn INTEGER NOT NULL CHECK (fee_ngn >= 0),
      eta_window TEXT NOT NULL,
      is_pickup INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS booking_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_date TEXT NOT NULL,
      window_code TEXT NOT NULL,
      window_label TEXT NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 12 CHECK (max_capacity >= 0),
      booked_count INTEGER NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(slot_date, window_code)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_notes TEXT NOT NULL DEFAULT '',
      zone_id INTEGER NOT NULL REFERENCES delivery_zones(id),
      slot_id INTEGER NOT NULL REFERENCES booking_slots(id),
      fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('delivery', 'pickup')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('whatsapp', 'bank_transfer', 'online_card')),
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'awaiting_verification', 'paid')),
      booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'packing', 'dispatched', 'completed', 'cancelled')),
      subtotal_ngn INTEGER NOT NULL CHECK (subtotal_ngn >= 0),
      delivery_fee_ngn INTEGER NOT NULL CHECK (delivery_fee_ngn >= 0),
      total_ngn INTEGER NOT NULL CHECK (total_ngn >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booking_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      variant_id INTEGER NOT NULL REFERENCES product_variants(id),
      product_name TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      unit_price_ngn INTEGER NOT NULL CHECK (unit_price_ngn >= 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      line_total_ngn INTEGER NOT NULL CHECK (line_total_ngn >= 0)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      ip_hint TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(reference_code);
    CREATE INDEX IF NOT EXISTS idx_slots_date ON booking_slots(slot_date);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
  `);

  const bookingCols = db.prepare("PRAGMA table_info(bookings)").all() as Array<{ name: string }>;
  if (!bookingCols.some((c) => c.name === "idempotency_key")) {
    db.exec("ALTER TABLE bookings ADD COLUMN idempotency_key TEXT;");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;"
  );
}

function seedDatabaseIfNeeded(db: DatabaseSync): void {
  const countRow = db.prepare("SELECT COUNT(*) AS cnt FROM products").get() as { cnt: number };
  if (countRow.cnt === 0) {
    seedCatalogAndZones(db);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(
      "migration_v2_lokoja_abuja_quote",
      "done"
    );
  } else {
    migrateExistingToLokojaAbujaAndQuotes(db);
  }
  migrateToFlexiblePackagingAndStatesOnly(db);
  seedAdminIfMissing(db);
}

function migrateToFlexiblePackagingAndStatesOnly(db: DatabaseSync): void {
  const flag = db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get("migration_v3_flexible_pack_states_only") as { value: string } | undefined;
  if (flag?.value === "done") return;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE product_variants SET label = 'Custom Pack (Size Discussed on WhatsApp)', price_ngn = 0"
    ).run();
    db.prepare(
      "UPDATE products SET origin = 'Clean Crate Studio · Abuja & Lokoja'"
    ).run();

    db.prepare("UPDATE delivery_zones SET is_active = 0").run();
    const stateZones = [
      {
        name: "Abuja",
        state_region: "Abuja",
        fee_ngn: 0,
        eta_window: "Delivery & pickup discussed directly on WhatsApp",
        is_pickup: 0,
      },
      {
        name: "Lokoja",
        state_region: "Lokoja",
        fee_ngn: 0,
        eta_window: "Delivery & pickup discussed directly on WhatsApp",
        is_pickup: 0,
      },
    ];

    const upsertZone = db.prepare(`
      INSERT INTO delivery_zones (name, state_region, fee_ngn, eta_window, is_pickup, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(name) DO UPDATE SET
        state_region = excluded.state_region,
        fee_ngn = excluded.fee_ngn,
        eta_window = excluded.eta_window,
        is_pickup = excluded.is_pickup,
        is_active = 1
    `);
    for (const z of stateZones) {
      upsertZone.run(z.name, z.state_region, z.fee_ngn, z.eta_window, z.is_pickup);
    }

    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(
      "migration_v3_flexible_pack_states_only",
      "done"
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function migrateExistingToLokojaAbujaAndQuotes(db: DatabaseSync): void {
  const flag = db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get("migration_v2_lokoja_abuja_quote") as { value: string } | undefined;
  if (flag?.value === "done") return;

  db.exec("BEGIN IMMEDIATE");
  try {
    // Switch legacy fixed placeholder prices/fees to quote mode (0 = Quote on WhatsApp)
    db.prepare("UPDATE product_variants SET price_ngn = 0").run();
    db.prepare("UPDATE delivery_zones SET fee_ngn = 0").run();
    db.prepare(
      "UPDATE products SET origin = 'Clean Crate Studio, Lokoja & Abuja' WHERE origin LIKE '%Lagos%'"
    ).run();

    // Deactivate old Lagos-only zones not referenced by bookings, and insert Lokoja & Abuja zones cleanly
    db.prepare("UPDATE delivery_zones SET is_active = 0").run();
    const lokojaAbujaZones = [
      {
        name: "Abuja Central (Wuse, Maitama, Garki, Asokoro)",
        state_region: "Abuja FCT",
        fee_ngn: 0,
        eta_window: "Same-day or booked 4hr delivery window",
        is_pickup: 0,
      },
      {
        name: "Abuja Suburbs (Gwarinpa, Kubwa, Lugbe, Jabi, Utako)",
        state_region: "Abuja FCT",
        fee_ngn: 0,
        eta_window: "Booked 4hr courier dispatch window",
        is_pickup: 0,
      },
      {
        name: "Lokoja Metro (GRA, Ganaja, Lokongoma, Adankolo, Felele)",
        state_region: "Kogi State",
        fee_ngn: 0,
        eta_window: "Same-day or booked dispatch slot",
        is_pickup: 0,
      },
      {
        name: "Lokoja ↔ Abuja Express Route",
        state_region: "Kogi / FCT Corridor",
        fee_ngn: 0,
        eta_window: "Scheduled morning or afternoon van dispatch",
        is_pickup: 0,
      },
      {
        name: "Self-Pickup — Lokoja Hub (Ganaja Road)",
        state_region: "Lokoja Pickup",
        fee_ngn: 0,
        eta_window: "Ready inside your reserved pickup window",
        is_pickup: 1,
      },
      {
        name: "Self-Pickup — Abuja Hub (Wuse II)",
        state_region: "Abuja Pickup",
        fee_ngn: 0,
        eta_window: "Ready inside your reserved pickup window",
        is_pickup: 1,
      },
    ];

    const upsertZone = db.prepare(`
      INSERT INTO delivery_zones (name, state_region, fee_ngn, eta_window, is_pickup, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(name) DO UPDATE SET
        state_region = excluded.state_region,
        fee_ngn = excluded.fee_ngn,
        eta_window = excluded.eta_window,
        is_pickup = excluded.is_pickup,
        is_active = 1
    `);
    for (const z of lokojaAbujaZones) {
      upsertZone.run(z.name, z.state_region, z.fee_ngn, z.eta_window, z.is_pickup);
    }

    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(
      "migration_v2_lokoja_abuja_quote",
      "done"
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function seedAdminIfMissing(db: DatabaseSync): void {
  const adminCount = db.prepare("SELECT COUNT(*) AS cnt FROM admin_users").get() as { cnt: number };
  if (adminCount.cnt > 0) return;

  const email = (process.env.ADMIN_SEED_EMAIL || "admin@cleancrate.ng").trim().toLowerCase();
  let password = process.env.ADMIN_SEED_PASSWORD?.trim();
  let generatedLocally = false;

  if (!password) {
    password = crypto.randomBytes(12).toString("base64url");
    generatedLocally = true;
  }

  const passwordHash = hashPassword(password);
  db.prepare(
    "INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
  ).run(email, "Clean Crate Operations", passwordHash, "owner");

  if (generatedLocally) {
    const bootstrapPath = path.join(DATA_DIR, ".admin-bootstrap.txt");
    fs.writeFileSync(
      bootstrapPath,
      `Clean Crate Local Admin Bootstrap\nEmail: ${email}\nPassword: ${password}\nChange or override via ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD before production deployment.\n`,
      { mode: 0o600 }
    );
  }
}

export function ensureUpcomingSlots(db: DatabaseSync, daysAhead = 14): void {
  const windows = [
    { code: "morning", label: "08:00 – 12:00 WAT", capacity: 12 },
    { code: "afternoon", label: "12:00 – 16:00 WAT", capacity: 14 },
    { code: "evening", label: "16:00 – 19:00 WAT", capacity: 10 },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO booking_slots (slot_date, window_code, window_label, max_capacity, booked_count, is_active)
    VALUES (?, ?, ?, ?, 0, 1)
  `);

  const today = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;
    for (const w of windows) {
      insertStmt.run(isoDate, w.code, w.label, w.capacity);
    }
  }
}

export function seedCatalogAndZones(db: DatabaseSync): void {
  const products = [
    {
      slug: "ijebu-garri",
      name: "Ijebu Gold-Crisp Garri",
      category: "grains",
      tagline: "Stone-free, double-sieved sour-tangy cassava flakes for soaking or Eba.",
      description:
        "Thoughtfully sourced from vetted Ijebu-Ode processors, our signature white-gold garri is double-sieved in spotless stainless trays, checked for zero grit, and heat-sealed immediately in moisture-barrier pouches so every spoon stays crisp.",
      origin: "Ijebu-Ode, Ogun State",
      storage_note: "Store sealed in a cool dry pantry for up to 9 months.",
      image_path: "/images/products/garri.webp",
      is_featured: 1,
      sort_order: 1,
      variants: [
        { label: "1kg Stand-Up Pouch", weight_grams: 1000, price_ngn: 0, stock_qty: 65, sku: "CC-GAR-1K" },
        { label: "2.5kg Airtight Jar/Pouch", weight_grams: 2500, price_ngn: 0, stock_qty: 42, sku: "CC-GAR-25K" },
        { label: "5kg Family Reserve Pack", weight_grams: 5000, price_ngn: 0, stock_qty: 28, sku: "CC-GAR-5K" },
      ],
    },
    {
      slug: "crunchy-kulikuli",
      name: "Roasted Peanut Kuli-Kuli",
      category: "condiments",
      tagline: "Crisp artisanal groundnut crunch lightly spiced with dried ginger and cloves.",
      description:
        "Freshly pressed from Grade-A northern groundnuts and drained cleanly so it arrives crunchy rather than oil-soaked. Ideal alongside chilled soaked garri or as a clean protein-rich snack.",
      origin: "Bida & Kogi Processing Network",
      storage_note: "Keep lid tightly closed; stays crisp for 16 weeks.",
      image_path: "/images/products/kulikuli.webp",
      is_featured: 1,
      sort_order: 2,
      variants: [
        { label: "400g Gold-Lid Jar", weight_grams: 400, price_ngn: 0, stock_qty: 54, sku: "CC-KUL-400" },
        { label: "850g Pantry Jar", weight_grams: 850, price_ngn: 0, stock_qty: 34, sku: "CC-KUL-850" },
        { label: "2kg Event & Catering Pack", weight_grams: 2000, price_ngn: 0, stock_qty: 18, sku: "CC-KUL-2K" },
      ],
    },
    {
      slug: "fermented-iru",
      name: "Hygienic Fermented Iru (Locust Beans)",
      category: "condiments",
      tagline: "Cleanly dehulled Iru Woro — aromatic, sand-free, and double vacuum-sealed.",
      description:
        "Traditional fermented African locust beans prepared in raised hygienic racks without grit or ash residue. Vacuum-sealed to lock in deep umami depth for Ewedu, Efo Riro, and Egusi without kitchen odor leakage.",
      origin: "Ogbomoso & Kogi Cooperative",
      storage_note: "Refrigerate or freeze after opening for up to 6 months.",
      image_path: "/images/products/iru.webp",
      is_featured: 1,
      sort_order: 3,
      variants: [
        { label: "250g Vacuum Jar", weight_grams: 250, price_ngn: 0, stock_qty: 48, sku: "CC-IRU-250" },
        { label: "500g Double-Seal Pack", weight_grams: 500, price_ngn: 0, stock_qty: 30, sku: "CC-IRU-500" },
        { label: "1kg Chef Bulk Pack", weight_grams: 1000, price_ngn: 0, stock_qty: 16, sku: "CC-IRU-1K" },
      ],
    },
    {
      slug: "smoked-ponmo",
      name: "Thick-Cut Washed & Smoked Ponmo",
      category: "proteins",
      tagline: "Tender, cleanly scraped smoked cowhide strips — pre-washed and ready to simmer.",
      description:
        "Hand-trimmed thick brown ponmo washed thoroughly in warm salted water, lightly smoked for rich depth, and vacuum-sealed cleanly so you skip messy prep.",
      origin: "Clean Crate Kitchen Network",
      storage_note: "Keep frozen or chilled; boil 10 minutes before seasoning.",
      image_path: "/images/products/ponmo.webp",
      is_featured: 1,
      sort_order: 4,
      variants: [
        { label: "500g Vacuum Pack", weight_grams: 500, price_ngn: 0, stock_qty: 40, sku: "CC-PON-500" },
        { label: "1kg Family Pack", weight_grams: 1000, price_ngn: 0, stock_qty: 25, sku: "CC-PON-1K" },
        { label: "2.5kg Bulk Crate Pack", weight_grams: 2500, price_ngn: 0, stock_qty: 12, sku: "CC-PON-25K" },
      ],
    },
    {
      slug: "kiln-dried-fish",
      name: "Kiln-Dried Smoked Catfish (Eja Osan)",
      category: "proteins",
      tagline: "Slow wood-kiln dried whole catfish — cleanly gutted, zero bitter soot.",
      description:
        "Cleanly degutted and dried inside temperature-controlled wood kilns rather than open roadside fires, producing flaky golden-amber flesh that elevates soups and stews without grit.",
      origin: "Lokoja River Basin & Smokehouse",
      storage_note: "Store airtight in cool dry place or freezer up to 6 months.",
      image_path: "/images/products/dried-fish.webp",
      is_featured: 1,
      sort_order: 5,
      variants: [
        { label: "500g Box (3–4 Whole Fish)", weight_grams: 500, price_ngn: 0, stock_qty: 32, sku: "CC-FSH-500" },
        { label: "1kg Crate Pack (6–8 Fish)", weight_grams: 1000, price_ngn: 0, stock_qty: 20, sku: "CC-FSH-1K" },
        { label: "2kg Master Box", weight_grams: 2000, price_ngn: 0, stock_qty: 10, sku: "CC-FSH-2K" },
      ],
    },
    {
      slug: "garri-ritual-crate",
      name: "The Soaking Garri & Kuli-Kuli Crate",
      category: "crates",
      tagline: "Our signature sequence in one neat box: Ijebu Garri, Crunchy Kuli-Kuli & Cane Sugar.",
      description:
        "Inspired by our opening kitchen ritual — curated crisp Ijebu Garri paired with a glass jar of spiced Kuli-Kuli and sealed unbleached cane sugar inside a signature giftable Clean Crate.",
      origin: "Clean Crate Studio, Lokoja & Abuja",
      storage_note: "Ready-to-serve dry essentials; keep sealed away from moisture.",
      image_path: "/images/products/signature-crate.webp",
      is_featured: 1,
      sort_order: 6,
      variants: [
        { label: "Starter Crate (2.5kg Total)", weight_grams: 2500, price_ngn: 0, stock_qty: 30, sku: "CC-CRT-SOAK1" },
        { label: "Family & Host Crate (5.5kg)", weight_grams: 5500, price_ngn: 0, stock_qty: 18, sku: "CC-CRT-SOAK2" },
      ],
    },
    {
      slug: "essential-kitchen-crate",
      name: "The Essential Nigerian Kitchen Crate",
      category: "crates",
      tagline: "Complete pantry restock: Garri, Kuli-Kuli, Fermented Iru, Smoked Ponmo & Dried Catfish.",
      description:
        "Thoughtfully assembled monthly food crate combining all five Clean Crate signature staples, hygienically compartmentalized in food-grade pouches and jars with tamper-evident gold seals.",
      origin: "Clean Crate Studio, Lokoja & Abuja",
      storage_note: "Transfer Ponmo to freezer upon arrival; dry goods keep cool & sealed.",
      image_path: "/images/products/signature-crate.webp",
      is_featured: 1,
      sort_order: 7,
      variants: [
        { label: "Standard Household Crate", weight_grams: 4500, price_ngn: 0, stock_qty: 22, sku: "CC-CRT-STD" },
        { label: "Grand / Family Bulk Crate", weight_grams: 9500, price_ngn: 0, stock_qty: 14, sku: "CC-CRT-MAX" },
      ],
    },
    {
      slug: "yellow-garri",
      name: "Bendel Gold Yellow Garri",
      category: "grains",
      tagline: "Rich palm-oil infused roasted cassava grains — smooth draw for Eba and daily meals.",
      description:
        "Roasted gently with pure fresh red palm oil for warm amber colour and mellow nutty flavour. Cleanly sieved and moisture-checked before pouch sealing.",
      origin: "Edo & Kogi Cooperative",
      storage_note: "Store cool and sealed away from direct sunlight.",
      image_path: "/images/products/garri.webp",
      is_featured: 0,
      sort_order: 8,
      variants: [
        { label: "1kg Sealed Pouch", weight_grams: 1000, price_ngn: 0, stock_qty: 44, sku: "CC-YGR-1K" },
        { label: "5kg Family Pack", weight_grams: 5000, price_ngn: 0, stock_qty: 20, sku: "CC-YGR-5K" },
      ],
    },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (slug, name, category, tagline, description, origin, storage_note, image_path, is_featured, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, label, weight_grams, price_ngn, stock_qty, sku, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  db.exec("BEGIN");
  try {
    for (const p of products) {
      const res = insertProduct.run(
        p.slug,
        p.name,
        p.category,
        p.tagline,
        p.description,
        p.origin,
        p.storage_note,
        p.image_path,
        p.is_featured,
        p.sort_order
      );
      const productId = Number(res.lastInsertRowid);
      for (const v of p.variants) {
        insertVariant.run(productId, v.label, v.weight_grams, v.price_ngn, v.stock_qty, v.sku);
      }
    }

    const zones = [
      {
        name: "Abuja Central (Wuse, Maitama, Garki, Asokoro)",
        state_region: "Abuja FCT",
        fee_ngn: 0,
        eta_window: "Same-day or booked 4hr delivery window",
        is_pickup: 0,
      },
      {
        name: "Abuja Suburbs (Gwarinpa, Kubwa, Lugbe, Jabi, Utako)",
        state_region: "Abuja FCT",
        fee_ngn: 0,
        eta_window: "Booked 4hr courier dispatch window",
        is_pickup: 0,
      },
      {
        name: "Lokoja Metro (GRA, Ganaja, Lokongoma, Adankolo, Felele)",
        state_region: "Kogi State",
        fee_ngn: 0,
        eta_window: "Same-day or booked dispatch slot",
        is_pickup: 0,
      },
      {
        name: "Lokoja ↔ Abuja Express Route",
        state_region: "Kogi / FCT Corridor",
        fee_ngn: 0,
        eta_window: "Scheduled morning or afternoon van dispatch",
        is_pickup: 0,
      },
      {
        name: "Self-Pickup — Lokoja Hub (Ganaja Road)",
        state_region: "Lokoja Pickup",
        fee_ngn: 0,
        eta_window: "Ready inside your reserved pickup window",
        is_pickup: 1,
      },
      {
        name: "Self-Pickup — Abuja Hub (Wuse II)",
        state_region: "Abuja Pickup",
        fee_ngn: 0,
        eta_window: "Ready inside your reserved pickup window",
        is_pickup: 1,
      },
    ];

    const insertZone = db.prepare(`
      INSERT INTO delivery_zones (name, state_region, fee_ngn, eta_window, is_pickup, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    for (const z of zones) {
      insertZone.run(z.name, z.state_region, z.fee_ngn, z.eta_window, z.is_pickup);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

