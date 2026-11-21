import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingValidationError,
  cancelCustomerBooking,
  getUpcomingBookingSlots,
  rescheduleCustomerBooking,
} from "@/db/queries";
import { checkRateLimit, getClientIp, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const manageSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reschedule"),
    referenceCode: z.string().trim().min(5).max(32),
    verifier: z.string().trim().min(4).max(120),
    newSlotId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("cancel"),
    referenceCode: z.string().trim().min(5).max(32),
    verifier: z.string().trim().min(4).max(120),
  }),
]);

export async function GET() {
  const slots = getUpcomingBookingSlots().filter((s) => s.remaining > 0);
  return NextResponse.json({ slots });
}

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`booking-manage:${ip}`, 15, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many booking modification requests. Please wait briefly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = manageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking management payload." }, { status: 400 });
  }

  try {
    const receipt =
      parsed.data.action === "reschedule"
        ? rescheduleCustomerBooking(
            parsed.data.referenceCode,
            parsed.data.verifier,
            parsed.data.newSlotId
          )
        : cancelCustomerBooking(parsed.data.referenceCode, parsed.data.verifier);

    return NextResponse.json({ booking: receipt });
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Could not update booking." }, { status: 500 });
  }
}
