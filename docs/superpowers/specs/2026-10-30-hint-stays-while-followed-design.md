# A hint stays while the player follows it — design

## Problem

A revealed hint disappears on the player's first move (`useHintAvailability.ts`, `reportInput()` sets
`revealed = false`). A hint that decides several squares ("rule out the hatched squares") is gone after the first
one, so the player has to remember the rest or ask again and wait out the cooldown. On top of that every family
recomputes its hint from the board on each change, so a second reveal may name a different step.

Seen on regionless battle; the same happens in every family whose hint can decide more than one thing.

## The rule (one, for every family)

**A revealed hint stays until a move contradicts it or completes it. Looking never ends it.**

- **Follows** — the move writes, on a square the hint is about, the value the hint asks for, or a value on the way to
  it in that square's tap cycle (a dark mark on the way to a star). The hint stays; its markings shrink to what is
  still open.
- **Completes** — after the move every decision of the hint holds. The hint ends.
- **Contradicts** — any other move, plus undo and reset. The hint ends.
- **Looks** — selecting a cell, toggling pencil mode, picking up a run, focusing a bar, choosing a glyph: no board
  value changes. The hint stays and the idle timer restarts.

The hint shown is the one computed at reveal, frozen until it ends. The next reveal computes a fresh one.

## How the families fit the rule

| group | families | follows check |
| --- | --- | --- |
| Decides marks on several squares | starBattle (incl. twin, regionless), pairPuzzle, eclipse, sumplete, constellation, sudoku (rule out notes) | per square: written value equals the target or is on the way to it |
| Decides one move | rushHour, procession, hidato, crocodile, sudoku (place) | the move is the hinted one → completes; otherwise contradicts |
| Explains, decides nothing checkable | canisters, futoshiki, balanceScale, lightbeam | every move completes it (today's behaviour); looking keeps it |
| No hint | lightbeamSwitch, hieroglyph | unchanged |

Futoshiki, balance and lightbeam drop their decisions on purpose (balance never names a weight), so they stay
explanatory; exposing their decisions is not part of this work.

## Shell changes

- `useHintAvailability`: `reportInput(effect?: "move" | "follows" | "look")`, default `"move"`. `"move"` hides the
  hint (as now); `"follows"` keeps it; `"look"` keeps it. All three restart the idle timer and clear the nudge.
- `PuzzleFamilyShell` passes the new signature through its render prop. Undo and reset keep calling it as `"move"`.
- A small core hook freezes a family's hint at reveal (`onHintRevealed`) and drops it when the shell hides it, so no
  family keeps recomputing a revealed hint.

## Family changes

- Hints that decide marks expose their decisions as data: `{ cell, target }[]` (star battle and pair already carry
  `decided` + `action`; eclipse, sumplete, constellation and sudoku keep the per-square target the builder already
  has instead of collapsing it into one `action`).
- Each move handler classifies its own move with the frozen hint and calls `reportInput("follows")`,
  `reportInput("move")` (contradicts or completes) or `reportInput("look")`.
- Markings (hatch, rings, focus) draw only the decisions still open.
- Selection-only handlers (sudoku/futoshiki `onSelect` and `onTogglePencil`, hidato `onPickUp`, procession
  `onFocus`, balance `onSelectGlyph`) call `"look"`.

## What the tests freeze

Per family with a checkable hint (the first two groups), behaviour tests on the screen:
1. A move that carries out one of several decisions keeps the hint visible, and the carried-out square is no longer
   marked.
2. The move that completes the last decision ends the hint.
3. A move elsewhere ends the hint.
4. A tap that reaches the target through an intermediate value (two-tap cycles) keeps the hint after the first tap.

Shell: `"follows"` and `"look"` keep the hint, `"move"` hides it, undo and reset hide it.
Explanatory families: selecting keeps the hint, a move ends it.

## Non-goals

- Changing what any hint says or which step it picks.
- Exposing decisions for futoshiki, balance, lightbeam or canisters.
- Changing the cooldown, the idle nudge timings, or hint counting.
