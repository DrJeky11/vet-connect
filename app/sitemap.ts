import type { MetadataRoute } from "next";
import { CATEGORY_IDS } from "@/lib/schema";
import { getPublicResources } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
  const pages = ["", "/intake", "/topics", "/resources", "/updates", "/help", "/print", "/updates/paper-form", "/suggest", "/about"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...CATEGORY_IDS.map((c) => ({ url: `${base}/topics/${c}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...getPublicResources().map((r) => ({
      url: `${base}/resources/${r.id}`,
      lastModified: r.last_verified_at ?? r.source_checked_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
