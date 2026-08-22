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
board centered, rules below the fold. **The reference is the timing too**: a board
is 10 seconds to a few minutes, never an evening's sitting — the budget, and why
it binds every tier of every family, is `PUZZLE_FAMILIES.md` §3.2. A tier nobody
has timed against a human clock has not cleared this bar.

- The **board fits inside the viewport** on a 360×640 phone, with the header
  visible, without pan or zoom. Board sizes off available space
  (`min(100vw - gutter, 100vh - chrome)`), it does not set a pixel size.
- The **modal scrolls vertically**. The rules of the game sit below the board and
  are reached by scrolling — never a popup, never a separate screen.
- **No horizontal scroll, ever.** A grid too wide to fit means a smaller authored
  grid, not a scroll container.
- Tap targets ≥ 44px. A cell smaller than that needs a bigger cell, not a more
  precise finger.

### 1.1 Under the board: the goal, then how to play

Two sections, because they answer different questions.

**The goal is one sentence, and it describes a FINISHED board** — what the player is trying to end up with,
not what they may do on the way. It is the first thing read and it is read once, so it goes above the rules
rather than being the first bullet in them: working out the point of the board from five bullets is reading
four bullets too many.

**It is worded per IDENTITY, not per mechanic.** A family whose rules wear more than one face needs a
sentence per face — constellation's board is a star map, a haul-road network and a waterworks, and "give
every star as many lines of light as its number says" is wrong in two of those rooms. The skin already knows
which place the room is (§2), so the wording asks it. The AMBIENCE never changes it: a causeway at night is
still a causeway.

**A rule that describes the END STATE belongs in the goal; a rule that FORBIDS something stays a bullet.**
That is the line between the two sections, and it is worth stating because the first draft of these sentences
crossed it in both directions — star battle's goal repeated the no-touching rule listed three lines below it,
and constellation's "every star ends up in one constellation" was a bullet when it is the whole point of the
board. Whichever side a fact lands on, it is said once.

**How to play holds the rest, and it holds both kinds of thing** — what the board will not allow, and what a
tap or a drag does. Not split further, deliberately: most families have one control bullet, and a heading
over a single line is furniture. The order carries the distinction instead — **what the board IS first, what
the player DOES last**. Where a rule and a gesture are genuinely the same fact they stay together (balance
scale's cancelling is a truth about scales _and_ the tap that applies it), which is the case that would break
a hard split.

**A board only lists what it affords.** A rule about a mechanic absent from the grid in front of the player
is worse than no rule: it sends them looking for something that is not there. Balance scale grows its list
with the tier and lightbeam hides its socket line on boards without a socket.

## 2. Theming — the family renders states, the skin renders pixels

A room dresses out of **two** things it is told, and they answer different questions.

| What arrives | Authored as          | The question it answers                                            |
| ------------ | -------------------- | ------------------------------------------------------------------ |
| `ctx.role`   | `encounter: "trade"` | **Which place is this?** The pool the room was drawn from.         |
| `ctx.theme`  | `theme: "night"`     | **What is it like right now?** The hour and the weather, per site. |

- The family component emits **logical state** (`"empty" | "kept" | "struck"`,
  glyph index, clue). It hardcodes no color, texture, or glyph.
- A skin maps logical state to classes/sprites. Every family ships **one default
  skin**; more skins are added when a site asks for one, not up front.
- An unknown role or theme falls back to the default skin silently.

**The role is the identity, and it is what lets one mechanic be several things.** Constellation is the
reference: the same rules are a star map drawn for `sky`, a haul-road network drawn for `trade`, and a
waterworks drawn for `water`. An author asks for _trade puzzles in this pyramid_ and gets the families
that serve trade, each wearing its trade face — no site names a skin. Which is why the role is carried
into the room instead of being thrown away once it has picked a family: `placeEncounters` keeps the
question next to the answer.

**The ambience is the place, not the puzzle.** `theme` dresses a site — corridors at night, sand blowing
through them — and reaches boards too, so a room can be a causeway _after dark_. It **layers** on the
identity rather than replacing it. Asking for trade puzzles and getting a waterworks would be wrong,
and "the skin follows the site theme" is exactly what would have produced it.

**How the two combine is the family's call, deliberately.** Core hands over both and decides nothing,
because any precedence rule core picked would be wrong for some family. Constellation resolves role →
identity, layers a `night` overlay when the site is dark, and lets a theme naming one of its own skins
win outright — which is what makes every skin playable in the lab, where only a theme can be picked.
Eclipse has no roles and one ambience skin, so for it `theme: "night"` is the whole story.

A pyramid, a floor or a side section authors either (most-specific wins,
`worldgen-dsl-redesign.md` §"Puzzle skin"), the world file carries both, and every puzzle room is
stamped with what its own path asked for. `FamilyMeta.themes` lists the names a family has skins for,
and the lab's picker reads that list.

**Naming either can never break a room.** Both are opaque to core and to every other family, so a site
may ask for anything and a family that has never heard of it draws its default.

## 3. Controls — all four, all from the shell

| Control | Behavior                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Back    | Returns to the site map (`onCancel`). Always visible, always safe.                                   |
| Reset   | Restores the generated start state. No confirm dialog for a puzzle board.                            |
| Hint    | Shows the next step and why. Disabled 10s after use.                                                 |
| Idle    | A still board highlights the hint button — 30s at starter, up to 90s at wizard. Any input clears it. |
| Done    | The board freezes on solve; the banner lands 0.8s later and waits for a tap to leave.                |

**A family may finish its board before it says "solved".** The shell freezes the board and
starts the banner the moment `solved` goes true, so a completion animation belongs _before_
that word: the family runs its own celebration and reports the solve a beat later
(constellation is the reference — `useCelebration.ts`, and its family doc §9.2). Three rules
come with it, and they are why this is not simply "add an animation":

- **Refuse input while it runs.** A board that is finishing must not take a move — a player
  pulling a piece back out mid-celebration would land a solve on a board that is no longer
  solved.
- **Keep the whole run to about a second.** The shell stops its solve-time clock when it
  hears "solved", and that number is §3.2's instrument, so a three-second celebration adds
  three seconds to every board it measures.
- **`prefers-reduced-motion` skips it entirely** — animation and delay both. Holding a banner
  back for motion the player asked not to see is worse than not celebrating at all.

The clock itself is shared — `src/mods/core/app/useCelebration.ts` — and it owns only the clock: it
reports how far the run has got (0 → 1) and when it is over, and what that looks like is the family's
entirely. Constellation lights one node per tick; lightbeam runs a thicker beam along its route and
then flares the shrine off the same number.

**The banner reports the solve time**, wordless (`⏱ 1:07`) so it needs no locale, and
it is **on-screen time only** — the clock stops while the document is hidden, because a
board left open in a background tab is not time anyone spent on it
(`src/support/useVisibleElapsed.ts`). That is the instrument for §3.2's budget: the lab
(`src/app/dev/PuzzleLab.tsx`) plays the real screen, so timing a tier needs nothing of
its own — pick family and tier, solve, read the banner.

**The solved board is the reward, so it is the player who leaves it.** The banner
sits over a light dim rather than an opaque one — the finished board has to be
readable through it, because seeing what you built is the payoff for building it —
and it closes on a tap instead of a timer, which is a puzzle taking the reward
away before it has been looked at.

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
2. Back, reset, hint present; hint cooldown 10s; idle highlight scaled by tier (30s starter → 90s wizard).
3. Every hint carries a reason, sourced from the solver.
4. Spec: the generator produces no puzzle needing a guess — solve N seeds with
   techniques only, assert all complete.
5. Spec: every technique the solver claims can be triggered by a real board.
6. Rendering is skin-driven; one default skin, no colors in the family component.
7. Board and hint text contain no words the player must read to solve.
8. `docs/game-design/puzzles/<family>.md` exists and its technique ladder is the
   one the code implements.
