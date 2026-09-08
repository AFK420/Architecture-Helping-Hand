# Design Intent

**Module:** `src/core/requirements.js` (`createDesignIntent`) · **Storage:**
`project.decisions[]` (the existing decisions container — same records, now
with a richer contract).

## What a design-intent record captures

```js
{
  id: 'intent-…',
  kind: 'intent',
  name: 'Corridor on north side',
  rationale: 'North corridor keeps south light for all habitable rooms.',   // the WHY — required
  alternatives: [                                                           // considered
    { option: 'Corridor on south side', whyNotChosen: 'Would block winter sun to bedrooms' }
  ],
  rejected: [                                                               // explicitly rejected
    { option: 'No corridor — rooms open onto each other', whyRejected: 'Circulation overlaps furniture zones' }
  ],
  createdBy: 'user',
  createdAt: ISO
}
```

## Why it matters

The app can later explain itself: why is the corridor here? Because a design
intent says so, with the rejected alternatives recorded. This feeds:
- the AI facts pack (existing `decisions` surface — intents appear as
  `DECISIONS:` lines with their rationale available),
- design-review conversations ("why is this wall here?" has a recorded answer),
- documentation exports.

## Rules

1. `rationale` is required — a decision without a why is not recorded.
2. Alternatives and rejected approaches are optional but structured (never
   free-floating prose blobs).
3. Records live in `project.decisions[]` — the existing Stairs/Ramps/Slopes
   studio tools already write plain decisions there; intent records are the
   richer shape, both render in the same container.
