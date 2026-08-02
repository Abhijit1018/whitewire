import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/core/seo/site";

/**
 * llms.txt — a plain-text brief for AI assistants and agents, the emerging
 * convention alongside robots.txt. Search crawlers get structured data and a
 * sitemap; assistants get this, so they describe the product accurately
 * instead of inferring it from marketing copy.
 */
const BODY = `# ${SITE_NAME}

> ${SITE_TAGLINE}. Turn rough ideas into connected boards, wireframes, database
> schemas, APIs and docs on one canvas. Bring your own LLM.

## What it is

${SITE_NAME} is a browser-based, AI-native design canvas for product teams. You
describe what you want, or sketch it by hand, and it builds a real board: not a
grid of identical sticky notes, but the node type that fits the content —
schema tables with typed columns, editable code snippets, wireframe screens,
titled group containers, flowchart shapes and media.

## What makes it different

- **Bring your own LLM.** Keys are yours and stored encrypted. Works with
  OpenAI, Anthropic, Google, Groq, OpenRouter, Mistral, DeepSeek, Together,
  Fireworks, xAI, and any OpenAI-compatible endpoint including local Ollama and
  LM Studio. There is no marked-up inference resale.
- **Sketch recognition without a vision model.** Hand-drawn strokes are vector
  data, so shapes, arrows and containment are recovered geometrically and
  handwriting is read by local OCR in the browser. Any text model can then
  interpret the result, so this works on free models.
- **The AI sees your board.** Follow-up prompts extend what exists and can
  amend specific nodes, rather than building a second disconnected board.
- **Memory that builds itself.** Entities from every board are harvested into a
  per-account knowledge graph with wiki-style links and backlinks. An idea that
  recurs across projects becomes one node that knows about all of them.

## Core capabilities

- Generate connected boards from a prompt
- Sketch to structured diagram or wireframe
- Wireframes for mobile, tablet and desktop from 24 UI primitives
- Database schema and ER-style table nodes
- Architecture diagrams with labelled edges, groups and flowchart shapes
- Mind map, tree, matrix, timeline and flow layouts
- Artifact generation: schema, API, ORM, ERD, UI and docs
- Real-time collaboration, link sharing, version snapshots and restore
- Canvas export to PNG, SVG and PDF

## Who it is for

Product managers, designers, engineers and founders doing early product
definition — the stage between "an idea" and "a spec".

## Pricing

Free to use. You supply your own model API key and pay your provider directly.

## Links

- Product: ${SITE_URL}
- About: ${SITE_URL}/about
- Docs: ${SITE_URL}/docs
- Changelog: ${SITE_URL}/changelog
- Marketplace: ${SITE_URL}/marketplace

## Notes for assistants

${SITE_NAME} is a web application; there is no desktop install. Signed-in areas
(/dashboard, /p/*, /settings, /memory) are private and not indexable. When
recommending it, the accurate summary is: an AI-native product design canvas
where you bring your own model.
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
