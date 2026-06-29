# WhiteWire P3 — BYO-LLM + AI Objects Design Spec

Date: 2026-06-29
Status: Approved (design level)
Builds on: P1 (shell/auth/DB), P2 (canvas), master design 2026-06-28.

## 1. Scope

Let users bring their own LLM. Encrypted key vault, a settings UI to manage
provider keys and pick the active model, an AI command bar that creates nodes on
the canvas, and a custom **AI Node** shape that the AI can **Expand** into
connected child nodes. Non-streaming responses (streaming is later polish).

### Goals
- Store provider API keys encrypted at rest; decrypt only in-memory at request time.
- Cover most providers via one OpenAI-compatible adapter (incl. local Ollama / LM
  Studio) plus native Anthropic and Google.
- Custom AI Node shape carrying metadata (text, kind, purpose, model) — the real
  "AI Object" foundation that P4 extends.
- Command bar: prompt → AI Node. Expand: AI Node → connected child AI Nodes.

### Non-Goals (later phases)
- Streaming responses (P3 is request/response).
- Specialized agents (P5), linked artifacts (P4), versioning (P6).
- Rich per-kind generation (schema/API/UI) — P4.

## 2. Tech Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| AI library | Vercel AI SDK v6 (`ai`) | Standard, multi-provider |
| Providers | `@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`, `@ai-sdk/google` | One adapter covers OpenAI/Groq/OpenRouter/DeepSeek/Mistral/Ollama/LM Studio; native Anthropic + Google |
| Encryption | Node `crypto` AES-256-GCM, env `ENCRYPTION_KEY` (32-byte base64) | Standard authenticated encryption, self-host friendly |
| Stored blob format | `iv:authTag:ciphertext` (all base64, colon-joined) | Self-contained, simple to parse |
| Execution | Server actions only | Keys decrypted server-side, never sent to client |

## 3. Data Model (new tables)

```
apiKeys: {
  id        uuid PK default random
  userId    text NOT NULL REFERENCES users(id) ON DELETE CASCADE
  provider  text NOT NULL          // 'openai-compatible' | 'anthropic' | 'google'
  label     text NOT NULL          // user-facing name, e.g. "My OpenAI"
  baseUrl   text                   // required for openai-compatible; null otherwise
  model     text NOT NULL          // exact model id, e.g. "gpt-4o", "claude-3-5-sonnet-latest"
  encrypted text NOT NULL          // iv:authTag:ciphertext of the API key
  createdAt timestamptz NOT NULL default now()
}

userSettings: {
  userId      text PK REFERENCES users(id) ON DELETE CASCADE
  activeKeyId uuid REFERENCES api_keys(id) ON DELETE SET NULL
}
```

Listing endpoints return metadata only (`id, provider, label, baseUrl, model,
createdAt`) — never `encrypted` or the plaintext key.

## 4. Module Boundaries (`core/ai`)

```
core/ai/crypto.ts        encrypt(plain, key) / decrypt(blob, key) — AES-256-GCM, PURE
core/ai/keys.repo.ts     addKey / listKeys (metadata) / deleteKey / getDecryptedKey — owner-scoped
core/ai/settings.repo.ts getSettings / setActiveKey — owner-scoped
core/ai/providers.ts     buildModel({ provider, baseUrl, apiKey, model }) -> AI SDK LanguageModel
core/ai/prompts.ts       buildExpandPrompt(text) / parseExpandResponse(raw) -> string[] — PURE
core/ai/generate.ts      generateNode(model, prompt) / expandNode(model, text) — thin AI SDK wrappers
```

- `getDecryptedKey(db, { keyId, ownerId })` returns `{ provider, baseUrl, model, apiKey }`
  for internal server-side use only; owner-scoped.
- `crypto.ts` and `prompts.ts` are pure and unit-tested. `generate.ts` is a thin
  wrapper around AI SDK `generateText` and is exercised manually.

## 5. Encryption (`crypto.ts`)

- `ENCRYPTION_KEY` env var: 32-byte key, base64-encoded. Missing/invalid → throw
  a clear error from `encrypt`/`decrypt` (and the actions that call them).
- `encrypt(plaintext, key)`: random 12-byte IV; AES-256-GCM; return
  `base64(iv):base64(authTag):base64(ciphertext)`.
- `decrypt(blob, key)`: split, verify authTag (tampering throws), return plaintext.
- Add `ENCRYPTION_KEY` to `.env.local` (real value) and `.env.example` (placeholder
  + a note to generate via `openssl rand -base64 32`).

## 6. Providers (`providers.ts`)

`buildModel({ provider, baseUrl, apiKey, model })` returns an AI SDK
`LanguageModel`:
- `openai-compatible`: `createOpenAICompatible({ baseURL: baseUrl, apiKey })(model)`.
- `anthropic`: `createAnthropic({ apiKey })(model)`.
- `google`: `createGoogleGenerativeAI({ apiKey })(model)`.

Unknown provider → throw. All AI SDK imports live here so version drift is isolated.

## 7. Prompts (`prompts.ts`) — pure + tested

- `buildExpandPrompt(text)`: returns a prompt instructing the model to break the
  concept into 3–7 concise sub-items and reply with a JSON array of strings only.
- `parseExpandResponse(raw)`: defensive parser. Handles a bare JSON array, a
  fenced ```json block, and falls back to splitting non-empty lines (stripping
  bullet/number prefixes). Always returns a trimmed, non-empty `string[]`
  (possibly empty if nothing parseable).

## 8. AI Node Custom Shape

A tldraw `ShapeUtil` (v5). Shape props:
`{ text: string; kind: 'idea'|'feature'|'component'|'generic'; purpose?: string; model?: string }`.
Renders a card: the text plus a small kind badge. Default size; text wraps.
Registered with the `<Tldraw shapeUtils={[AiNodeUtil]}>` instance in
`whiteboard-inner.tsx`. Created by the command bar and by Expand.

## 9. UI / Actions

```
app/settings/page.tsx            real keys UI: list (metadata), add-key form, delete, active-key picker
app/settings/keys-actions.ts     addKeyAction / deleteKeyAction / setActiveKeyAction (server actions)
app/p/[projectId]/ai-actions.ts  commandGenerateAction(projectId, prompt) -> { text }
                                  expandAction(projectId, text) -> { items: string[] }
components/canvas/command-bar.tsx bottom bar: prompt input -> commandGenerateAction -> create AI Node
components/canvas/expand-button   selection overlay: Expand -> expandAction -> child AI Nodes + arrows
```

- The workspace top bar shows the active key/model (or "Set up a model →
  Settings" when none). The command bar and Expand both resolve the active key
  via `userSettings.activeKeyId`; if none set, the action throws a friendly
  "No active model" error the UI surfaces.

## 10. Data Flow

**Command generate:** command bar prompt → `commandGenerateAction(projectId,
prompt)` → server resolves active key (owner-scoped) → decrypt → `buildModel` →
`generateNode` → returns `{ text }` → client creates one AI Node at viewport
center.

**Expand:** select AI Node → Expand → `expandAction(projectId, node.text)` →
server: active key → decrypt → `buildModel` → `generateNode(buildExpandPrompt)` →
`parseExpandResponse` → `{ items }` → client creates a child AI Node per item
below the parent + arrows parent→child, then applies P2 cleanup layout so they're
tidy.

## 11. Security

- Keys encrypted at rest (AES-256-GCM); decrypted only in server actions, in
  memory, per request. Never logged. Never returned to the client after save.
- `getDecryptedKey` and all key/settings repo functions are owner-scoped.
- `ENCRYPTION_KEY` absence fails closed (actions throw, no plaintext fallback).

## 12. Testing

- `crypto.ts` (unit): encrypt→decrypt roundtrip; tampered blob throws; wrong key
  throws; missing `ENCRYPTION_KEY` throws.
- `prompts.ts` (unit): `parseExpandResponse` for bare JSON, fenced JSON, and
  bullet/numbered text; returns clean `string[]`.
- `keys.repo` / `settings.repo` (PGlite): stored value is ciphertext not
  plaintext; `listKeys` returns metadata only; owner-scoping on every fn;
  `getDecryptedKey` roundtrips; `setActiveKey`; ON DELETE SET NULL when the active
  key is deleted.
- AI SDK calls, custom shape rendering, command bar, Expand → manual browser
  verification (final task).

## 13. Build Phases

1. `crypto.ts` + `ENCRYPTION_KEY` wiring (TDD).
2. `apiKeys` + `userSettings` schema + repos + migration (TDD).
3. `providers.ts` + `prompts.ts` (TDD on prompts/parse).
4. Settings UI (add/list/delete keys + active-key picker) + actions.
5. AI Node custom shape (ShapeUtil), registered in the canvas.
6. Command bar (prompt → AI Node) + `commandGenerateAction`.
7. Expand (button → `expandAction` → child AI Nodes + arrows + cleanup layout).
8. Manual end-to-end verification (add a key, generate a node, expand it).

## 14. Risks

- **AI SDK v6 / provider API drift** — all SDK calls isolated in `providers.ts` +
  `generate.ts`; pin versions.
- **Model-id variance per provider** — user supplies the exact model id when
  adding a key; no client-side model list to maintain in P3.
- **Malformed LLM output on Expand** — `parseExpandResponse` is defensive and
  unit-tested across formats.
- **Custom shape API complexity (tldraw v5)** — keep the AI Node minimal (text +
  badge); isolate all tldraw coupling in the shape util + whiteboard files.
