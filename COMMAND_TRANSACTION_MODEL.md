# Command & Transaction Model

## Two layers, one contract

The application has two mutation systems that share the same guarantees —
never silently fail, always undoable, identity-stamped:

### 1. Canvas undo commands (`plan.js` + `core/plan-canvas.js`)

Fine-grained, interactive: every draw/modify/delete pushes a command object.

```js
{
  label: 'move Wall',          // description
  redo() { apply afterState; render(); },
  undo() { apply beforeState; render(); },
  // affected entities are the closed-over objects; before/after snapshots
  // are deep-copied at command creation
}
```

History: 100-deep (`createHistory(100)`), cleared on document switch (a
switch-undo would mutate a hidden document). `commitEntity()` is the single
choke point for entity creation: identity stamp → command → redo → history →
`entity.created` event → render → auto-frame when content escapes the view.

### 2. Model transactions (`transact()` in `plan.js`)

For multi-entity or non-command mutations:

```js
const undoTx = transact(affectedEntities, 'entity.updated', () => {
  // mutate affected entities — may throw
});
// later: undoTx() restores pre-transaction state and emits entity.updated
```

Guarantees (pinned by test): identity re-stamp on affected entities
(revision bump), all-or-nothing rollback on throw, before/after snapshots,
bounded `MODEL_EVENTS` emission, undo closure returned to the caller.

## Event flow on a canvas mutation

```
user action / command engine
  → commitEntity(entity)  or  transact(affected, event, mutator)
      → attachIdentity (revision++)
      → history.push (undo/redo available)
      → modelEvents.emit('entity.created'|'entity.updated'|…)
      → render + panels
```

## Command engine entry

`src/core/cad-commands.js` executes through `executeCadCommand(run, args)` in
`plan.js`, which resolves to the same deterministic operations the pointer
tools use — one geometry engine, two input modes. Interactive commands
(LINE/WALL/RECTANGLE/DIST/DIMLIN) are state machines whose steps accept
canvas picks, coordinates (`10,20`, `@5,0`, `@5<90`), or unit lengths
(`2400mm`, `8'`); cancellation is explicit and messaged.

## AI mutation path (contract, enforcement lands with the proposal UI)

```
AI PROPOSAL → PREVIEW → USER APPROVAL → transact(affected, event, apply)
                                          provenance: 'ai_applied'
```

AI never writes directly: proposals carry provenance `ai_suggestion`, and
only user-approved applications pass through `transact` with
`ai_applied` — keeping every mutation undoable and attributable.
