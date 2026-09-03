# AI JOBS — Architecture Helping Hand

**Status**: Implemented (Phase 15) · **Date**: September 2026

---

## 1. Concept

AI jobs are named architectural tasks. The rest of the application calls
`runAIJob(jobId, request)` — never a provider, never a model. Each job maps
to a specialist mode profile (system prompt + output schema from
`src/ai/modes/modes.js`) plus routing requirements.

## 2. Job Definitions

| Job | Mode | Requires | Output |
|---|---|---|---|
| General Assistant | Design Mentor | text | prose |
| Tutor | Tutor (Socratic) | text | prose |
| Design Mentor | Design Mentor | text | prose |
| Studio Critic | Critic | text + structured | findings JSON |
| Brutal Critic | Brutal Critic | text + structured | findings JSON |
| Jury | Jury | text + structured | findings JSON |
| Ideation | Ideation | text | prose |
| Best Practice | Best Practice | text | prose |
| Project Analysis | Critic | text + structured | findings JSON |
| Image Analysis | visual | text + **vision** | observations (approximate) |
| Concept Image | visual | text + **imageGen** | conceptual image, labelled |

## 3. Assignment

The user assigns provider + model per job in the AI Control Center. Assignment
is refused when:

- the provider is unknown or disabled,
- the model is not in the catalog,
- the model lacks a required capability (e.g. a vision job on a text-only
  model: *"Selected model does not support vision. Choose another model."*).

Assignments persist (`archiscale_ai_jobs`) without keys or project data and
survive reloads.

## 4. Job Health States

`READY · NO KEY · PROVIDER DISABLED · MODEL UNAVAILABLE · CAPABILITY MISMATCH · NOT CONFIGURED · LAST ERROR`

- A disabled provider never silently switches: jobs report *Provider disabled*.
- A retired/removed model reports *MODEL UNAVAILABLE* with no automatic switch.
- The last error per job is visible until a later request succeeds.

## 5. Fallback Policy

Per assignment, default **NEVER**:

| Policy | Behavior |
|---|---|
| `never` (default) | failure returns to the user; no alternatives offered |
| `same-provider` | on quota/network failures the router may list other models of the same provider |
| `any-configured` | candidates from any enabled, keyed provider |

Even with a policy, the router **never executes** a fallback silently — it
returns `fallbackCandidates` for the user to assign explicitly.

## 6. Execution Pipeline

```
Job → resolve assignment → capability check → key check → model status →
context budget vs model window → transport → normalized response →
structured schema validation → numeric fact-check vs deterministic facts →
UI-ready result
```

- Context budget: tokens ≈ chars/4; oversized context refuses with guidance
  ("Select relevant context or a larger model") instead of silent truncation.
- Structured outputs are fence-tolerant JSON-extracted and schema-validated;
  numeric claims in any output are compared against core-calculated facts and
  mismatches are classified **NEEDS VERIFICATION**.
- Every call appends a metadata-only entry (job, provider, model, outcome,
  tokens, duration) to the local activity log — never prompts, project data,
  or keys.
