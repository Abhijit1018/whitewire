import type { MetadataRoute } from "next";
import { SITE_URL, PRIVATE_ROUTES } from "@/core/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in surfaces carry no public value and some expose project ids.
        disallow: [...PRIVATE_ROUTES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
