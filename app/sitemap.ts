import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/core/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    // The landing page is the entry point; docs change most often.
    changeFrequency: route === "" ? "weekly" : route === "/docs" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/docs" || route === "/about" ? 0.8 : 0.5,
  }));
}
