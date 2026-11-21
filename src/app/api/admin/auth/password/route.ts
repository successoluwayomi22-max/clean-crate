import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getAuthenticatedAdmin, recordAudit } from "@/lib/auth";
import { checkRateLimit, getClientIp, hashPassword, verifyPassword, verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  currentPassword: z.string().min(6).max(200),
  newPassword: z
    .string()
    .min(10, "New password must be at least 10 characters.")
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
      message: "New password must include at least one letter and one number.",
    }),
});

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`admin-pw:${ip}:${admin.id}`, 5, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many password attempts." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid password format." },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, password_hash FROM admin_users WHERE id = ?")
    .get(admin.id) as { id: number; password_hash: string } | undefined;

  if (!user || !verifyPassword(parsed.data.currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const nextHash = hashPassword(parsed.data.newPassword);
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(nextHash, admin.id);

  // Remove initial local bootstrap notice once owner sets a permanent password
  const bootstrapPath = path.join(process.cwd(), "data", ".admin-bootstrap.txt");
  if (fs.existsSync(bootstrapPath)) {
    try {
      fs.unlinkSync(bootstrapPath);
    } catch {
      // ignore
    }
  }

  recordAudit(admin.email, "admin.password_changed", "admin_user", String(admin.id));
  return NextResponse.json({ ok: true });
}
