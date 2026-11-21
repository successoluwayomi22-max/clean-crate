import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getAuthenticatedAdmin, recordAudit } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const variantPatchSchema = z.object({
  priceNgn: z.number().int().min(0).max(5000000),
  stockQty: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const variantId = Number(id);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = variantPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid variant update" }, { status: 400 });
  }

  const db = getDb();
  const res = db
    .prepare(
      "UPDATE product_variants SET price_ngn = ?, stock_qty = ?, is_active = ? WHERE id = ?"
    )
    .run(parsed.data.priceNgn, parsed.data.stockQty, parsed.data.isActive ? 1 : 0, variantId);

  if (res.changes === 0) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  recordAudit(admin.email, "variant.updated", "product_variant", String(variantId), parsed.data);
  return NextResponse.json({ ok: true });
}

