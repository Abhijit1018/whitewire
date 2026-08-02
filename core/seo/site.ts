/** Canonical origin. Override per environment; the branded domain is primary. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://whitewire.abhijit-singh.in";

export const SITE_NAME = "WhiteWire";

export const SITE_TAGLINE = "The AI-native canvas for product teams";

export const SITE_DESCRIPTION =
  "WhiteWire turns rough ideas into connected boards, wireframes, database schemas, APIs and docs on one AI-native canvas. Bring your own LLM — your keys, your data, your freedom.";

/** Routes worth indexing. Everything behind auth is excluded deliberately. */
export const PUBLIC_ROUTES = [
  "",
  "/about",
  "/docs",
  "/changelog",
  "/contact",
  "/marketplace",
  "/privacy",
  "/terms",
] as const;

/** Signed-in surfaces — no value in an index, and some leak project ids. */
export const PRIVATE_ROUTES = [
  "/dashboard",
  "/settings",
  "/account",
  "/memory",
  "/artifacts",
  "/p/",
  "/api/",
  "/auth/",
  "/sign-in",
  "/sign-up",
] as const;

/**
 * Schema.org description of the product. Search engines use it for rich
 * results; assistants use it to answer "what is WhiteWire" without guessing.
 */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to use with your own LLM API key.",
    },
    featureList: [
      "AI-native infinite canvas",
      "Sketch recognition — hand-drawn shapes become structured boards",
      "Wireframe generation for mobile, tablet and desktop",
      "Database schema and ER diagram nodes",
      "Architecture and flowchart diagrams",
      "Mind map, tree, matrix and timeline layouts",
      "Knowledge graph memory built from your boards",
      "Bring your own LLM — OpenAI, Anthropic, Google, Groq, OpenRouter and any OpenAI-compatible provider",
    ],
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}
