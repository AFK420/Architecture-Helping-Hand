# Command Grammar

**Engine:** `src/core/cad-commands.js` · **UI:** `src/ui/components/commandbar.js`
Registry: 24 built-ins + 53 catalog aliases = 77 commands. Legacy fallback:
`parseStudioCommand` (`REC 6 4`, `WALL 5`, `STAIR`, `HATCH`, `INSERT`).

## Command definition contract

```js
{
  id: 'cmd.wall',              // stable machine id
  name: 'WALL',                // canonical verb
  aliases: ['W'],              // alternate invocations
  description: string,         // one-liner (shown in autocomplete)
  category: 'draw'|'edit'|'view'|'inquiry'|'annotate'|'tool'|'ai'|'organize'|'system'|'view',
  interactive: true|false,     // multi-step prompt state machine?
  selection: 'none'|'optional'|'required',
  undo: true|false,            // does execution create undoable state?
  shortcut: 'W'|null,          // display shortcut (from tool catalog for tools)
  options: [                   // mid-command settings
    { token: 'WIDTH',  label: 'Width',  kind: 'length', min, max, fallback },
    { token: 'ALIGN',  label: 'Align',  kind: 'option', values: [...], fallback },
    { token: 'REVERSE',label: 'Reverse',kind: 'boolean', fallback }
  ],
  steps: [                     // interactive input sequence
    { kind: 'point',  prompt: 'Start point' },
    { kind: 'point',  prompt: 'End point', relative: true, preview: 'wall' }
  ],
  result: 'create_wall_points', // executor verb handed to plan.js
  help: 'usage text with an Example:',
  aiDescription: string        // for AI tool recommendation (same registry)
}
```

## Lifecycle

```
IDLE → START → PROMPT → INPUT → PREVIEW → CONFIRM → EXECUTE → COMMIT → COMPLETE
                                                                    ↘ CANCELLED (Esc, any point)
```

Session state exposes `{ active, lifecycle, command, stepIndex, stepCount,
prompt, options[], collected }`. `Esc` cancels explicitly with a message;
option chips include `[Cancel Esc]`.

## Input types per step

| kind | accepts |
|---|---|
| point | canvas click, `10,20`, `@5,0`, `@5<90`, unit length (guided along preview direction) |
| length | `2400mm`, `2.4m`, `8'`, `12'6 1/2"`, full expressions (`2m+400mm`) via the math engine |
| option | bare token cycles values; `TOKEN=Value` validates against the allowed set |
| boolean | `REVERSE=true/false` or bare `REVERSE` toggles |
| number, angle, string, selection | grammar-ready kinds — adopted per command as needed |

Coordinate entry uses the project's single unit engine (`parser.js` +
`units.js` + math engine). Bare numbers take the command's default unit.

## Statement forms

```ebnf
line    = verb , { arg } ;              (* one-shot or interactive start *)
step    = coordinate | length | option-setting | bare-option ;
option-setting = option-token , "=" , value ;
coordinate = [ "@" ] , coord , "," , coord [, "," , z]
            | "@" , distance , "<" , angle ;
distance   = number , [ unit ] | architectural-fraction | expression ;
expression = operand , { operator , operand } ;   (* math engine grammar *)
verb    = command-name | alias ;
```

Errors answer WHAT / WHY / EXPECTED / EXAMPLE — e.g.
`"WAL" → Unknown command "WAL". Did you mean WALL?` and
`Align must be one of: Center, Left, Right (received "diagonal")`.

## UI unification

Tool buttons and commands execute through the same definitions: catalog tool
aliases are *derived from* `STUDIO_TOOL_CATALOG` and route to the identical
`handleStudioToolAction` dispatch the buttons use. No duplicate business
logic; the AI layer recommends from the same registry (`aiDescription`
fields) via `serializeToolCapabilities`.
