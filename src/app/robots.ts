import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cleancrate.ng";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/book", "/track", "/contact", "/privacy-policy", "/refund-policy", "/terms", "/cookies"],
        disallow: ["/admin", "/admin/", "/api/", "/checkout/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

