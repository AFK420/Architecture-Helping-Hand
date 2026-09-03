# AI PROVIDERS — Architecture Helping Hand

**Status**: Implemented (Phase 15) · **Date**: September 2026

---

## 1. What This Is

Real provider transport for the AI layer. The application can now connect to
Google Gemini, GLM (Zhipu), and DeepSeek with user-supplied API keys, discover
or manually enter models, and route AI jobs to any model the user chooses —
with no code changes when providers add, rename, or remove models.

## 2. Architecture

```
src/services/ai/
├── http.js                  ← the ONLY fetch boundary (injectable for tests)
├── provider-manager.js      ← directory, keys (session/persistent), enable/disable
├── model-catalog.js         ← discovered + manual + seed models, per provider
├── job-router.js            ← assignments, capability gating, fallback policy
└── transports/
    ├── index.js             ← providerId → adapter registry
    ├── gemini.js            ← official generateContent / ListModels REST
    └── openai-compat.js     ← OpenAI-compatible adapter (GLM v4, DeepSeek)
```

`src/core` and `src/ai` contain **no network code**. All HTTP flows through
`createAiHttp()`, whose `fetchImpl` is injectable — automated tests bind a
deterministic mock and never touch the network.

## 3. Providers

| Provider | Transport | Default endpoint | Discovery | Vision | Image gen |
|---|---|---|---|---|---|
| Google Gemini | `gemini.js` | `https://generativelanguage.googleapis.com/v1beta` | ListModels (paginated) | `inline_data` parts | `responseModalities: IMAGE` |
| GLM (Zhipu) | `openai-compat.js` | `https://open.bigmodel.cn/api/paas/v4` | `GET /models` | `image_url` content parts | not claimed |
| DeepSeek | `openai-compat.js` | `https://api.deepseek.com` | `GET /models` | `image_url` content parts | not claimed |

- GLM and DeepSeek endpoints are user-editable (regional/proxy endpoints).
- Gemini's endpoint is the fixed official one.
- Initial model entries are **seeds**, not truth: discovery refreshes the
  catalog, and manual entry covers anything discovery cannot see.

## 4. Keys

- Stored per provider, in one of two modes the user picks:
  - **Session only** (default, safest): memory only, gone when the tab closes.
  - **Persistent**: browser `localStorage` — convenient, explicitly labelled as
    NOT an operating-system secret manager. Switching back to session mode
    immediately clears any persisted key.
- Displayed masked (`••••••••abcd`) only; never re-displayed in full.
- Never logged, never exported, never written to project documents, prompts,
  history, journal, or telemetry. Pinned by tests (`ai-providers`,
  `ai-integration` suites).
- Connection tests send a fixed minimal prompt — no project data.

## 5. Model Catalog

Every model carries provider-normalized capabilities:
`text, reasoning, structuredOutput, toolCalling, vision, imageGen, contextLimit`.
Missing capabilities default to **false** — nothing is inferred from a model's
name, size, or provider. Origins:

| Origin | Meaning |
|---|---|
| `seed` | shipped convenience entries (provider-documented minimums) |
| `discovery` | fetched from the provider; capabilities are provider truth |
| `manual` | user-declared "I know this model exists"; labelled **USER DECLARED — NEEDS VERIFICATION** |

Discovery **merges** (never prunes): new models are added, manual entries are
confirmed/corrected with provider truth, and an empty discovery pass does not
delete anything. A model that no longer resolves is `RETIRED`/`UNAVAILABLE` —
visible, not silent.

## 6. Error Taxonomy

HTTP statuses and provider bodies map into the shared taxonomy in
`src/ai/providers/provider.js`: `AUTH_FAILED` (401/403, incl. Gemini's
"API key not valid" 400), `QUOTA_EXHAUSTED` (429), `INVALID_MODEL` (404),
`NETWORK_ERROR` (5xx/network), `TIMEOUT`, `MALFORMED_RESPONSE`,
`UNSAFE_CONTENT` (safety blocks), `PROVIDER_UNCONFIGURED`, `UNKNOWN`.

## 7. Free-Cost Safety

- Fallback policy default is **NEVER** — no automatic model/provider switch.
- No retry loops: one request = one transport call.
- Quota/rate-limit returns control to the user with a clear message; with an
  explicit policy the router may *present* candidates, but the user assigns.
- No telemetry; usage tokens returned by providers are stored locally only.
