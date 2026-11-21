import { NextResponse } from "next/server";
import { getAdminDashboardData } from "@/db/queries";
import { getAuthenticatedAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = getAdminDashboardData();
  return NextResponse.json({ admin, ...data });
}

