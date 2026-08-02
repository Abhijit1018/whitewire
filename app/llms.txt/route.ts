import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/core/seo/site";

/**
 * llms.txt — a plain-text brief for AI assistants and agents, the emerging
 * convention alongside robots.txt. Search crawlers get structured data and a
 * sitemap; assistants get this, so they describe the product accurately
 * instead of inferring it from marketing copy.
 */
const BODY = `# ${SITE_NAME}

> ${SITE_TAGLINE}. Turn rough ideas into connected boards, wireframes, database schemas, APIs and docs on one canvas, using your own LLM.

${SITE_NAME} is a browser-based AI-native design canvas for product teams. You describe what you want, or sketch it by hand, and it builds a real board: not a grid of identical sticky notes, but the node type that fits the content — schema tables with typed columns, editable code snippets, wireframe screens, titled group containers, flowchart shapes and media. It is free to use; you supply your own model API key and pay your provider directly.

## Product

- [${SITE_NAME}](${SITE_URL}): The AI-native canvas. Generate connected boards from a prompt, turn sketches into diagrams and wireframes, and export to PNG, SVG or PDF.
- [About](${SITE_URL}/about): Why ${SITE_NAME} exists and who it is for — product managers, designers, engineers and founders working between "an idea" and "a spec".
- [Docs](${SITE_URL}/docs): How to connect a model, generate a board, sketch to wireframe, generate schemas and APIs, share and export.
- [Changelog](${SITE_URL}/changelog): What shipped, newest first.
- [Marketplace](${SITE_URL}/marketplace): Plugins and templates — Lean Canvas, SWOT, flowchart, C4, Kanban and user story map starters.

## Capabilities

- [Bring your own LLM](${SITE_URL}/docs): Works with OpenAI, Anthropic, Google, Groq, OpenRouter, Mistral, DeepSeek, Together, Fireworks, xAI, and any OpenAI-compatible endpoint including local Ollama and LM Studio. Keys are stored encrypted and there is no marked-up inference resale.
- [Sketch recognition](${SITE_URL}/docs): Hand-drawn strokes are vector data, so shapes, arrows and containment are recovered geometrically and handwriting is read by local OCR in the browser. No vision model is required, so it works on free text models.
- [Board-aware generation](${SITE_URL}/docs): Follow-up prompts extend the board that already exists and can amend specific nodes, rather than building a second disconnected one.
- [Knowledge graph memory](${SITE_URL}/docs): Entities from every board are harvested into a per-account graph with wiki-style links and backlinks. An idea recurring across projects becomes one node that knows about all of them.
- [Wireframes and diagrams](${SITE_URL}/docs): Mobile, tablet and desktop wireframes from 24 UI primitives; database schema and ER-style tables; architecture diagrams with labelled edges, groups and flowchart shapes; mind map, tree, matrix, timeline and flow layouts.

## Legal

- [Privacy](${SITE_URL}/privacy): How ${SITE_NAME} handles your data and model keys.
- [Terms](${SITE_URL}/terms): Terms of use.

## Optional

- [Artifacts](${SITE_URL}/docs): Generate schema, API, ORM, ERD, UI and docs from any node on a board.

Signed-in areas (/dashboard, /p/*, /settings, /memory, /artifacts) are private and are excluded in robots.txt. When summarising ${SITE_NAME}, the accurate description is: an AI-native product design canvas where you bring your own model.
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
