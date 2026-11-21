import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProductWithVariantAdmin } from "@/db/queries";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGES = [
  "/images/products/garri.webp",
  "/images/products/kulikuli.webp",
  "/images/products/iru.webp",
  "/images/products/ponmo.webp",
  "/images/products/dried-fish.webp",
  "/images/products/signature-crate.webp",
] as const;

const createProductSchema = z.object({
  name: z.string().trim().min(3).max(120),
  category: z.enum(["grains", "condiments", "proteins", "crates", "addons"]),
  tagline: z.string().trim().min(6).max(200),
  description: z.string().trim().min(10).max(800),
  origin: z.string().trim().min(2).max(120),
  storageNote: z.string().trim().min(5).max(240),
  imagePath: z.enum(ALLOWED_IMAGES),
  variantLabel: z.string().trim().min(2).max(80),
  weightGrams: z.number().int().min(50).max(100000),
  priceNgn: z.number().int().min(0).max(5000000),
  stockQty: z.number().int().min(0).max(10000),
});

export async function POST(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid product details." },
      { status: 400 }
    );
  }

  const created = createProductWithVariantAdmin({
    ...parsed.data,
    actor: admin.email,
  });

  return NextResponse.json({ product: created }, { status: 201 });
}
