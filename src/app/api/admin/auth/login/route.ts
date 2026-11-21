import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ADMIN_COOKIE_NAME, createAdminSession, recordAudit } from "@/lib/auth";
import { checkRateLimit, getClientIp, verifyPassword, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(200),
});

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Locked temporarily for security." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and password are required." }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name, password_hash, role FROM admin_users WHERE LOWER(email) = ?")
    .get(parsed.data.email.toLowerCase()) as
    | { id: number; email: string; name: string; password_hash: string; role: string }
    | undefined;

  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const { cookieValue } = createAdminSession(user.id, ip);
  recordAudit(user.email, "admin.login", "admin_user", String(user.id), { ip });

  const response = NextResponse.json({
    admin: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  });

  return response;
}

