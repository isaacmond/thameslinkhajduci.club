import type { MetadataRoute } from "next";
import { getData } from "@/lib/data";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getData();
  const now = new Date();
  const fixed = ["", "/squad", "/matches", "/seasons", "/stats", "/records", "/money", "/data"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.8 }));
  return [
    ...fixed,
    ...data.players.map((p) => ({ url: `${SITE_URL}/squad/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...data.seasons.map((s) => ({ url: `${SITE_URL}/seasons/${s.id.toLowerCase()}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...data.matches.map((m) => ({ url: `${SITE_URL}/matches/${m.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
