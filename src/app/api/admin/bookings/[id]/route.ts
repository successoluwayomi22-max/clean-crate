import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getAuthenticatedAdmin, recordAudit } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  bookingStatus: z.enum(["confirmed", "packing", "dispatched", "completed", "cancelled"]),
  paymentStatus: z.enum(["pending", "awaiting_verification", "paid"]),
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
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const db = getDb();
  const res = db
    .prepare(
      "UPDATE bookings SET booking_status = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(parsed.data.bookingStatus, parsed.data.paymentStatus, bookingId);

  if (res.changes === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  recordAudit(admin.email, "booking.updated", "booking", String(bookingId), parsed.data);
  return NextResponse.json({ ok: true });
}

