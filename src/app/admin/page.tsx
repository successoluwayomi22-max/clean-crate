import type { Metadata } from "next";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations Portal",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await getAuthenticatedAdmin();

  return (
    <div className="cc-grain min-h-screen bg-[#0d1611] pb-20 pt-28 text-[#f6f3ea]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminDashboardClient initiallyAuthenticated={Boolean(admin)} />
      </div>
    </div>
  );
}

