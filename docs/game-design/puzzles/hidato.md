# Hidato — the beehive

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.18; the screen bar every family must clear lives in
`docs/instructions/puzzle-screens.md`. This doc holds what is specific to hidato: what the
player is deducing, its technique ladder, and how generation proves a board needs the reasoning
its tier claims.

> **Built and measured, not yet played.** Every number below comes from the shipped generator
> and technique solver. Solve times are still targets: the lab (`src/app/dev/PuzzleLab.tsx`)
> plays the real screen and its banner reports the solve time, so timing a tier needs nothing of
> its own.

## 1. Rules

A honeycomb of cells, each one holding a number from 1 to however many cells there are:

- **Consecutive numbers sit in touching cells.** Six neighbours to a cell, since the comb is
  hexagonal.
- **Every cell holds a number, and no number appears twice** — so the finished board is one
  unbroken run threading the whole hive.
- Some numbers ship written in, the first and the last among them.

That is the whole rule set. There is nothing to read, nothing to compare, and no second clue
layer: adjacency is the only constraint, which is why a ten-cell comb is already a real puzzle.

## 2. Why this family

**It is the only family in the catalogue that trains the number line.** Every other logic
family is constraint satisfaction over cells that do not care what their neighbours hold —
sumplete and cross-sum add, futoshiki and eclipse compare, star battle and constellation count.
Here the question is "what sits between the 14 and the 17", which is counting on and counting
back, and no other board asks it.

**It is also the family that is self-checking without being told.** A run that breaks is visible
at the break: the player can see they are three cells from the 20 with two numbers left. That is
worth more than it sounds, because it is the one thing the harder families cannot do — a wrong
star or a wrong number in a Latin square looks exactly like a right one until much later.

**The hive is a second layout engine, and it earns the cost.** Six neighbours instead of eight is a
genuinely different board to read, and a honeycomb of sealed chambers is the most on-theme shape in
the catalogue. The engine stays small: `src/mods/puzzle/game/hidato/hex.ts` is coordinates,
neighbours, distance and the shape a board is carved from, and nothing else. It carries no clue
triangles, no palette and no regions — which is what would make a hex grid expensive.

## 3. Generation — carve the answer, then hide it

The shape comes first, then the run that covers it, then the hiding:

1. **Shape the comb.** The full hexagon one size down, plus a contiguous arc of the next ring
   out until it holds `cells` cells (§3.1).
2. **Walk it.** A self-avoiding walk covering every cell of that shape, choosing at each step the
   neighbour with the fewest ways out of its own (Warnsdorff) — except `wander` of the time, when it
   takes any open cell instead (§3.3). Restarted from a fresh cell if it paints itself into a corner,
   or if the run it produced laps the rim (§3.3). The walk IS the answer.
3. **Thin from the whole answer down.** Every number starts written in; each is taken away in
   turn for as long as the technique solver still reaches the end unaided. The first and the last
   number never leave (§3.2).
4. **Hand some back.** Numbers are offered one at a time up to the tier's floor, and each one is
   kept only if the board still grades — a written-in number can retire the very rung the tier
   asked for (§5.2).

**Carving the answer first is what removes the path search.** A board is a Hamiltonian path by
construction, so nothing ever looks for one — which is the expensive half of this family
elsewhere. What the walk can do instead is fail to cover its shape, and the answer to that is to
start it again somewhere else, which is cheap.

**Uniqueness needs no solution counter.** Every step the thinning gate accepts is a forced step,
so a board it admits has exactly one answer. That is the same argument futoshiki makes, and it
is why neither family counts solutions anywhere.

### 3.1 The shape is fixed first, and it is an arc rather than a scatter

**The region is fixed before the walk starts, and the walk then has to cover all of it.** Letting the
walk take whatever cells it visited out of a hexagon of `radius` is one line shorter and produces
**rings**: Warnsdorff steps into the cell with the fewest ways out, which on an open hexagon means the
boundary, so a walk asked for 14 of a 19-cell hexagon goes round the outside and leaves a hole through
the middle. Two things wrong with that, and the second is the serious one:

- a comb with a hole reads as broken rather than as a hive;
- **a ring is nearly a corridor.** A run has almost no choice of route around it, so the board is far
  easier than its cell count suggests, and the tier dial stops meaning anything.

Fixing the region first keeps every board a hive with its outer row part-built. The arc is contiguous
for the same reason: outer cells scattered round the ring are bumps a run has to weave out to and back
from, and enough of them make the shape Hamiltonian-impossible.

### 3.2 The two ends always ship written in

A board that hides where the run starts is asking the player to guess, and every other reason
eventually leans on a known number. Keeping 1 and the last number also means **every stretch of
empty cells lies between two known numbers**, which is what makes the interaction work without a
direction control (§6) and what makes the gap rung well-defined (§4.3).

### 3.3 The run must not just go round the outside

**Warnsdorff hugs the boundary**, because a boundary cell is the one with the fewest ways out. Left to
it the answer laps the rim — on a full 19-cell hive the longest unbroken stretch of run sitting on the
outer ring runs to around **11 cells**. Nothing about that is unsolvable; it is worse than that, it is
*guessable*. A player who has met two such boards knows where the run goes before reading a single
number.

Two dials, and they work as a pair:

- **`wander`** — how often the walk ignores its own heuristic and steps into any open cell. This is
  what lets a run leave the rim and come back.
- **`rimStreak`** — the longest stretch of run allowed to stay on the outer ring. The gate that
  checks the wandering worked, and the only thing about a run's *shape* the generator judges.

What the shipped dials produce, measured over ten boards a tier:

| Tier | rim stretch | turns |
| --- | --- | --- |
| junior | 4.1 | 0.84 |
| expert | 3.6 | 0.81 |
| master | 3.7 | 0.85 |
| wizard | 3.0 | 0.91 |

("turns" is the share of steps that change direction — 1.0 would be a run that never goes twice the
same way.)

**Wandering also makes generation cheaper, which is worth knowing before anyone tunes it back down.**
Pure Warnsdorff walks a full hexagon into dead ends far more often than a wandering walk does, so the
retries it spends dwarf the ones the rim gate costs: five wizard boards build in ~160ms at 97%
first-attempt yield, against ~1.5s and 87% with the dials off.

**Starter is left ungated** deliberately. Its comb is 14 cells, a lap of the rim is most of the board,
and there is nothing to learn to expect yet.

## 4. The technique ladder

Two vocabularies, answering different questions.

**Pruning** is what the board is allowed to notice — which cells a number could still sit in —
and it is the tier dial, because each level is a different thing to see.

| Rung | What it notices |
| --- | --- |
| `adjacency` | A number can only sit where its predecessor and its successor could sit beside it. Iterated to a fixpoint. |
| `gapPath` | A run BETWEEN two written numbers has to thread from one to the other, so cells no route uses are out. |

**Techniques** are the reasons a number gets written down. All four are "only one cell is left",
said in the way that shows why, and they are ordered by how well the reason teaches rather than
by strength.

| Technique | The sentence |
| --- | --- |
| `sandwich` | The 14 and the 16 touch only one open cell between them. |
| `neighbourForced` | The 14 has only one open cell left beside it. |
| `onlyCell` | There is nowhere else left in the comb for the 15. |
| `onlyValue` | No other number can reach this cell. |

Every one of them fires on boards the generator ships, at the rates measured over 300 boards across
the five tiers: `neighbourForced` 2148, `sandwich` 2010, `onlyValue` 722, `onlyCell` 3.

**`onlyCell` being that rare is the ladder working, not a rung to cut.** It is the reason left when no
better one fits, and on a board about adjacency there is almost always a neighbour to point at instead.
Three boards in three hundred had a number pinned with nothing written beside it, and on those the
alternative is a hint that says nothing at all.

### 4.1 There is no distance rung, and there cannot usefully be one

A distance bound is the obvious middle rung — *this cell is 4 steps from the 7, so it cannot hold the
9* — and **iterated adjacency already gives exactly it**. A chain of neighbour-supports from a written
number to a cell IS a walk of the right length, and on a hex lattice a walk of any length at or above
the distance exists, because the lattice's triangles absorb the slack and there is no parity to dodge.
No board needs the distance rung to settle: every tier's `deepest` comes back `adjacency` or `gapPath`.

So it is left out rather than kept as flavour. **A rung a tier can demand but no board can turn on is a
dial that does nothing**, and it makes `requires: "distance"` unsatisfiable — a tier authored against it
can generate no board at all.

The consequence is that the ladder has two rungs, so the first three tiers separate by size and
generosity rather than by reasoning (§5).

### 4.2 What the ladder does NOT include

No technique reasons about the run's parity, its ends, or the shape of the remaining empty
region (a "the comb is now two disconnected pockets" argument). Each is a real deduction and
none is needed: the boards ship solvable without them, and a rung nothing turns on is the dial
that does nothing §4.1 describes.

### 4.3 The gap rung, and its ceiling

`gapPath` enumerates the routes a run could take between two written numbers, and reads back
which cells appear on some route. The enumeration is capped at 40,000 visits, and **a gap that
overruns the cap is left alone rather than half-pruned** — eliminating from a partial enumeration
would be unsound. Two cuts keep it inside the cap on every measured board: only cells still
candidate for the run's numbers are stepped into, and a step whose remaining count cannot cover
the ground left to the far end is refused outright.

`ponytail:` the upgrade path, if a bigger hive ever wants it, is to count routes per (cell,
offset) with dynamic programming instead of enumerating them. No measured board has needed it.

## 5. Tiers

From `src/mods/puzzle/game/hidato/hidatoConfig.ts`. The comb stays inside a radius-3 hexagon at
every tier: seven cells across is what a 360px screen fits at a thumb's width
(`puzzle-screens.md` §1), and a wider hive would be a board that has to be pinched to be played
rather than a harder one.

| Tier | Cells | Radius | Reading | Givens (floor) | Requires | wander | rimStreak |
| --- | --- | --- | --- | --- | --- | --- | --- |
| starter | 14 | 2 | `adjacency` | 7 | — | — | — |
| junior | 19 (full hexagon) | 2 | `adjacency` | 8 | — | 0.30 | 5 |
| expert | 26 | 3 | `adjacency` | 9 | — | 0.35 | 4 |
| master | 37 (full hexagon) | 3 | `gapPath` | 9 | `gapPath` | 0.40 | 3 |
| wizard | 61 (full hexagon) | 4 | `gapPath` | 12 | `gapPath` | 0.45 | 4 |

Measured on the shipped generator, seeds 1–6 per tier: starter through master build five boards in
under 200ms and wizard in about 700ms, and the thinning lands on 7/14 numbers written in at starter,
10–13/37 at master and 18–20/61 at wizard. First-attempt yield — what the seed lists live on (§6.1 of
`puzzle-screens.md`) — is 100% up to expert and 96–98% at master and wizard.

### 5.1 Wizard spends tap-target room on reach

Every tier but the last keeps the comb inside a radius-3 hexagon: **seven cells across**, which on a
360px screen is a hex about 46px wide — over `puzzle-screens.md` §1's 44px floor, with the board sized
at `min(56vh, 26rem)`.

**Wizard goes a ring further out: 61 cells, nine across, and a hex about 39px wide by 45px tall.** That
is under the floor on one axis, and it is the only place in the family that is. It is a deliberate
trade rather than an oversight:

- **The reach is what the top tier is for.** 37 cells was the ceiling only because seven across was,
  and a 61-cell hive is a genuinely bigger thing to hold in the head — 42 forced steps against 27.
- **A pointy-top hex is taller than it is wide**, so the shortfall is on one axis only, and the shape
  is a hex rather than a square: the target is what a finger is aimed at, not a corner of a grid.
- **Dragging is the gesture that carries a run** (§6), and a drag is far less demanding of a target
  than a tap: it asks which cell the finger passed through, not which one it landed on.

Everything else about it came out cheaper, not dearer: generation runs about 120ms a board and 96% of
seeds are clean on the first attempt, because a bigger comb gives the walk more room rather than less.

**What is not measured is the solve time.** 42 forced steps against master's 27 suggests something over
half again as long, and `PUZZLE_FAMILIES.md` §3.2's budget is under six minutes at wizard. The lab
reports the real number on a real board; if it overruns, the dial to turn is `givens`, not the comb.

### 5.2 `requires` is a guarantee, not a hope

Because the solver only ever reaches for the cheapest rung that fires, a board's honest
difficulty is **the weakest rung that settles it**. `gradeHidato` computes exactly that and
compares it twice: past the tier's cap, the board is one the tier may not ask for; short of what
the tier requires, the board never turns the reasoning on. So a master board is one that
provably stalls under `adjacency` alone.

That reading is also why the topped-up numbers are offered one at a time rather than handed over
in a batch: a batch is graded once, and three extra givens at once are enough to turn a master
board back into one the gentlest rung settles.

## 6. Interaction — carry the run, no number pad

**There is no pad, and there cannot be one**: a 37-cell comb would need 37 buttons. So the run is
carried instead.

- **Tap a number** to pick the run up there. Tapping it again puts it down. (A press picks it up; what
  the touch meant is decided when the finger lifts — §6.5.)
- **Tap a touching empty cell** to carry the run on: the next number up goes in, and the run
  moves with it.
- **Tap a number you laid**, then tap it again to take it back off — along with everything that was
  only on the board because of it (§6.2). A given cannot be taken off.
- **Carry the run a different way** out of any number you pick up, and it is re-laid from there: the
  way it went before comes off (§6.2). Without that, a fork means rubbing out every number back to it
  by hand.
- **Where the run cannot go on at all**, dragging off the number it stopped on moves that number
  instead (§6.4).
- **Or drag**, from the number the run is picked up at, straight through the cells it goes. Same run,
  one gesture instead of twenty.
- **Undo** takes back the last move.

### 6.1 What a drag does, and what it refuses

A drag only ever moves **along** the run, and a number it crosses that is none of these three things is
a number the finger went past on its way somewhere, which meant nothing:

| The cell dragged into | What happens |
| --- | --- |
| open | the run carries on into it |
| a number **further along** the run | the run is drawn over its own tail: the next number is laid here and whatever held it loses it (§6.3) |
| a number **behind** it, other than the one it came from | nothing — that is the line the finger just came along |
| a number the puzzle wrote in | nothing, unless it is the next one (above) |
| open, where the run cannot go on at all | the number the run is standing on moves there (§6.4) |
| holds the number **after** the one being carried | the run passes **through** it — which is what lets a drag cross the board's givens instead of stopping dead at the first one |
| holds the number **before** it | that is the way the finger came, so the last number was a wrong turn and comes back off (a given cannot, so there the run picks up instead) |

Passing through is the case that matters most: without it, a drag along the answer stops at the first
written number it meets, which on a board that is a quarter givens is almost immediately.

**A tap is a `pointerdown` on a cell; a drag is resolved from coordinates.** A tap knows its cell from
the shape it landed on, while a finger halfway between two cells has to be told which one it is
nearer — so the board runs its layout backwards and rounds in cube coordinates (§7). The board claims
its own gestures (`touch-none`) or a drag across it would scroll the page; the page is scrolled to the
rules from the chrome around the board, which is what constellation does for the same reason.

### 6.2 Rubbing out takes the rest of the chain with it

A number the player wrote means something only as a chain hanging off one the puzzle wrote in: 6, 7 and
8 with no 5 anywhere are cells committed to for a reason that is no longer on the board. So an erase
keeps **what is still anchored** — every number that can be counted back to a given, one step at a time
— and drops the rest.

That single rule covers the cases that would otherwise each need one:

| Erasing | What goes |
| --- | --- |
| the number at the end of a run | just it — nothing was hanging off it |
| a number six cells back | it and the six after it, because none of them can be counted back any more |
| a number inside a stretch that runs between two written-in numbers | just it: each half is still counted from one of the two ends |
| carrying the run a different way out of the number it is picked up at | the stretch drawn forward from there, up to the next number the puzzle wrote in (§6.3) |

A number the puzzle wrote in is never swept up and never moved: where the run's next number is a given,
there is nothing to re-route and the step is simply refused.

### 6.3 Re-drawing is one rule: lay the next number here

Carrying the run on lays the next number in the cell under the finger — onto open ground, or **straight
over a number further along the run**, which is the run's own tail and how a line gets redrawn. Whatever
held that number loses it, and anything left counting back to nothing goes with it (§6.2).

It refuses only two things, and both are about what the finger did not mean: a number the puzzle wrote
in is never overwritten or moved, and a number *behind* the one being carried is never overwritten
either — that is the line the finger has just come along.

**Deciding what a redraw sweeps away is §6.2's job, not this rule's.** Working the whole doomed stretch
out up front and refusing anything outside it reads the run as a shape rather than as a line being
drawn, and it refuses the ordinary case: such a sweep stops at the first number the puzzle wrote in, so
**one given standing anywhere in the tail puts every cell past it out of reach** — on a board a dozen
cells deep, those are all the cells worth dragging to. Laying one number and letting the anchor check
tidy up says the same thing about the easy case and the right thing about that one.

**Adjacency is part of that tidying up, not just value.** Counting back by value alone, a 4 stays
"anchored" after the 3 it was laid beside has moved to the far side of the comb — the numbers still
read 1, 2, 3, 4 and nothing notices the chain no longer touches. Since moving a number is exactly what
re-drawing does, the check asks for both: the number before or after it, *next door*.

### 6.4 When the run has stopped, the number itself moves

A run reaches the 13, and the 14 is a number the puzzle wrote in, standing somewhere the 13 does not
touch. There is nothing to lay — the 14 exists — and nothing to re-route, because a given is not the
player's to move. The run has simply stopped, and what it is telling the player is that the **13** is in
the wrong place.

So dragging off it moves it: "this one goes here instead". The one condition is that the number before it
still touches where it lands, or the line drawn so far would break behind it.

**Without this reading the gesture would do nothing at all**, on the one board state whose only way
forward is to rub the last few numbers out by hand. Nothing happening is the worst answer a board can
give, because it looks the same as a board that did not notice the finger.

### 6.5 A press is not a tap, and a tap is decided on release

**A press must not be read as a tap the moment the finger lands, or the gesture that starts a drag undoes
the thing the drag is about to move.** A tap on the cell the run is standing on rubs that number out, so
resolving a press eagerly takes the 7 off the board as the finger comes down to drag it, puts the run
down, and leaves every move after it doing nothing — indistinguishable from a board that never noticed
the finger.

So the three touches are separated:

| | when | what it does |
| --- | --- | --- |
| **press** | finger lands | picks the run up at that cell, and nothing else |
| **drag** | finger enters another cell | carries the run (§6.1) |
| **tap** | finger lifts without having left | the cell's own action — step, rub out, put the run down |

Because the press has already picked the run up, "is the run standing here" answers yes by the time the
tap is known to be one — so the board reports whether it was standing there **when the finger landed**.
That is a fact only the board still has, which is why it is passed rather than re-derived.

**A finger only counts as entering a cell once it is well inside it.** A hex's corners reach a whole
cell-radius from its centre, so a finger travelling between two neighbours clips the corners of the
cells beside them, and a clipped cell is a step nobody meant to make — on a drawn run it walks the pen
along the numbers already there, which swallows the gesture whole. Reading a cell only from its middle
costs nothing: the previous one just stays current a moment longer.

## 7. Drawing the hive

Pointy-top axial coordinates: `q` runs east, `r` south-east, and the rows interleave by half a
cell. A cell is drawn at 93% of its full width, which leaves the mortar line between neighbours.
The viewBox is computed from the cells the board actually has, with half a cell of air all round,
so a comb with gaps in it still sits centred and still fills the width it is given.

### 7.1 The run is drawn, in one line

**One unbroken stroke from the 1 to wherever the run has got**, over the ground and under the numbers —
a digit sits *on* the line rather than cutting it, which is what makes it read as a channel dug through
the comb instead of a row of separate joins. It is the same picture in every skin the family might
wear, and the reason the canal reading works at all.

Three rules, and each of them is about it being a *line* rather than a set of pairs:

- **It starts at the 1 and stops at the first break.** Numbers further along that nothing connects to
  yet — the ones the puzzle wrote in across the comb — carry no stroke at all, because a stroke there
  would claim a channel that has not been dug. Joining up every consecutive pair wherever it happens
  to sit would draw a board as further on than it is.
- **The head is where the player reads from.** Obscuring the numbers already passed costs nothing;
  they are behind you. What matters is where the line ends and what it could reach next.
- **It is deaf to the pointer.** The cells under it are the board's hit targets, and a stroke
  swallowing a tap would make the gap between two numbers a dead spot.

**The line reaching the last number IS the completion test**, not a picture of it: `isHidatoSolved`
asks for exactly the run this draws, so a board can never say "solved" with the line stopping short —
and the closing move is the player carrying the run into the last number, rather than a board that
counts itself finished while the line is still one cell away.

The completion light travels the channel itself rather than only the cells it passes, so what flies the
comb is one run.

**The viewBox is squared off around the comb's centre**, even though no comb is square. The board is
sized off the viewport's shorter side (`max-w-[min(56vh,26rem)]`), so a taller-than-wide drawing handed
that width comes out taller than the space there is — which is the one thing a puzzle board may not do
(`puzzle-screens.md` §1). Squaring the box makes the width the whole constraint, exactly as it is for
the grid families, and the comb sits centred in it.

Sized off its container and the viewport, never off a pixel constant — the board fits a 360×640 phone
with the header visible and no pan or zoom.

## 8. Theming

Two skins, and the board component names no colour at all: it emits logical state — a cell is empty,
holds a number the puzzle wrote in, holds one the player wrote, is or is not on the run drawn from the 1,
and has or has not been passed by the completion light — and the skin turns that into pixels.

| | **default — a kept hive** | **channel — a flood plain** | **scribe — a sheet** |
| --- | --- | --- | --- |
| ground | cold stone comb | dry sand | papyrus, the one pale board |
| a number the run has reached | unchanged | **green**: the water got there | unchanged |
| a number the puzzle wrote in | its own ground colour | keeps its bright rim, watered or dry | written in **red** |
| the run | a thread of honey | **blue**: it is water, not a route | **ink** |
| finishing | the light travels the run | a plant on every field it passes | a sign written over every figure |

**Only the plain asks whether the line has arrived**, and that difference is why a skin takes a function
rather than a colour table. On a comb the run is a record of what the player decided; on a plain it is a
thing that *does* something, so a number written in a field the channel has not got to yet is a ditch dug
and dry — the honest picture, since a stretch not joined to the 1 waters nothing.

**The sheet is the one that changes nothing at all.** A plain becomes green because the water did
something to it; papyrus is written on and stays papyrus. So the scribe's board says everything with ink:
the run is a line drawn across it, and the numbers the puzzle wrote in are in **red** — a scribe's
rubric, the fixed parts of a text set down in red against the black of the body, and the only thing here
telling the two apart. It is also the skin where the figures are drawn DARKER than the line they cross,
the reverse of the two boards on stone: there the line is the bright thing against a dark ground, and
here both are ink on the same pale sheet, where a stroke as dark as the digits swallows every number it
runs over.

**The rim is what a given keeps**, and it has to keep something. The green says "the channel got here",
which is as true of a field the player worked out as of one they were handed — so if the ground carried
the whole message, the givens would vanish into the crop the moment the line ran through them, taking the
only fixed points the board has with them. The rim is the part of a cell the water does not touch, so
that is where the marking lives, and the number stays the colour it was written in.

The hint's marks are skinned with the ground and have to be — an amber ring over sand is an affordance
that survives on one skin only, and none of the three survive a pale sheet. The plain hatches in rose,
because sand, green and water have taken most of a palette between them; the sheet hatches in blue,
because on papyrus that is what is left that is not ink and not rubric.

The family carries four tags — `puzzle`, `agriculture`, `water`, `scribe`. A kept hive sits in the same
pools the flood plain does, and counting a run of numbered cells is the scribe's act
(`PUZZLE_FAMILIES.md` §11.1). **A tag is eligibility; the ROLE is the identity**: `water` and
`agriculture` draw the channel, `scribe` draws the sheet, and everything else draws the hive. Three
roles, three places, and each brings its own reading of what the board IS — a hive is kept, a plain is
watered, a sheet is written on. An unknown role or theme falls back to the hive silently.

The hint's hatching is the only hatched thing on the board, and no board may hatch anything else
— the moment a second use appears the word stops naming one thing (`puzzle-screens.md` §4.2).

## 9. The completion run

The light travels the run in the order the numbers say: 1 lights, then 2, then 3, to the last cell — the
order the player just proved, read back along the line they drew. Input is refused while it runs, the whole
run fits inside the shell's one-second ceiling, and `prefers-reduced-motion` skips it entirely
(`puzzle-screens.md` §3).

**And on two of the three boards it leaves something behind.** A skin says what the mark is, how it
arrives and what colour it is in; the board only places it, one per cell the light has reached, in the
run's own order:

- **the flood plain** grows a plant on every field the water reaches, rooted on its own ground and
  scaling off the bottom edge rather than swelling from its middle — a sprout that scales about its
  centre reads as a decal being stamped on rather than as something growing (`--animate-sprout`);
- **the sheet** has a sign written over every figure, appearing rather than growing (`--animate-flower-in`,
  which is the motion of ink arriving), and the same number always draws the same sign, so a finished
  sheet reads as something written rather than sprinkled. The signs come from the collection's own
  alphabet: they are what this game writes in, and a parallel set would be two things to keep looking
  like one.

The hive has nothing to leave and finishes with the light alone, which is the shape this seam is for: the
clock is core's and shared, what it looks like is the skin's.

Reading the light off `progress` rather than `done` is what keeps reduced motion honest: a
skipped run reports done with progress still at 0, so nothing lights and the board is simply the
answer the player filled in.

## 10. Open questions

1. **A shaped hive.** The catalogue entry noted that a shaped board can spell a glyph, since the
   comb is whatever the walk visited. Nothing asks for it yet, and it would mean carving the
   region first and then finding a path in it, which is the expensive half §3 avoids.
2. **Two runs.** The published variant with two separate numbered runs on one board would be a
   second family off this generator, the way twin stars is off star battle's. Not designed.
