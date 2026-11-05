import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/staff", "/verify", "/api/", "/plan?"] },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
