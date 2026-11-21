import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getAuthenticatedAdmin, recordAudit } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const slotPatchSchema = z.object({
  maxCapacity: z.number().int().min(0).max(200),
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
  const slotId = Number(id);
  if (!Number.isInteger(slotId) || slotId <= 0) {
    return NextResponse.json({ error: "Invalid slot ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = slotPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slot update" }, { status: 400 });
  }

  const db = getDb();
  const res = db
    .prepare("UPDATE booking_slots SET max_capacity = ?, is_active = ? WHERE id = ?")
    .run(parsed.data.maxCapacity, parsed.data.isActive ? 1 : 0, slotId);

  if (res.changes === 0) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  recordAudit(admin.email, "slot.updated", "booking_slot", String(slotId), parsed.data);
  return NextResponse.json({ ok: true });
}

