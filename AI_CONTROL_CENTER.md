# AI CONTROL CENTER & AI STUDIO — Architecture Helping Hand

**Status**: Implemented (Phase 15) · **Date**: September 2026

---

## 1. AI Studio (Mode 20)

The visible, task-focused AI workspace. Deliberately **not a chatbot**: one
job, one question, one validated answer.

Layout:

- **Job selector** — all eleven jobs with live status marks.
- **Question/instruction** — free text; vision jobs add an image picker
  (PNG/JPEG/WebP ≤ 8 MB).
- **Context toggle** — include the project facts pack (on by default).
- **Run AI Job** — the only execution trigger.
- **Response panel** — structured findings render as evidence-cited cards
  (severity color-coded, trust labels shown); prose renders as text. All
  model output is HTML-escaped before insertion.
- **Consistency strip** — reports the numeric fact-check
  (`CONSISTENT` / `NEEDS VERIFICATION` with the mismatch note).
- **Context summary** — what was sent (rooms · furniture · conflicts ·
  measurements · decisions) and any disclosed trimming
  (`CONTEXT REDUCED: …`).
- **Save to Journal** — explicit user action that appends the response as a
  project note (source: `ai`). Otherwise AI conversations stay transient and
  never become project data.

AI write permissions remain READ/SUGGEST only — the AI cannot mutate project
state; "Save to Journal" is a user action.

## 2. AI Control Center (Mode 21)

### Providers

Each provider card shows state (`Configured` / `No key` / `Disabled`), the
masked key, and actions:

- **Key** — paste to set/replace (password field, never re-displayed);
  remove with the clear button.
- **Storage mode** — session-only (safest) or persistent (labelled as browser
  storage, not an OS secret manager).
- **Enabled toggle** — disabled providers cannot serve jobs; existing
  assignments show *PROVIDER DISABLED*.
- **Endpoint** (GLM/DeepSeek) — https URL override for regional/proxy use.
- **Test** — the ONLY intentional live request: a fixed minimal prompt, no
  project data. Result: `CONNECTED (ms)` or a taxonomy error
  (`INVALID KEY`, `QUOTA EXHAUSTED`, `MODEL NOT FOUND`, network…).
- **Models** — runs discovery; merges into the catalog. Failure never breaks
  the provider — manual entry remains available.

### AI Jobs

Assignment table: provider dropdown, model dropdown (from that provider's
catalog), Assign/Clear. Status badges per job with color coding; the last
error is shown inline. Fallback policy defaults to *never*.

### Model Catalog

- Search box, provider filter, capability filters (Vision / Structured /
  Image Gen), context window per model, status per model
  (`READY`/`RETIRED`/`UNAVAILABLE`), origin marker for user-declared models.
- **Add Custom Model**: provider + exact model ID + optional display name +
  explicit capability checkboxes. Manual capabilities are labelled
  *USER DECLARED — NEEDS VERIFICATION* and provider discovery later verifies
  or corrects them (provider truth wins).

### AI Activity

Local metadata log (time · job · provider · tokens · outcome). Explicitly
labelled: never prompts, project data, or keys; nothing is sent anywhere.

## 3. Command Palette Entries

`Open AI Studio · AI Control Center · Analyze Current Project · Critique
Current Design · Test AI Provider Connection`

## 4. Design System

Both modes use the existing tokens (`archi-card`, `result-panel`,
`calc-select`, `result-action-btn`, corner marks, semantic colors), the
shared responsive layout, and the unified result-state pattern
(`ai-state-badge`, `ai-settings-state-badge`).
