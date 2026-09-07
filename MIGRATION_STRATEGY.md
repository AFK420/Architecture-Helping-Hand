# Migration Strategy

## Machinery

Migrations live in `services/store.js`:

```js
export const MIGRATIONS = Object.freeze([ migrateProjectV1toV2 ]);  // v1→v2
export const CURRENT_STORE_VERSION = PROJECT_SCHEMA_VERSION;        // = 2
```

Invariant (tested): `MIGRATIONS.length === PROJECT_SCHEMA_VERSION − 1` — one
pure function per version step. `migrateEnvelope({version, project})` walks
the chain, refuses future versions **loudly** ("Stored project version N is
newer than this app understands… refusing to open it to avoid data loss"),
and runs `validateProject` on the result before use.

## Registered migrations

### v1 → v2 (`migrateProjectV1toV2`, `src/core/project-schema.js`)

Pure enrichment — no geometry is touched or lost:

1. `schemaVersion` → 2.
2. Every entity in every document: stable `id` assigned if missing (existing
   ids preserved), stored derived shadows (`length`, `angleDegrees`, `area`,
   `perimeter`) stripped (readers re-derive via `deriveFacts`), `_meta`
   identity attached with `provenance: 'migrated'`.
3. `relationships` index created (empty; rebuilt on demand).

Migration is **pure**: the input document is never mutated (pinned by test).

## Where migration runs

- Active envelope: `loadProject()` at boot (and every subsequent load).
- Library documents: `loadProjectFromLibrary(id)` — migrated through the same
  chain before validation.
- Future versions fail with the explicit update message; malformed versions
  fail with explicit messages. Nothing silently corrupts.

## Persistence of migrated state

Migration is in-memory at load; the migrated document is persisted on the
next `saveProject`/`updateProject`. This is deliberate — a failed session
never half-writes v2 state; the v1 data stays on disk untouched.

## Adding a future migration (v2 → v3)

1. Bump `PROJECT_SCHEMA_VERSION` to 3 in `core/project.js`.
2. Push `migrateProjectV2toV3` onto `MIGRATIONS` (pure, input untouched).
3. Extend `validateProject` for the new shape.
4. Update the invariant test in `tests/store.test.js` and add migration
   fixtures to `tests/project-model.test.js`.
5. Never edit an old migration in place once released — chain integrity is
   what makes old projects safe.

## Failure handling

| Condition | Behavior |
|---|---|
| `envelope.version > CURRENT_STORE_VERSION` | loud error + refusal to open |
| non-integer / `< 1` version | loud error |
| missing migration step | loud error (chain-invariant test prevents) |
| migration throws | `loadProject` returns `{ok:false, errors[]}` — caller decides; storage untouched |
| validate fails after migration | same — no partial state is committed |
