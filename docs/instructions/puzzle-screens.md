# Puzzle Screens

Applies to every puzzle family registered via `src/app/families/familyRegistry.ts`
(`src/mods/*/app/<family>/plugin.tsx`). The catalogue (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md`, and every family owns a design doc at
`docs/game-design/puzzles/<family>.md` — its rules, technique ladder, generation
gates, knobs and theming. This doc is the quality bar all of them must clear
before shipping. `sumplete.md` is the reference for what a family doc covers.

The shared shell (`src/mods/core/app/PuzzleFamilyShell.tsx`) owns the chrome:
back, reset, hint, cooldown, idle nudge, scroll container. A family supplies the
board, the rules block, and its solver — never its own copy of the chrome.

## 1. Layout — the board fits the phone, the page scrolls

Reference feel: LinkedIn's daily puzzles and Puzzle Express — chrome on top,
board centered, rules below the fold.

- The **board fits inside the viewport** on a 360×640 phone, with the header
  visible, without pan or zoom. Board sizes off available space
  (`min(100vw - gutter, 100vh - chrome)`), it does not set a pixel size.
- The **modal scrolls vertically**. The rules of the game sit below the board and
  are reached by scrolling — never a popup, never a separate screen.
- **No horizontal scroll, ever.** A grid too wide to fit means a smaller authored
  grid, not a scroll container.
- Tap targets ≥ 44px. A cell smaller than that needs a bigger cell, not a more
  precise finger.

## 2. Theming — the family renders states, the skin renders pixels

The same puzzle dresses up per site (`ctx.theme`).

- The family component emits **logical state** (`"empty" | "kept" | "struck"`,
  glyph index, clue). It hardcodes no color, texture, or glyph.
- A skin maps logical state to classes/sprites. Every family ships **one default
  skin**; more skins are added when a site asks for one, not up front.
- Unknown `ctx.theme` falls back to the default skin silently.

## 3. Controls — all four, all from the shell

| Control | Behavior                                                                  |
| ------- | ------------------------------------------------------------------------- |
| Back    | Returns to the site map (`onCancel`). Always visible, always safe.        |
| Reset   | Restores the generated start state. No confirm dialog for a puzzle board. |
| Hint    | Shows the next step and why. Disabled 10s after use.                      |
| Idle    | 30s with no player input highlights the hint button. Any input clears it. |

The shell needs the family to report input, so hint/idle work without the family
re-implementing them:

```tsx
<PuzzleFamilyShell
  onSolved={onSolved}
  onCancel={onCancel}
  solved={isSolved} // or call api.solved() for event-shaped families
  onReset={() => setState(initialState)}
  hint={hint && t(`sumplete.hint.${hint.key}`, hint.params)}
  rules={<SumpleteRules />}
>
  {({ reportInput, hintVisible }) => <SumpleteBoard … />}
</PuzzleFamilyShell>
```

Every state-changing player action calls `reportInput` so the idle timer resets
and the stale hint clears. A family that tracks its own 30s timer is a bug.

## 4. Hints teach, they do not spoil

A hint names **one next step and the reason it follows** — "this row already has
its target, so the rest of the row is struck out." After it, the player knows a
technique they can reuse.

- Hints come from the **technique solver** (§5), never from the answer key.
  Reading the solution and pointing at a cell is not a hint.
- A hint is data, not a sentence: `{ techniqueId, cells, params }`. The shell
  renders it through an i18n template with **numeric/glyph slots only** —
  same language rule as the boards (`PUZZLE_FAMILIES.md` P2).
- The hint highlights the cells it talks about.
- Hints never mutate the board. The player still makes the move.

## 5. Solvable by logic — the solver is the family's core

Rule 9 of the bar: a generated puzzle must be reachable by deduction alone.
Uniqueness is not enough — a unique puzzle can still demand a guess-and-backtrack.

Each family ships a **technique solver**: an ordered list of named deduction
techniques, each returning the cells it can settle and why. That one module does
three jobs:

1. **Generation gate** — generate, then solve with techniques only. If it stalls
   before completion, discard the seed and draw the next one.
2. **Hints** — the first technique that fires on the current board _is_ the hint.
3. **Difficulty** — which techniques a puzzle needs is the honest difficulty
   signal, and feeds the family's knobs.

The domain solver lives beside the family's state model
(`src/mods/*/game/<family>/`), free of React, per
`docs/instructions/state-models.md`.

## 6. Playtesting — the puzzle lab

`src/app/dev/PuzzleLab.tsx`, on the Travel page in develop mode: pick family,
theme and tier, play the real screen through the real `EncounterModal`, reroll
the seed. A family shows up there by being registered and tagged `puzzle`; its
theme list comes from `FamilyMeta.themes`, its tiers from `minTier` upward.
Rewards are dropped there — the lab tests the screen, not the economy.

## 7. Definition of done for a puzzle family

On top of AGENTS.md's general DoD:

1. Board fits a 360×640 viewport; page scrolls to the rules; no horizontal scroll.
2. Back, reset, hint present; hint cooldown 10s; idle highlight at 30s.
3. Every hint carries a reason, sourced from the solver.
4. Spec: the generator produces no puzzle needing a guess — solve N seeds with
   techniques only, assert all complete.
5. Spec: every technique the solver claims can be triggered by a real board.
6. Rendering is skin-driven; one default skin, no colors in the family component.
7. Board and hint text contain no words the player must read to solve.
8. `docs/game-design/puzzles/<family>.md` exists and its technique ladder is the
   one the code implements.
