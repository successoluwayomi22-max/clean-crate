import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAuthenticatedAdmin, recordAudit, revokeCurrentAdminSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (admin) {
    recordAudit(admin.email, "admin.logout", "admin_user", String(admin.id));
  }
  await revokeCurrentAdminSession();

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

