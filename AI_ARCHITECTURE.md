# AI ARCHITECTURE — Architecture Helping Hand

**Status**: Implemented (Phases 9–13) · P14 hardened (see ARCHITECTURE_AUDIT.md §7) · **Phase 15: real provider transport live** (see AI_PROVIDERS.md, AI_JOBS.md, AI_CONTROL_CENTER.md)  
**Layers**: `src/ai/` (providers · tools · modes · schemas · context · orchestrator · visual) + `src/services/ai/` (http · provider-manager · model-catalog · job-router · transports)  
**Date**: September 2026

---

## 1. Core Principle

**AI SUGGESTS. CORE VERIFIES.**

The AI is a reasoning layer over deterministic architectural data — never the source of truth. Every numeric claim the model makes is extracted and compared against core-calculated facts; mismatches are classified `NEEDS VERIFICATION` mechanically, not by prompt goodwill.

## 2. What The AI Is NOT

- NOT a chatbot bolted to the app
- NOT an autonomous agent / swarm (one request = one response)
- NOT a local model (no Ollama, no GPU inference, no downloads)
- NOT a paid service (no paid fallback; no hidden keys; no anonymous external calls)
- NOT required — the application is fully usable with AI unavailable, unconfigured, or out of quota

## 3. Provider Abstraction (`providers/provider.js`)

| Concept | Mechanism |
|---|---|
| Capability manifest | `text, reasoning, toolCalling, structuredOutput, vision, imageGen, contextLimit` — providers declare; the orchestrator gates requests on required capabilities |
| Error taxonomy | `PROVIDER_UNCONFIGURED, NETWORK_ERROR, AUTH_FAILED, QUOTA_EXHAUSTED, TIMEOUT, INVALID_MODEL, MALFORMED_RESPONSE, UNSAFE_CONTENT, UNKNOWN` — HTTP statuses map in (`429→QUOTA_EXHAUSTED`, `401/403→AUTH_FAILED`, `404→INVALID_MODEL`, `5xx→NETWORK_ERROR`) |
| Keys | `createKeyStore(storageAdapter, { sessionOnly })` — session-only keys never touch storage (test-pinned); persisted keys are per-provider, clearable, never logged |
| Transport | `sendPrompt` is injected — the real Gemini/GLM fetch wrappers belong in `src/services/` when the user configures a key. Until then, **no network call is possible** |

**Free-cost policy**: quota exhaustion surfaces as *"AI temporarily unavailable — free provider limit reached."* and the app continues.

## 4. Tool Registry (`tools/`)

Tools are declared with `{ description, permission, inputSchema, handler }`. Arguments are schema-validated (type + required) before any handler runs. The model can only call registered tools; model-generated code is never evaluated.

| Tier | Tools |
|---|---|
| `READ_PROJECT` | getProject, getDecisions |
| `READ_GEOMETRY` | getRooms, getRoom, getWalls, getOpenings, getFurniture, checkFurnitureFit, checkClearance, checkOverlaps |
| `READ_MEASUREMENTS` | getDimensions, getMeasurements |
| `READ_CALCULATIONS` | evaluateExpression, calculateStair, calculateRamp, calculateSlope |
| `PROPOSE_NOTE` | proposeNote |
| `PROPOSE_CHANGE` | proposeFurnitureMove |

**No `APPLY_*` tool is registered.** Proposals return preview objects (`from/to/reason/requiresApproval`); the UI shows Preview → Accept → Apply → recalculate → diff → undo. Every handler executes deterministic core functions against live store/plan state.

## 5. Facts Pack (`context/facts-pack.js`)

Compact deterministic summary built from the real store + plan: project name/intent, site, rooms with calculated areas/perimeters, walls/openings/furniture counts, overlap conflicts, recent decisions, measurement provenance. The pack is placed in the prompt with the instruction to trust those numbers — the model must not recalculate what the core knows. `factChecks` (label/value/unit per room area) feed numeric validation.

## 6. Modes (`modes/modes.js`)

Seven specialist modes — prompt + schema profiles, not agents:

| Mode | Profile |
|---|---|
| **Tutor** | Socratic-first; asks before telling; marks calculations CALCULATED |
| **Design Mentor** | Observations, questions, possibilities, trade-offs — no imposed answer |
| **Studio Critic** | Evidence-cited findings, structured output, no empty praise |
| **Brutal Critic** | Direct, unsentimental, disagrees with the concept when warranted — the system prompt itself contains the tone contract (`NEVER insult`) |
| **Jury** | Interrogates the argument using the decision journal; structured findings |
| **Ideation** | Genuinely different strategies (spine / courtyard / split mass / vertical / compressed), each with trade-offs and a next test |
| **Best Practice** | Deterministic calc + reference; regulatory answers are always "NEEDS VERIFICATION — verify applicable local requirements" |

## 7. Orchestrator (`orchestrator.js`)

```
run({ mode, userMessage })
  → mode profile (system prompt + structured expectation)
  → facts pack (deterministic)
  → provider.sendPrompt (injected transport + key)
  → [structured modes] extractJson (fence-tolerant) → validateStructuredResponse
  → default trust = INFERENCE for unlabeled findings
  → validateNumericClaims vs factChecks → CONSISTENT / NEEDS VERIFICATION
  → { ok, structured/text, consistency } | { ok:false, errorCode, message }
```

All failures are controlled objects. `MISSING key` message explicitly reassures the student the app works without AI.

## 8. Visual Layer (`visual.js`) — Phase 13, optional

- `visualCapabilities(provider)` — separate `vision` vs `imageGen` capabilities
- `interpretImage` — unavailable without vision (reason states the app is unaffected); success carries a disclaimer forbidding treatment as measured geometry
- `generateConceptImage` — only with declared `imageGen`; every success carries `CONCEPTUAL EXPLORATION / NOT A TECHNICAL DRAWING / NOT CONSTRUCTION DOCUMENTATION`
- No fake results: an unavailable provider returns an honest reason, never fabricated images

## 9. Testing

`tests/ai.test.js` (73) + `tests/visual-ai.test.js` (17) + the P14 end-to-end pipelines in `tests/integration.test.js` (39). Providers are **scripted in-process stubs** — deterministic, no network. The stub may return a base64 stand-in only to verify the label contract; real transport does not exist yet, so no external call is possible and none is faked.

**P14 hardening (all regression-pinned)**: the facts pack filters null/garbage plan entities and only emits finite-geometry factChecks; `validateStructuredResponse` flags null/primitive findings instead of crashing; the visual layer converts throwing transports into the stable controlled error object.

## 10. Phase 15 — Real Provider Transport

- **Transport boundary**: `src/services/ai/http.js` is the single fetch point
  (`fetchImpl` injectable; automated tests bind deterministic mocks — no test
  touches the network).
- **Providers**: Gemini (official REST), GLM + DeepSeek (one OpenAI-compatible
  adapter). Directory + details in AI_PROVIDERS.md.
- **Model catalog**: per-provider registry with discovery merge, manual entry
  (user-declared capabilities, labelled NEEDS VERIFICATION), retirement
  states, context windows.
- **Job router**: `runAIJob(jobId, …)` — the application-wide entry point.
  Capability-gated assignments, default NEVER fallback policy, metadata-only
  activity log. Details in AI_JOBS.md.
- **Scoped project context**: `ai/context/project-context.js` builds the
  facts pack from the live store + plan with word-based scope hints and
  disclosed trimming (`CONTEXT REDUCED: …`).
- **UI**: AI Studio (Mode 20) and AI Control Center (Mode 21) — see
  AI_CONTROL_CENTER.md.
- **Free-cost guarantees unchanged**: no paid fallback, no retries, no
  telemetry, keys never leave the provider manager except into the request
  the user triggers.

## 11. Limitations

- AI layout *proposals* (PROPOSE_CHANGE tools) have no visual apply-UI yet; Save-to-Journal is the write path (user-triggered).
- Vision analysis is heuristic by nature — always NEEDS VERIFICATION.
- GLM/DeepSeek model lists do not report context windows; the user can override per model in the catalog.
- Import foundation covers CSV/TSV, 2D ASCII DXF, flat SVG (IMPORTS.md); proprietary CAD formats are intentionally out of scope.
