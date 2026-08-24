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

### 1.1 Over the board: what this room is called

**A board is recognisable by its shape once it is open, and not at all before that.** A floor of rooms,
or a list of them, is a row of icons that all mean "a puzzle" — so the shell shows the room's name over
the board, and that is the thing a player says to themselves about it afterwards.

- **The family supplies the name, core places it.** `PuzzleFamilyShell` takes a `title`; it never learns
  what a family is called, the same way it never learns a goal or a rule.
- **It is worded per IDENTITY, like everything under the board** (§1.2 below). The same mechanic dressed
  as a causeway is called one — a haul-road network titled "Star Map" is the drift §4.3 exists to catch,
  one line higher up the screen. `goalWording.spec.ts` guards it, and guards that a family added later
  is named at all.
- **The tier is not part of it.** Not because difficulty does not matter, but because **a label inside
  the room says it in the wrong place and too late**: every path is already authored to a difficulty
  (`SubSection.difficulty`), and what that data is for is telling a player which kind of area they are
  walking into *while they navigate the floor*, so the challenge a room serves is the one they were
  expecting. The signal belongs on the floor; by the time the board is open it has been read.

### 1.2 Under the board: the goal, then how to play

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
That is the line between the two sections, and it is easy to cross in both directions: a no-touching rule
repeated in the goal and listed three lines below it is said twice, and "every star ends up in one
constellation" is the whole point of the board rather than a bullet among five. Whichever side a fact lands
on, it is said once.

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

A hint names **one next step and the reason it follows**. After it, the player knows a technique they can
reuse.

- Hints come from the **technique solver** (§5), never from the answer key. Reading the solution and pointing
  at a cell is not a hint.
- A hint is data, not a sentence: `{ techniqueId, cells, params }`. The shell renders it through an i18n
  template with **numeric/glyph slots only** — the same language rule as the boards
  (`PUZZLE_FAMILIES.md` P2).
- Hints never mutate the board. The player still makes the move.

### 4.1 Two lines: the reason, then the move

**A reason on its own is half a hint.** It leaves the player working out what it wants of them, which is a
step nobody should have to take from something they went and pressed a button for. So a hint is:

1. **The reason** — what the board makes true. One sentence, no consequence clause.
2. **The move** — an imperative. "Rule out the hatched squares." "Put 🌙 in the hatched squares." "Cross out
   the hatched numbers."

The consequence lives in the move, never in both: "this line has its 4 ☀️, **so the rest are 🌙**" followed by
"put 🌙 in the hatched squares" says the same thing twice, which is the fault §1.2 describes between the goal
and the rules, one level down.

The shell keeps hint text pre-line, so a family returns the two lines separated by a newline. One line stays
right for a family whose reason IS the move — lightbeam's "leave this one alone" has nothing to add, and
balance scale's reasons have ended in an imperative from the start ("tap one to take it off both sides"),
which is where this pattern was already working before it was written down.

**The move is plural-aware.** A rung that settles one square and one that settles six get the same sentence
otherwise, and "the hatched squares" over a single square is a sentence the player has to re-read. Use
i18next `_one`/`_other` with a `count`, and add both forms to `plurals.spec.ts` — a missing form reaches the
player as the raw key.

**A mistake hint asks for nothing.** Every other rung ends in a move, but the way out of a wrong mark is the
player's to find; naming it would be naming the answer.

### 4.2 The words name the marking, and the marking means one thing

**A hint that says "the rest of the row" makes the player decide which squares that was.** A hint that says
"the hatched squares" does not. So the board marks what the hint is about, and the sentence names the marking
rather than describing the squares. The vocabulary is shared, so a player who learns it on one family keeps
it on the next:

| Drawn as                     | Means                             | Called            |
| ---------------------------- | --------------------------------- | ----------------- |
| Diagonal hatching            | The squares this hint **settles** | "hatched"         |
| A bright ring, or a lit tile | What this hint **argues from**    | "marked", "lit"   |
| One stronger ring            | The single square it is **about** | named as "this …" |

Two rules hold this together:

- **Evidence and conclusion never look the same.** One ring over six squares makes "this square" a guess
  between them.
- **A treatment means one thing.** Hatching belongs to hints, so no board may also hatch its blocked squares
  or its givens — the moment it does, both uses become ambiguous. Star battle's hint hatching is only free
  because the blocked squares that once used it were removed.

Credit where it is due: LinkedIn's Queens does both of these, and its hint is the clearest one going —
"het gemarkeerde gebied moet een ♛ bevatten … elimineer de gearceerde vakjes".

### 4.3 Worded per identity, like everything else under the board

A family whose mechanic wears more than one face words its hints per face, the same way §1.2 words its goal
and its rules — **the reason and the move both**. Constellation is the worked example: the same rung reads
"3 lines, and the other ways out cannot carry them all / draw the marked line" over a sky, and "3 roads … /
lay the marked road" over a causeway. The skin knows which place the room is; the wording asks it.

**Each place gets whole sentences, not a noun in a slot.** A shared template with `{{thing}}` in it breaks on
the first locale that inflects around the noun — Dutch does immediately ("van de ene ster naar de volgende"
against "van het ene bekken naar het volgende"), and the verb goes with the place too: a line is drawn, a road
is laid, a channel is dug.

**A spec is the only thing that keeps this true.** The wording drifted once already — the goal and the rules
were reworded a commit before the hints, which went on describing a sky over both other places. So the guard
is a rule about words rather than a check for presence: nothing said over a road or a waterworks board may
contain the word "star" (`goalWording.spec.ts`).

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
the seed. A family shows up there by being registered and carrying one of the board tags —
`puzzle`, `tomb-puzzle` or `capstone` (`playableInLab`); its theme list comes from
`FamilyMeta.themes`, its tiers from `minTier` upward. Rewards are dropped there — the lab
tests the screen, not the economy.

**The tomb's own boards are on the list for the same reason the others are**: a family the bench cannot
reach is a family nobody reviews, and the two that were reachable only by walking a real tomb are the two
that have had the least of it. Both generate without a tomb around them — a tableau falls back to a draw
from the tier pool when no floor is resolvable. What the bench does NOT do is grant a save anything: a
tableau asks the save for completed hieroglyphs to fill its slots, so it plays there only as far as the
fragments already collected allow. Enough to look at the board; not enough to solve one cold.

It is quick manual quality control, so **it plays the boards that ship**: for a family with a seed list
(§6.1) the reroll walks that list rather than searching for arbitrary boards, and wraps at its end. A
board only the bench can reach is a board nobody is checking. While a dial is being tuned this makes no
difference — changed options miss their bucket and the board is searched for live, which is what tuning
wants — so the two only diverge once a tier has settled and been filled.

## 6.1 Seed lists — the search happens on a build machine, not a phone

A family that has to search for a board declares three things and stops thinking about it. Core
enumerates the configurations, finds seeds, and emits `src/data/puzzleSeeds.ts`; the family never
learns that lists exist.

```ts
seedable: seedable({
  resolveOptions: ctx => TIER_CONFIG[ctx.difficulty ?? "starter"],
  generate: (seed, options, attempts) => generateThing(seed, options, attempts),
  grade: gradeThing,
})
```

**A bucket is keyed by a hash of the options object the generator is handed**, not by family and tier.
That is what makes a list self-invalidating: turn a dial and the options change, so the key changes, so
the lookup misses and the board is built live. There is no version to bump. Two tiers whose tables
coincide share one list, which is correct rather than wasteful.

The three preconditions, and why each is load-bearing:

- **`resolveOptions` is separate from `generate`.** A build script with no React has to derive the same
  options the app will. It reads only `difficulty` and `variant` — `theme` picks a skin and never
  reaches a generator, which is why `FamilyGenerationCtx` does not carry it.
- **`generate` takes an attempt cap**, so one attempt can be asked for. It is a parameter and not a
  field on the options, because the options are what the key hashes: asking for one attempt must not
  file the board under a different bucket.
- **`grade` must be at least as strict as the gate the generator accepts a board on.** It may reject a
  board the loop would have kept; it must never admit one the loop would have rejected. Where the loop
  can call it, it should — that is the cheapest way to be sure. Where post-processing sits in between
  (balance scale trims redundant scales after gating), grade runs on the board that ships and is
  conservative, which is the safe direction.

**Only seeds clean on the first attempt get listed**, so play time runs exactly one attempt with no
gates. This matters most for the families that keep a **nearest miss** when no attempt hits the tier's
required rungs — star battle, twin stars, eclipse, constellation. There, a board coming back does not
mean it was accepted, so `grade` is the only thing that can tell the difference. Families that throw
instead (sumplete, futoshiki, lightbeam) are already telling you by returning at all, and grade
re-checks the ladder and records what it demanded.

**A room's seed indexes the list rather than seeding the generator.** `hashString(journeyId + edgeId)`
is unchanged; `seeds[seed % seeds.length]` picks the entry. So the offline pass only ever enumerates
_configurations_, never the rooms a player can reach — reassembling a floor or regenerating the world
cannot invalidate a list.

A miss always falls through to live generation. That is not a failure path: it is how a tier being
tuned still yields boards with no build step in the way, and how a lab `variant` (which changes the
options, and which no room is ever authored with) is guaranteed a freshly searched board.

`yarn generate-seeds` fills every bucket the baked world asks for, targeting the number of rooms that
draw from it. `yarn seeds-info` reports coverage and what each tier's boards demand — the honest
difficulty signal §5 names, which nothing else measures per board. `src/mods/puzzleSeeds.spec.ts`
fails the build when a bucket is missing, orphaned, or no longer grades.

### Building a new generator: keep the gate separable from the construction

The list removes a family's **retries**. It does not remove its **gates** — and how much a family gains
depends on which of those its time goes into, so it is worth knowing before the generator is written
rather than after.

Measured across the catalogue, live search against building from a listed seed at wizard:

| generator shape                      | family                  | saving                   |
| ------------------------------------ | ----------------------- | ------------------------ |
| draw a whole candidate, then test it | twin stars, star battle | 1240ms → 3.1ms, **400x** |
| gates fused into the construction    | lightbeam               | 132ms → 74ms, **2x**     |

A family that builds a complete candidate and then asks "would I keep this" spends nearly all its time
in draws it threw away, and jumping straight to the draw that worked is nearly the whole cost. Lightbeam
instead gates as it builds — `attemptAuthored` checks uniqueness, the ladder and the honest opening
partway through and bails — so a single attempt still pays for all of it, and a verified seed only saves
the second and third attempts.

**So: build the candidate, then judge it.** A generator shaped that way gets a `grade` that is
literally its own gate, the strongest form of the rule above, and it gets essentially free play-time
generation. One that interleaves the two gets a weaker `grade`, and keeps paying at play time for
checks a build machine already did.

This is not a reason to contort a generator that genuinely has to prune as it goes. It is a reason not
to interleave by accident, which is the easier mistake — and a reason to notice, if a family comes out
slow, that the shape may be the cause rather than the dials.

**What it is emphatically not** is a reason to keep a dial low. Generation cost has twice decided a
design question in this repo (lightbeam lost a decoy to a 1400ms budget, and branch depth was pinned at
one because two measured at 8.5s), and neither was recorded as a design decision. That is what this
whole mechanism exists to stop. Set the dials to what the design wants; the build machine pays.

Not every family needs this. A generator that builds straight from the RNG with no search and no gate
(crocodile, the reflex traps) has nothing to skip and leaves `seedable` unset.

## 7. Definition of done for a puzzle family

On top of AGENTS.md's general DoD:

1. Board fits a 360×640 viewport; page scrolls to the rules; no horizontal scroll.
2. Back, reset, hint present; hint cooldown 10s; idle highlight scaled by tier (30s starter → 90s wizard).
3. Every hint carries a reason, sourced from the solver, and a move that names the squares it marked (§4.1,
   §4.2) — or is a mistake hint, which asks for nothing.
4. Spec: the generator produces no puzzle needing a guess — solve N seeds with
   techniques only, assert all complete.
5. Spec: every technique the solver claims can be triggered by a real board.
6. Rendering is skin-driven; one default skin, no colors in the family component.
7. Board and hint text contain no words the player must read to solve.
8. `docs/game-design/puzzles/<family>.md` exists and its technique ladder is the
   one the code implements.
9. If the generator searches for a board, it declares `seedable` (§6.1) and `yarn generate-seeds`
   fills its buckets.
