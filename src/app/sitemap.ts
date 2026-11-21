import type { MetadataRoute } from "next";
import { getCatalogProducts } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleancrate.ng";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/book`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/track`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/refund-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/cookies`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = getCatalogProducts();
    productRoutes = products.map((p) => ({
      url: `${siteUrl}/shop/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    productRoutes = [];
  }

  return [...staticRoutes, ...productRoutes];
}

