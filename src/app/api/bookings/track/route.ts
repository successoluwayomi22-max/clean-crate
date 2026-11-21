import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { lookupBookingForCustomer } from "@/db/queries";
import { checkRateLimit, getClientIp, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const trackSchema = z.object({
  referenceCode: z.string().trim().min(5).max(32),
  verifier: z.string().trim().min(4).max(120),
});

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`track:${ip}`, 20, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many tracking requests. Please pause briefly." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide both your booking reference (e.g. CC-2026-...) and email or last 4 phone digits." },
      { status: 400 }
    );
  }

  const receipt = lookupBookingForCustomer(parsed.data.referenceCode, parsed.data.verifier);
  if (!receipt) {
    return NextResponse.json(
      { error: "No matching booking found. Double-check your reference code and email/phone digits." },
      { status: 404 }
    );
  }

  return NextResponse.json({ booking: receipt });
}

