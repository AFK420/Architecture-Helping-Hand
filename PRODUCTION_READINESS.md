# Production Readiness

**Assessment date:** September 7, 2026 (updated after second hardening pass)
**Overall verdict: Production-ready with known minor risks** — fit for its stated purpose (educational/design-assistance architectural tool). All identified P1/P2 defects from both audit passes are fixed and pinned by tests; what remains are minor, documented limitations below. The app itself correctly disclaims that it is not a code-certification engine.

## Checklist

- [x] Build passes — `npm run build` (bundle 1,976.8 KB) and `node scripts/build.js --check` (in sync with `src/`)
- [x] Tests pass — `npm test`: **50/50 suites, 4,613 assertions** (baseline before audit: 49/49, 4,583)
- [x] Type checking — N/A (plain JS with JSDoc; no TS config in repo; build-integrity suite enforces bundle/module contracts instead)
- [x] Lint passes — N/A (no linter configured in repo; noted as future work)
- [x] Critical bugs resolved — 4× P1 fixed (compliance-inspector NaN, storage false-positive saves, undo cross-document leak, ramp inspector NaN)
- [x] Security audit completed — four-pass audit; key-in-URL fix, 3 escaping sinks hardened; no eval, no CDN, no committed secrets, import/AI render paths escape untrusted data
- [x] Accessibility audit completed (static shell + key flows) — skip link added, icon buttons aria-labeled; full dynamic-view audit still recommended
- [x] UI/UX audit completed — via four-pass code audit + live browser verification (no redesign performed; product intent preserved)
- [x] Responsive audit completed (static analysis + prior Playwright QA baseline; no new regressions introduced)
- [x] Major workflows verified — converter, stairs, ramps exercised live in-browser; full suite covers engines
- [x] Error states verified — compliance inspectors now emit explicit "cannot evaluate" scorecards; ramp multi-segment degrades gracefully
- [x] Loading states verified — existing suite (no changes needed)
- [x] Empty states verified — existing suite (no changes needed)
- [x] Production configuration reviewed — version drift fixed, CI added, SW precache hardened
- [x] Remaining risks documented — see below and `PRODUCTION_AUDIT.md`

## Known remaining risks

> **Update (September 7, 2026, second pass):** risks 1–3 below were subsequently fixed (plan-canvas rAF render batching, scrubber mid-drag rebuild, persisted-shortcut migration). See `PRODUCTION_AUDIT.md` → "Second Hardening Pass". Final verification after the second pass: 50/50 suites, 4,629 assertions; lint clean; live browser stress test passed.

1. ~~**Performance (P2, unfixed):** plan canvas full re-render per pointermove~~ — **FIXED** (rAF-coalesced scene renders; panels decoupled).
2. ~~**UX (P2, unfixed):** property-inspector scrubber invalidates its own input mid-drag~~ — **FIXED** (scene-only updates during scrub).
3. ~~**Legacy persisted shortcut bindings**~~ — **FIXED** (defaults-win migration on load).
4. **BYOK model:** stored API keys are exposed to any XSS (none known); editable endpoints now require confirmation before a key is first sent to a new host, but no host allowlist exists.
5. **No TypeScript** — correctness relies on the 50-suite harness, the build-integrity tests, and `npm run lint` (zero-dependency static checks).
6. **`switchMode` still hand-duplicates per-mode refresh calls** alongside the now-live registry hooks — harmless duplication, prunable later.
7. Committed QA artifacts (`qa-baseline.json`, `qa-report.json`, `scratch/`) are intentional but unusual.

## Verification evidence

- Baseline: `npm test` → 49/49 suites, 4,583 assertions, all pass (before any change).
- Final: `npm test` → **50/50 suites, 4,613 assertions, all pass**.
- `npm run build` → success; `node scripts/build.js --check` → bundle in sync with `src/`.
- Live in-app browser against a local server: app boots cleanly; skip link and aria-labels present in DOM; illegal 250 mm riser now renders "VIOLATION · Non-Compliant" with correct values (previously "NaN mm / Full Compliance"); no `NaN` in stairs or ramps output; unit selects populated.
- Full `git diff` reviewed line-by-line after all fixes (hostile-review pass); one self-caught defect (early `return` skipping render blocks) fixed before commit.

No results in this file are claimed without the corresponding command or inspection above.
