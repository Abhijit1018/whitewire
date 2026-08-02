import type { Scene } from "@/core/ai/scene";

/**
 * A finished board, shown to people who have not connected a model yet.
 *
 * The product is unusable until you paste an API key, which is the point most
 * trials are lost. This is what one prompt produces — real node types, real
 * links — so the value is visible before any setup. It is a fixed example, not
 * a simulation of the model.
 */
export const EXAMPLE_PROMPT = "A link-shortener with analytics";

export const EXAMPLE_SCENE: Scene = {
  layout: "flow",
  updates: [],
  nodes: [
    {
      id: "api",
      type: "concept",
      title: "Public API",
      body: "Create, resolve and revoke short links",
      size: "md",
    },
    { id: "storage", type: "group", title: "Storage", body: "", size: "xl" },
    {
      id: "links",
      type: "table",
      title: "links",
      body: "",
      size: "lg",
      parent: "storage",
      table: {
        columns: [
          { name: "id", type: "uuid", key: "pk" },
          { name: "slug", type: "text" },
          { name: "target_url", type: "text" },
          { name: "owner_id", type: "uuid", key: "fk" },
          { name: "created_at", type: "timestamptz" },
        ],
      },
    },
    {
      id: "clicks",
      type: "table",
      title: "clicks",
      body: "",
      size: "lg",
      parent: "storage",
      table: {
        columns: [
          { name: "id", type: "uuid", key: "pk" },
          { name: "link_id", type: "uuid", key: "fk" },
          { name: "referrer", type: "text" },
          { name: "country", type: "text" },
          { name: "at", type: "timestamptz" },
        ],
      },
    },
    {
      id: "slugger",
      type: "code",
      title: "generateSlug",
      body: "",
      size: "lg",
      code: {
        language: "typescript",
        source: `const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateSlug(length = 7): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}`,
      },
    },
    {
      id: "dashboard",
      type: "wireframe",
      title: "Analytics dashboard",
      body: "",
      size: "xl",
      wireframe: {
        title: "Analytics",
        device: "desktop",
        elements: [
          { type: "nav", label: "shrt.link", x: 0, y: 0, w: 100, h: 9 },
          { type: "sidebar", label: "Links", x: 0, y: 9, w: 20, h: 91 },
          { type: "header", label: "Performance", x: 24, y: 13, w: 40, h: 9 },
          { type: "search", label: "Find a link", x: 66, y: 13, w: 30, h: 7 },
          { type: "chart", label: "Clicks", x: 24, y: 25, w: 72, h: 28 },
          { type: "table", label: "Top links", x: 24, y: 57, w: 46, h: 34 },
          { type: "avatarRow", label: "Team", x: 74, y: 57, w: 22, h: 22 },
          { type: "pagination", label: "", x: 24, y: 93, w: 30, h: 5 },
        ],
      },
    },
    {
      id: "expiry",
      type: "shape",
      title: "Expired?",
      body: "",
      size: "sm",
      shape: "diamond",
    },
    {
      id: "note",
      type: "note",
      title: "Reserve profanity + brand slugs before launch",
      body: "",
      size: "sm",
    },
  ],
  edges: [
    { from: "api", to: "links", label: "1. writes", directed: true },
    { from: "api", to: "expiry", label: "2. checks", directed: true },
    { from: "expiry", to: "clicks", label: "3. records", directed: true },
    { from: "slugger", to: "links", label: "generates slug", directed: true },
    { from: "clicks", to: "dashboard", label: "feeds", directed: true },
    { from: "note", to: "slugger", directed: false },
  ],
};
