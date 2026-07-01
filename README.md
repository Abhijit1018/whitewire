# WhiteWire

**Cursor for product teams** — an AI-native, infinite canvas where ideas become
connected boards, wireframes, schemas, APIs, ORM models, ER diagrams, and docs.
Bring your own LLM. Own your intelligence.

🔗 **Live:** https://whitewire.vercel.app

---

## What it does

- **AI-native canvas** (React Flow) — nodes, edges, text, sticky notes, shapes
  (rectangle / ellipse / diamond), and **freehand pen sketching**.
- **BYO-LLM** — plug in your own keys: any OpenAI-compatible endpoint (OpenAI,
  Groq, OpenRouter, DeepSeek, Mistral, Ollama / LM Studio), plus Anthropic and
  Google. Keys are **encrypted at rest** (AES-256-GCM); the platform never pays
  for inference and never stores keys in plaintext.
- **Generate a whole board** — describe an idea and the AI builds a connected
  set of concept nodes (components + relationships), auto-laid-out.
- **Expand** any node into connected children.
- **Linked artifacts** per node — generate **Schema / API / ORM / ERD / UI /
  Docs**; the ERD renders as a real Mermaid diagram. Artifacts show a **stale**
  badge when the source changes and regenerate on demand.
- **Wireframes** — generate low-fidelity UI mockups as canvas nodes.
- **Architect Assist** — an agent reviews the whole board and suggests what's
  missing / components to add (one click to drop them on the canvas).
- **Smart canvas** — **Refine** rewrites a node's text; **Read sketch** sends a
  rasterized freehand drawing to a vision model and turns it into clean nodes
  (needs a vision-capable model).
- **Model routing** — assign different models to different tasks (reasoning /
  code / docs), falling back to your active key.
- **Attachments** — notes, links, comments, snippets, and **file uploads**
  (Vercel Blob) per node.
- **Version history + prompt history** — snapshot and restore the board; every
  generation is logged.
- Responsive down to mobile.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript |
| Canvas | React Flow (`@xyflow/react`) + `perfect-freehand` + `dagre` + `mermaid` |
| AI | Vercel AI SDK v7 (`@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Database | Neon Postgres + Drizzle ORM |
| Storage | Vercel Blob |
| UI | Tailwind CSS + shadcn/ui + Zustand |
| Tests | Vitest + PGlite (96 tests) |
| Deploy | Vercel |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm db:migrate              # apply migrations to your Neon database
pnpm dev                     # http://localhost:3000
```

### Environment variables (`.env.local`)

```
DATABASE_URL=                 # Neon Postgres connection string
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=               # 32-byte base64 — `openssl rand -base64 32`
BLOB_READ_WRITE_TOKEN=        # Vercel Blob (optional, for file uploads)
```

Then in the app: **Settings → add a provider key → Make active** (Groq works
great for testing: base URL `https://api.groq.com/openai/v1`, model
`llama-3.3-70b-versatile`). For **Read sketch**, set a vision-capable model
(e.g. `gpt-4o`, `claude-3-5-sonnet`, `gemini-2.0-flash`) active.

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm test         # run the test suite
pnpm db:generate  # generate a Drizzle migration from schema changes
pnpm db:migrate   # apply migrations
```

## Architecture

Modular by responsibility:

```
core/ai/            key vault (crypto), providers, prompts, generation, agents
core/artifacts/     hashing + kind→generator routing (pure, tested)
core/canvas/        layout / cleanup (dagre) (pure, tested)
core/persistence/   Drizzle schema + owner-scoped repositories
core/state/         Zustand workspace store (canvas graph + selection)
app/                Next.js routes + server actions
components/canvas/  React Flow canvas, nodes, tools
components/workspace/ shell + inspector
```

Every repository and server action is **owner-scoped**; provider keys are
decrypted only in-memory inside server actions.

## Roadmap

Built: shell/auth/DB · canvas · BYO-LLM + AI objects · linked artifacts ·
Architect Assist · versions/prompt history · wireframes · model routing ·
sketch-vision.

Future: realtime collaboration, plugin marketplace, deeper onboarding.

## License

Not yet licensed — all rights reserved by the author.
