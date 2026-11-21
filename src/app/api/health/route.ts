import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS products FROM products WHERE is_active = 1").get() as {
      products: number;
    };
    return NextResponse.json({
      status: "ok",
      service: "clean-crate",
      products: row.products,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

