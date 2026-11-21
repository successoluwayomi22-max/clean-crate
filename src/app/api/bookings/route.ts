import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingValidationError, createAtomicBooking } from "@/db/queries";
import { checkRateLimit, getClientIp, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const createBookingSchema = z.object({
  customerName: z.string().trim().min(2, "Full name is required").max(120),
  customerEmail: z.string().trim().email("Enter a valid email address").max(160),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[+0-9\s()-]{8,24}$/, "Enter a valid phone or WhatsApp number"),
  deliveryAddress: z.string().trim().max(280).default(""),
  deliveryNotes: z.string().trim().max(400).optional(),
  zoneId: z.number().int().positive(),
  slotId: z.number().int().positive(),
  paymentMethod: z.literal("whatsapp").default("whatsapp"),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  website: z.string().max(120).optional(),
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(30),
      })
    )
    .min(1, "Your crate is empty")
    .max(25),
});

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`booking:${ip}`, 12, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Please check your booking details.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  // Honeypot field check — real human users leave this blank
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ error: "Unable to process booking." }, { status: 400 });
  }

  try {
    const receipt = createAtomicBooking(parsed.data);
    return NextResponse.json({ booking: receipt }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: "Unable to complete booking right now. Please try again." },
      { status: 500 }
    );
  }
}
