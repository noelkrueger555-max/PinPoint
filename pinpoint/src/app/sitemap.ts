import type { MetadataRoute } from "next";

const ROUTES = [
  "/",
  "/play",
  "/duel",
  "/albums",
  "/library",
  "/upload",
  "/share",
  "/leaderboard",
  "/stats",
  "/friends",
  "/achievements",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint.local";
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${base.replace(/\/$/, "")}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
