# Canal

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.22; the screen bar every family must clear lives in
`docs/instructions/puzzle-screens.md`. This doc holds what is specific to the canal: what the player is
deducing, its technique ladder, and how generation proves a board needs the reasoning its tier claims.

> **Designed, not built, and nothing here has been played.** Every number below is a target. The lab
> (`src/app/dev/PuzzleLab.tsx`) plays the real screen and its banner reports the solve time, so timing a
> tier costs nothing once it exists.

## 1. Rules

Water enters the grid at one edge and leaves at another. Between them the player digs **one channel**:

- **The channel is a single path** from the inlet to the outlet — no branches, no crossings, no loops. Every
  cell it uses connects to exactly two neighbours, and the two ends connect to one each.
- **Every number is a count of dug cells.** The number beside a row says how many of that row's cells the
  channel runs through; the same for each column.
- **Some stretches are already dug.** A board opens with a few segments in place; the channel has to run
  through them.

Nothing else. The board carries no language: the clues are digits, the inlet and outlet are marks on the
edge, and the answer is drawn with a finger.

This is **Path Puzzles** (Roderick Kimball's genre), which is where the counted-path idea comes from.

## 2. Why this family

**It is the water family the catalogue has been short of.** §11.1's Water & Agriculture theme holds one
unbuilt arithmetic family (the water clock) plus constellation wearing its irrigation skin, so
`encounter: "water"` cannot be authored without serving the same board in every room. This is the second
family that role needs — and it earns the theme honestly rather than by dressing: digging a canal from the
river to a field is what the mechanic *is*, not a coat of paint on it.

**It is counting, and the answer happens to be a path.** That is the distinction that makes it a family
rather than a reskin, and it is worth being exact about, because two families here are close enough to check
against:

- **Not lightbeam.** There, the player sets pieces and the *beam* decides where it goes; the deduction is
  about what the physics does with an arrangement. Here the player draws the route themselves, and the
  deduction is arithmetic on lines — this row has four cells of channel, two are already dug, so two remain
  among these squares. Closer to a nonogram than to a beam.
- **Not constellation.** That one counts a *node's* lines and joins given points; this one counts a *line's*
  cells and has no nodes at all. Same family of ideas (a network, a connectivity rule), different object,
  different gesture, different arithmetic.

**The rejected version is worth recording**, because it is the first thing anyone will suggest: a pipe grid
where you **rotate** tiles until the water flows. That is lightbeam's gesture on lightbeam's board — a grid
of pieces you cycle until a thing reaches the far end — and to a player mid-room the two are the same room in
different colours. The counted-path version shares no gesture with it and no deduction with it.

## 3. The deduction ladder

Ordered by how well each reason **explains itself**, the same rule the other families' ladders follow: a hint
that says "consider the whole grid" teaches nothing.

| #      | Technique      | Fires when                                                                 | The sentence                                              |
| ------ | -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| **T0** | `lineFull`     | A line's remaining count equals its remaining undug cells                  | "This row needs 3 more, and 3 squares are left"           |
| **T1** | `lineDone`     | A line already holds its count                                             | "This row has its 4 — the rest is dry"                    |
| **T2** | `continue`     | A dug end has exactly one square it can continue into                      | "The channel can only go this way"                        |
| **T3** | `deadEnd`      | An undug square has fewer than two ways to be entered and left             | "Nothing could get out of there"                          |
| **T4** | `noLoop`       | A continuation would close a ring, or make a third connection to one cell  | "That would close a loop / three ways into one square"    |
| **T5** | `lineParity`   | A line's count and its crossings cannot both be satisfied                  | "A channel entering here twice would owe 5, not 4"        |
| **T6** | `mustReach`    | Every route from a dug end to the outlet passes through one square         | "Whatever it does, it comes through here"                 |
| **T7** | `overspend`    | Taking a square forces a line past its count                              | "Dig there and this column owes 5 with 4 to give"         |

**Every rung is one step and its sentence is one line** — the constraint the other ladders are built to, and
the reason `mustReach` (T6) sits where it does rather than higher: it reads a fan of routes, which is the most
a player should have to hold, and anything past it is search dressed as reasoning.

**No board-wide guessing, and no enumeration reported as a reason.** "Every legal channel agrees about this
square" is what a solver does. If a tier needs that to finish, the tier is wrong.

## 4. Generation

**Draw, derive, then thin** — the eclipse shape rather than the constellation one, because this family has a
clue it *can* take away:

1. **Draw a channel.** A self-avoiding walk from a randomly chosen inlet to an outlet, biased for turns (a
   straight run across the grid is a board with nothing in it).
2. **Read the counts off it.** Every row and column number is how many cells the walk used. Nothing is
   hidden, and nothing is derived twice.
3. **Dig some of it in.** Start with the whole path pre-dug, then remove segments one at a time, keeping each
   removal only while the technique solver still finishes unaided.
4. **Keep the board only if its solve spent the rung its tier introduces**, its quota of times.

Uniqueness comes from the same gate the other families use: every step of the accepted solve was forced, so
the board that ships has exactly one channel and no solution counter runs.

**The counts cannot be thinned, and that shapes the difficulty knobs.** A missing row number is not a harder
board, it is a board with a hole in the arithmetic — so the dials are the walk's shape (§5), not how many
clues survive.

## 5. Difficulty knobs

- **Grid size** — real here, unlike in eclipse: the arithmetic is per line, so a wider grid is more lines
  rather than more bookkeeping per line. Still capped by the phone (§8).
- **Turn density** — how much the walk doubles back. A snake fills lines to their limit and makes `lineFull`
  and `overspend` bite; a lazy walk leaves slack.
- **Pre-dug share** — how much of the channel the thinning pass manages to remove. Fewer given stretches is a
  colder start.
- **Inlet/outlet placement** — same edge, adjacent edges or opposite edges. Opposite edges force a crossing
  of the whole grid; the same edge allows a loop-shaped answer, which is where `noLoop` earns its place.
- **Technique cap, required rung and its quota** — the same three the other families carry. One firing is not
  a tier.

| Tier    | Grid | Cap          | Requires          |
| ------- | ---- | ------------ | ----------------- |
| starter | 5×5  | `continue`   | —                 |
| junior  | 6×6  | `noLoop`     | `noLoop` ×1       |
| expert  | 7×7  | `lineParity` | `lineParity` ×2   |
| master  | 8×8  | `mustReach`  | `mustReach` ×2    |
| wizard  | 8×8  | `overspend`  | `overspend` ×3    |

The top two tiers share a grid, for the reason §3.2's budget always gives: the wizard board is a leaner clue
set and a harder rung, not more squares to count.

## 6. Controls

**Drag along the cells to dig.** A finger down on the inlet or on any dug end and a drag through neighbouring
squares extends the channel; dragging back over the last stretch takes it out again. One gesture, and it is
the gesture the mechanic suggests — the player digs the channel rather than filling in a form about it.

The drag machinery this needs is the machinery constellation already built (`ConstellationBoard`'s pointer
handling, and the lesson that came with it: the gesture lives in a **ref**, because a release has to act on
where the finger last was rather than on whether React re-rendered between two pointer events).

**One button: undo**, in the same place and the same shape as futoshiki's, eclipse's and constellation's. A
drag-back undoes a stretch, so undo is for stepping off a run dug on a wrong reading.

**Tap-to-toggle is the alternative and is deliberately not chosen** (§10 keeps it open): it makes a
mis-tap cheap, but it also lets the player build a channel in disconnected pieces, and a board where the
answer is assembled out of order loses the one thing a drawn path has — you can see it grow.

## 7. Hints

One per rung, keyed by technique, rendered from a template (`puzzle-screens.md` §4). A hint **names the move
and never the answer**, points at the line it counted, and says the number it counted (`{{count}}`), because
"this row needs 3 more and has 3 squares left" is checkable where "that square must be dug" is not.

**The hint order is what a player spots first**, not the ladder's strength order: a line that is finished,
then a line whose remaining squares are forced, then a dug end with one way out, then the counting arguments.

**A wrong stretch is reported before anything else.** Every technique reasons from what is dug, so once a
square is dug that the answer leaves dry, the advice after it leads somewhere dead.

## 8. Board requirements

Beyond the shared screen bar:

- **A dug cell reads as a channel, not as a filled square** — the stretch is drawn as a rounded run through
  the cell, entering and leaving by the faces it uses, so a corner reads as a corner. (The screenshot this
  design came from does exactly that, and it is why the board is legible at a glance.)
- **The counts sit outside the grid**, one per row and column, and dim as they are satisfied — the same
  wordless "this one is done" the other families use.
- **The inlet and outlet are marks on the edge**, not cells, so no square has to mean two things.
- **A count that is exceeded goes red**, which is the only error state this family needs: a loop and a
  three-way junction are refused at input, since neither is a state the player chose.
- **Tap targets ≥ 44px**, which with a per-cell drag surface means the grid is capped near 8×8 on a 360px
  phone. Unlike constellation, every cell takes input here, so there is no hit-area trick to buy width with.

## 9. Theming

The family emits logical state only — `cell(dug|dry|given) | count(value, met|over) | inlet | outlet` — and a
skin decides the pixels. **It has more than one identity, and the role decides which** (`puzzle-screens.md`
§2), the same way constellation's does:

| Role                   | What the channel is | Inlet → outlet     |
| ---------------------- | ------------------- | ------------------ |
| `water`, `agriculture` | an irrigation canal | the river → a field |
| `trade`                | a haul road         | the quarry → a site |
| `tomb`                 | a corridor          | the entrance → a chamber |

**Which is the point of building it for the water role**: with this family carrying `water`, the pool has two
members and the Nile Delta Expedition can finally ask for water puzzles — `expert.ts` names that one-line
change today and says it is waiting for exactly this.

**The completion run** (`puzzle-screens.md` §3) is the obvious one and it is already built: water runs the
finished channel from the inlet to the outlet, which is lightbeam's surge with a different fluid —
`useCelebration` reports the progress, the board draws it, and the outlet takes the water at the end.

## 10. Open questions

1. **Drag or tap?** §6 argues for drag. Tap-to-toggle is cheaper to build and kinder to fat fingers, and it
   is what a paper solver does. A playtest question, not a design one.
2. **Does an 8×8 fit with every cell tappable?** Constellation buys its width by only making stars
   touchable; this family has no such trick, so the top tier may have to be 7×7. Measure before believing.
3. **Should a line's count show how much is left rather than its total?** A total is what the genre uses and
   what the screenshot shows; a remainder is easier and might be too easy. Worth one board of each.
4. **Is `mustReach` (T6) inside the one-sentence rule?** It reads a fan of routes to find their shared
   square. It is the rung most likely to come out as "I searched", and the first candidate for removal if a
   measured board's hints read badly — the same way eclipse's contradiction rung was built, measured and cut.
