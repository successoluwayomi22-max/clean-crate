import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts, getDeliveryZones, getUpcomingBookingSlots } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("q") ?? undefined;

  const products = getCatalogProducts({ category, search });
  const zones = getDeliveryZones();
  const slots = getUpcomingBookingSlots();

  return NextResponse.json({
    products,
    zones,
    slots,
  });
}

