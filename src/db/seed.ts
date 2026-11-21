import { getDb } from "@/db/client";

function main() {
  const db = getDb();
  const productCount = (db.prepare("SELECT COUNT(*) AS cnt FROM products").get() as { cnt: number }).cnt;
  const variantCount = (db.prepare("SELECT COUNT(*) AS cnt FROM product_variants").get() as { cnt: number }).cnt;
  const zoneCount = (db.prepare("SELECT COUNT(*) AS cnt FROM delivery_zones").get() as { cnt: number }).cnt;
  const slotCount = (db.prepare("SELECT COUNT(*) AS cnt FROM booking_slots").get() as { cnt: number }).cnt;
  console.log(
    `Clean Crate DB ready -> products=${productCount}, variants=${variantCount}, zones=${zoneCount}, slots=${slotCount}`
  );
}

main();

