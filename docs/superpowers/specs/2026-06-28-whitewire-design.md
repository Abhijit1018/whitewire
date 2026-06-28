# WhiteWire — Design Spec (v1)

Date: 2026-06-28
Status: Approved (design level)

## 1. Positioning

**"Cursor for product teams."** An AI-native, infinite-canvas workspace where
ideas become specs, diagrams, wireframes, architecture, code, and docs — all in
one place. Core differentiator: **BYO-LLM** (users plug in their own API keys or
local models; the platform never pays inference costs and never sees raw keys in
plaintext).

One published product. Modular internals so new subsystems plug in without
breaking existing ones. Built in additive phases, never restructured.

## 2. Goals & Non-Goals

### Goals
- Single cohesive product: landing → auth → dashboard → workspace.
- Modular architecture; subsystems are isolated modules with clean interfaces.
- Fast and responsive: instant landing/login, lazy-loaded heavy canvas/AI panels.
- BYO-LLM with multi-provider support and per-task model routing.
- AI Objects: canvas objects that carry semantic meaning and can expand/generate.
- Linked artifacts: generated outputs (schema/API/UI/docs) tied to source objects.

### Non-Goals (this version)
- Real-time multiplayer collaboration (deferred; architecture must not block it).
- Plugin marketplace (deferred; module registry must not block it).
- Billing/subscriptions (deferred).

## 3. Tech Stack

| Layer        | Choice                                  | Reason |
|--------------|-----------------------------------------|--------|
| Framework    | Next.js 16 (App Router)                 | Route-level code splitting, SSR landing, fast |
| Canvas       | tldraw SDK                              | Embeddable, custom shapes for AI Objects, top perf |
| UI           | Tailwind CSS + shadcn/ui                | Light, no heavy component library |
| App state    | Zustand (app) + tldraw store (canvas)   | Tiny, fast |
| Auth         | Clerk                                   | Fastest path, swappable, Vercel-native |
| Database     | Postgres (Neon) + Drizzle ORM           | Serverless, lightweight, typed |
| AI           | Vercel AI SDK v6, dynamic provider      | BYO-LLM: client built per-request from user key |
| Key vault    | AES-256-GCM encryption at rest, per user| Privacy; keys never stored plaintext |
| Deploy       | Vercel (Fluid Compute)                  | Fast cold starts, Node runtime |

Performance rule: canvas and AI panels are dynamically imported (lazy-loaded).
Landing and auth pages stay minimal and instant.

## 4. App Structure (full shell, built once in Phase 1)

```
/                 Landing (SSR, fast)
/login /signup    Clerk auth
/dashboard        Projects grid, recent, search
/p/[projectId]    Workspace shell:
   ├─ canvas        tldraw + custom AI Object shapes
   ├─ left panel    tools / shapes / agents
   ├─ right panel   inspector (object detail, links, comments, notes, snippets, files)
   ├─ top bar       model picker (BYO-LLM routing)
   └─ bottom bar    AI command bar
/artifacts        Generated docs/diagrams/code, per project
/settings         API keys (vault), models, profile
```

## 5. Module Boundaries

Each module exposes a clean interface; new subsystems are added as new modules
without editing existing ones.

- `core/canvas` — tldraw wrapper, custom shapes, auto-layout (mess cleanup).
- `core/ai` — provider adapters, model routing, prompt history.
- `core/objects` — AI Object schema + expand/generate logic.
- `core/agents` — agent registry (add an agent = add a file).
- `core/artifacts` — linked artifact graph.
- `core/persistence` — Drizzle repositories, snapshots, versions.

## 6. Data Model (core entities)

```
User
 └─ Project
     ├─ CanvasDoc        (tldraw snapshot JSON)
     ├─ AIObject         (semantic object; type, purpose, attachments)
     │    └─ Attachment  (link | comment | note | snippet | file)
     ├─ Artifact         (generated: schema | api | ui | docs; linked to source object)
     ├─ Version          (snapshot history)
     └─ PromptHistory    ({prompt, model, temperature, output})
ApiKey                   (per-user, encrypted, provider-scoped)
```

## 7. AI Layer (BYO-LLM)

- User adds provider keys in Settings → encrypted into the vault (AES-256-GCM).
- At request time, the AI SDK constructs a provider client from the decrypted key.
- Model routing: sensible per-task defaults (reasoning / code / UI / docs) with
  manual override via the top-bar model picker.
- Every generation records `{prompt, model, temperature, output}` for replay and
  regeneration.
- Supported providers (OpenAI-compatible + native): OpenAI, Anthropic, Gemini,
  Groq, OpenRouter, Mistral, DeepSeek, Ollama / LM Studio (local).

## 8. Extra Features → Mapping

- **Mess cleanup** (auto-align cluttered objects) → `core/canvas` auto-layout
  action using a graph layout lib (dagre/elk).
- **Architect assist** (suggest API/DB, what's missing, tools, improvements) →
  `core/agents` advisor agent operating on the current board.
- **Links / comments / notes / snippets / file attach per component** →
  inspector panel backed by `AIObject.attachments`.
- **agent.md / plan.md generation** → artifact templates auto-generated per
  project to improve agent efficiency.

## 9. Build Phases (one codebase, additive only)

1. **P1 — Shell + Auth + DB.** Landing, Clerk auth, dashboard, project CRUD,
   empty workspace shell, settings skeleton. *(Specced + planned in detail next.)*
2. **P2 — Canvas.** tldraw embedded, save/load snapshots, mess cleanup.
3. **P3 — BYO-LLM.** Key vault, settings keys UI, AI command bar, first AI Object
   (text → expand).
4. **P4 — AI Objects + Artifacts.** Object types; generate schema/API/UI/docs;
   artifacts page; inspector panel.
5. **P5 — Agents.** Agent registry; architect assist.
6. **P6 — Versions + Polish.** Snapshot history, prompt history, regenerate.
7. **Later.** Real-time collaboration; plugin marketplace (architecture allows).

## 10. Risks

- **Linked artifacts staying in sync** is the hardest part; deferred to P4 and
  must be designed carefully (artifact graph, not loose outputs).
- **BYO-LLM key security** — never log keys, encrypt at rest, decrypt only in
  memory at request time.
- **Provider variance** — abstract behind `core/ai` adapters so provider quirks
  don't leak into features.
```
