import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinpoint.local";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block private surfaces from indexing
        disallow: ["/library", "/upload", "/friends", "/stats", "/play/lobby", "/duel"],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
