# Constellation

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.21; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to the
constellation: what the player is deducing, its technique ladder, and how generation
proves a board needs the reasoning its tier claims.

> **Nothing here has been played yet.** Every duration and every count below is a
> target, not a measurement. The lab (`src/app/dev/PuzzleLab.tsx`) plays the real screen
> and its banner reports the solve time, so timing a tier needs nothing of its own — and
> until a tier has been through it, its row in §5 is a guess.

## 1. Rules

Stars hang in a night sky, each carrying a number, and lines of light join them:

- **A star's number is how many lines meet it.** Exactly that many, never more.
- **Lines run straight**, along a row or a column, from one star to another.
- **A pair of stars takes at most two lines.**
- **Lines never cross**, and a line never passes through a star — a star stops it.
- **Every star ends up in one constellation**: from any star, every other is reachable
  by following lines.

This is Hashiwokakero's rule set — the puzzle sold as Bridges, with islands and
bridges swapped for stars and light.

Nothing else. The board carries no language: the clues are digits, the answer is
drawn by dragging, and the rule that is hardest to state is the one that needs no
stating — a sky that falls into two constellations is visibly two constellations.

## 2. Why this family

**It is the first family whose answer is not cell contents.** Sumplete keeps or
strikes a number, futoshiki writes one of six, eclipse marks one of two, balance scale
solves for a value, lightbeam routes one path. All of them fill in a board. Here the
board is a graph and the answer is its edges, and the last rule is a property of the
whole graph rather than of any square — a genuinely different thing to hold in your
head, which is what a third family in the `sky` pool is for.

**It is the star-map family the catalogue has promised twice** (§4.16's theme note,
and the comment on `journey("junior_4")`). The Lighthouse of Alexandria draws every
main-path room from the `sky` tag; with two families in that pool, five pyramids of
lighthouse are a coin flip per room. This is the third.

**Difficulty is the numbers, not the size.** A sky full of 3s and 4s opens itself —
a high number has few ways to be satisfied, so it forces its own lines. A sky of 1s and
2s forces nothing and has to be reasoned into. So the dial that matters is the **mix of
low and high numbers** (§5), the same shape as eclipse scaling on signs rather than
width, and for the same reason: §3.2's budget will not pay for a bigger board.

**One honest risk, worth naming before it is built.** §6 of the catalogue draws the
line that decides duration: bookkeeping that stays local is cheap, bookkeeping that
couples runs the clock out. A star's number is as local as it gets, but the
connectivity rule couples the entire board — "would this line seal that group off"
is a question about everywhere. That is why the top tier grows its star count only
slightly and buys its difficulty from the isolation rung's quota instead, and why the
first thing to measure is a wizard board's clock.

## 3. The deduction ladder

Ordered by how well each reason **explains itself**, not by how much it decides —
the same rule eclipse and futoshiki order by, and for the same reason: a hint that
always says "consider the whole sky" teaches nothing.

Throughout, a star's **ways out** are the directions holding a star that a line could
still reach — no crossing, and neither end already full.

| #      | Technique       | Fires when                                                              | The sentence                                        |
| ------ | --------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| **T0** | `capacity`      | A star's number equals the most its ways out could carry                | "4, and two ways out — both are double"             |
| **T1** | `settled`       | A star already has its lines                                            | "This 3 has its 3 — nothing else joins it"          |
| **T2** | `soleWayOut`    | One way out is left and the star still owes lines                       | "Only one way left, so both go there"               |
| **T3** | `crossed`       | A line would have to cross one already drawn                            | "A line there crosses this one"                     |
| **T4** | `atLeastOne`    | All ways out but one cannot carry the rest between them                 | "3 lines, 3 ways out — at least one down each"      |
| **T5** | `twinBlock`     | Joining two stars would finish both, alone, with sky left over          | "Those two would be a constellation of two"         |
| **T6** | `isolation`     | A line would close a finished group that is not the whole sky           | "That line seals these {{count}} off from the rest" |

**Every rung is one step, and its sentence is one line.** That is stricter than
"solvable by deduction", and it is the constraint the ladder is built to: a reason the
player has to hold three clauses of is not a reason they can check where they are
already looking.

- **No board-wide guessing.** Draw a line, follow it across the sky, watch a star
  overfill twelve moves later, rub it out — that is trial and error with bookkeeping,
  and no rung is allowed to be it.
- **No enumeration reported as a reason.** "Every legal way of joining this corner
  agrees about this line" is what a solver does, not something a player can check.
- **The one global rung is global about a finished thing** (T6). It reads a group that
  is already complete — every star in it settled — and asks whether the line under
  consideration would close it. That is a countable question with a visible answer, which
  is what makes it fair; "this might strand something eventually" would not be.

### 3.1 T3 is a rule about the drawing, not about the numbers

Every other rung counts. `crossed` looks: a candidate line's path is occupied, so the
direction is gone, and the numbers have nothing to do with it. It sits third rather than
last because it is the rung a player spots without arithmetic, and because it is what
makes a long line matter — a line drawn across the middle of the sky quietly deletes ways
out for every star it passes.

### 3.2 T4 is the rung the family is really about

`atLeastOne` is the pigeonhole: a star owing 3 lines with 3 ways out must send at least
one down each, because two ways out carry at most 4 but the third would then carry
none — and the same reading covers a 5 with three ways out, a 7 with four. It decides a
single line rather than a star, so it is the rung that opens a board that no counting
rung can start, and it is where the family stops being bookkeeping.

### 3.3 T5 is the one-clause reading of T6

Two 1-stars facing each other, with any other star in the sky, cannot be joined: the
line finishes both and they are a constellation of two. Same for a pair of 2s and a
double line. It is a special case of `isolation` in every way except the one that
matters — it is a sentence about two stars the player is looking at, where the general
rung is a sentence about a group they have to trace. A rung that says the same thing in
one clause beats a general one that needs a paragraph, so the special case gets its own
place on the ladder and fires before its parent.

## 4. Generation

**Draw then test, not draw then thin** — and the difference from eclipse and futoshiki
is worth being explicit about, because those are the two docs a reader arrives from.
Those families thin: they build a full answer, write down every clue it implies, then
remove clues while the board stays solvable, and the thinning is what makes the
remaining clues load-bearing. Here there is nothing to thin. **Every star shows its
number, always** — a hidden number is not a harder board, it is a board whose missing
clue the player cannot reason about, and the numbers are exactly determined by the
lines drawn. So the only lever is which sky gets drawn:

1. **Draw a sky.** Start from one star; repeatedly pick a placed star and grow a line
   from it, along a row or column, to a fresh cell — no crossing, no passing through a
   star, and never adjacent to a placed star (two stars side by side make a line with no
   room to be seen). Then add extra lines between stars already placed, and promote some
   lines to doubles. Connectivity is free: the sky is grown from one star, so it is one
   constellation by construction.
2. **Read the clues off it.** Each star's number is how many lines meet it. Nothing is
   derived, nothing is hidden.
3. **Solve it with the capped technique solver**, and discard the sky unless the solve
   completes unaided.
4. **Discard it again** unless the solve actually spent the rung its tier introduces,
   its quota of times.

Uniqueness is settled by that gate rather than by a solution counter: every step of the
solve was forced, so a board that ships has exactly one answer.

**The bill is rejection, and the drawer is where it gets paid down.** With no thinning
pass there is no way to loosen a sky that does not solve — it is redrawn. So the drawer
is biased toward the shape the tier wants rather than uniform: a starter sky is grown to
favour high-degree stars (which force themselves, and teach the counting rungs by making
them the only rungs available), a wizard sky to favour 1s and 2s and long crossing lines.
A biased drawer plus a required rung is cheaper than a fair drawer plus a strict filter,
and this family has no third option.

## 5. Difficulty knobs

- **Number mix** — the share of stars carrying 1 or 2 against those carrying 3 or 4.
  The real dial. High numbers force their own lines; low numbers force nothing.
- **Crossing pressure** — how many candidate lines conflict with each other. What
  feeds T3, and what makes the sky one board rather than several corners.
- **Double share** — how many pairs carry two lines. Doubles make counting less local:
  a way out is worth one or two, so a number stops naming the number of neighbours.
- **Technique cap** — how far up the ladder a board's solve may reach.
- **Required rung and quota** — which technique the solve must spend and how often, so
  a tier cannot ship a board the tier below would have settled. **One firing is not a
  tier**: thirty forced counting steps with a single hard reading in the middle is the
  tier below plus a moment of thought.
- **Star count** — capacity rather than reasoning, so it is the knob of last resort,
  and it is capped hard by the phone: see §8.

| Tier    | Grid | Stars | Cap          | Requires                     |
| ------- | ---- | ----- | ------------ | ---------------------------- |
| starter | 5×5  | 5–6   | `soleWayOut` | —                            |
| junior  | 6×6  | 8–10  | `crossed`    | `crossed` ×1                 |
| expert  | 7×7  | 12–14 | `atLeastOne` | `atLeastOne` ×2              |
| master  | 8×8  | 15–18 | `twinBlock`  | `twinBlock` ×2               |
| wizard  | 8×8  | 18–22 | `isolation`  | `isolation` ×2, lean mix     |

**The top two tiers share a grid on purpose.** Wizard is not a bigger sky; it is the
same sky with the number mix leaned out and the global rung required — which is the
"scales without growing" claim this family makes in §2, and the one to check first
against a real clock.

**And growing the sky was measured, because it was the obvious thing to try.** Asked for
its sealing rung twice, a wizard sky at 20 stars and a lean mix delivers on all ten of ten
seeds; leaving the mix alone and growing to 22 stars instead delivers on **one** in ten.
A denser sky hands the counting rungs more to do, and they finish the board before
anything has to be sealed off — so the extra stars bought bookkeeping and gave difficulty
back. It is the catalogue's "size is the wrong axis" rule turning up as a number rather
than as a principle.

Boards draw in **under 0.6s at wizard** and run 28–42 forced steps, against master's 20–29
— which is what a rejection-only generator costs here, and it is affordable. What is not
yet known is how long those steps take a person (§10).

The starter tier caps below the pigeonhole deliberately: a five-star sky where every
star's number is the most its ways out can carry teaches itself by being tapped, which
is P5's wordless first encounter.

## 6. Controls

**Drag from a star toward its neighbour.** Press a star, drag along a row or column,
release: a line appears. Drag the same pair again and it doubles; again and it clears.
One gesture per line, and it is the gesture the mechanic suggests — the player draws the
constellation rather than filling in a form about it.

**The gesture is a direction, not a destination.** What the drag decides is which of
four ways out was meant; the line then runs to whichever star sits that way, however far
past the finger it is. So the target is never small: press anywhere on a star, flick the
way you mean, release anywhere along that line. A drag that ends on the pressed star, or
in no clear direction, does nothing — dragging is the only input, so a stationary press
has to be a cancel.

**The candidate draws under the finger, as what the pair is about to become.** Mid-drag the
pair is shown at the count a release would leave it, so a wrong axis is visible before
release rather than after: an empty pair previews its first stroke faintly, a pair holding
one previews the second one beside it, and a pair holding two fades both, because the next
release takes them away. A drag toward a direction with no reachable star draws nothing,
which is how the board says "not that way" without a word.

**Found by playing it: previewing the pair's CURRENT state is the same as no preview at all.**
Drawn that way, the drag that doubles a line and the drag that clears one both showed
nothing new — the "preview" was the line already sitting there, and the second stroke read
as hidden underneath it. What the player needs shown is the result of the gesture, which is
the only thing they cannot already see.

**One button: undo.** Same place and same shape as futoshiki's and eclipse's — a family
that moves its undo teaches its controls twice. The drag cycle already gives a pair back,
so undo is for stepping back off a run of lines drawn on a wrong reading. Reset stays for
starting over.

**Found while building it: the gesture cannot live in component state.** A release has to act on the
direction the finger was last pointing, and a release that reads that from state acts on whatever the last
render happened to hold — so the line depends on whether React re-rendered between two pointer events, which
in a browser it does and under one batched sequence of events it does not. The drag lives in a ref and the
state only mirrors it for drawing the candidate.

**The hazard is the page, and it is the reason to build the gesture carefully.** The
screen bar (`puzzle-screens.md` §1) has the rules below the board and the modal scrolling
to reach them, so a vertical drag is ambiguous between "draw a line down" and "scroll".
The board claims its own gestures (`touch-action: none` on the board, not on the modal),
and the page is scrolled from the chrome and the rules block around it. A board that
scrolls the page while drawing a line is the failure mode to watch for on a real device,
and it is a device question rather than a browser-devtools one.

## 7. Hints

One per rung, keyed by technique and reading, rendered from a template
(`puzzle-screens.md` §4). The hint **names the move, never the answer**, and it points
at the star and the direction it reasons from — so "only one way left" has something to
point to.

**Every hint is a move the player can make now**, or a way out the player can stop
considering. There is no rung that says "try it and see", so there is no hint that asks
them to.

**Two orders, because two jobs.** The ladder (§3) is ordered by strength: a tier's cap
is a prefix of it, and that decides what a board may be built to need. A hint is ordered
by **what a player spots first** — a star that is already full, then a star with one way
out, then a crossing, then the counting arguments, and the sealing arguments last.
Several reasons usually apply at once, and the one worth saying is the quickest to see
rather than the weakest.

**A closing hint shows what it would close.** T6's sentence counts the stars it would
seal off (`{{count}}`) and the hint lights that group, because a group traced for the
player is checkable where "that would strand something" is not.

An overfilled star is reported before anything else: every technique reasons from what
the player has drawn, so once a star has more lines than its number the advice after it
leads somewhere dead.

**A hint is only derived once asked for.** T6 walks groups across the whole board, so
deriving one on every drag would put that cost on every gesture, for a string nobody
asked to read.

## 8. Board requirements

Beyond the shared screen bar:

- **The star is the only touch target, which is what buys the grid its size.** Empty
  cells take no input, so a star's hit area spills into the cells around it and can hold
  44px while the grid pitch is smaller. That is the whole reason an 8×8 sky fits a 360px
  phone; it is also why the drawer refuses two adjacent stars, since two hit areas that
  overlap are two stars that cannot be pressed apart. Measured on a 390px viewport: a 7×7
  sky puts a 50px disc inside a 65px hit area on a 50px pitch, and no two hit areas touch,
  because the nearest another star can sit is two cells away.
- **A number stays readable with lines touching it.** The digit sits inside the star,
  and the lines stop at its edge rather than under it.
- **A star that has its lines lights up**, and goes red once it holds too many. That is the
  whole of this family's feedback and none of it is a word.

  **It lights up rather than greying out, which is the opposite of what Bridges does**, and the
  inversion is deliberate: giving a star its light is what the player just achieved, so it is what
  should look like an achievement. The board scans the same either way — the work left is "the stars
  still showing a plain number" instead of "the stars still lit" — and the finished sky is a
  constellation that blazes, which is a reward the mechanic hands over for free.
- **One line and two differ in shape, not only in weight** — two parallel strokes with
  sky visible between them, so a phone in daylight reads the difference.
- **An illegal line is refused, not drawn red.** A crossing and an over-long reach are
  states the player never chose — the drag just does not take, and the candidate line
  under the finger is what told them so before release. What _is_ shown is the mistake
  they did choose: an overfilled star, and a sky split into two constellations (visible
  by construction, which is why the rule needs no marker).
- **Solved is every number met and one constellation**, and the board freezes on it.

## 9. Theming

The family emits logical state only — `star(count, met|over) | line(single|double,
axis) | candidate` — and the skin decides what any of it looks like. A sun site could swap
stars for lamps and lines for sunbeams and change nothing else.

**The default skin is the night sky, and it is the default rather than a `sky`-only dress.**
Asking "was this room placed from the `sky` pool?" collapses: the pool is a gen-time role, resolved
to a family id and baked away, so what reaches the room is the family's own tags — and this family
always carries `sky`. A check that is always true is not a switch. What the skin does carry:

- **A gradient night sky** rather than a flat panel, and a scatter of far-off stars behind the board.
  They are a tenth the size of a puzzle star and carry no number, which is the whole of telling them
  apart, and they are **seeded off the board** rather than drawn at random — a backdrop that reshuffles
  on every render is a backdrop the player keeps looking at.
- **Lines of light rather than drawn strokes**: each carries a glow, and stops at the edge of the star
  it meets rather than running under its number (§8).
- **A star burns once it has its lines** — a bright disc with a soft outer glow, where an unlit one is
  quiet blue-grey and readable and nothing more. The disc exists to keep the number legible with lines of
  light running into it; the glow is the star itself.

### 9.1 The three skins, and why this mechanic has more than one place

**The rules never move; only the words for them do.** That is the whole reason this family carries
skins rather than one look: a degree count, a no-crossing rule and a single connected group describe
more than one kind of network, and each of those networks is a real place in this world.

| Skin         | The place                                                | A node is                                             | A line is                            |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `default`    | the night sky                                            | a star; its number is how much light meets it         | a line of light                      |
| `irrigation` | the Nile delta (§11.1 Water & Nile)                      | a basin; its number is how many channels it feeds     | a channel, doubled into a wide canal |
| `causeway`   | a pyramid under construction (§11.1 Logistics / Caravan) | a site; its number is how many roads meet it          | a haul road                          |

Two things every skin is held to, and neither is a style note:

- **The three node states differ in fill and outline, not only in hue** — short of its count, holding
  it, holding too many. A dry stone basin against a full one; a bare junction against paved stone.
- **A node that has its count is the one that lights up** (§8), in every skin. The reward reading does
  not change because the dress did.

**A hint keeps its own colours in every skin**, deliberately: the point of a highlight is that it is
_not_ the board's palette, so a hint pointing at a channel looks like a hint rather than like a
slightly different channel.

**Only the skin is authored, never the family.** `theme` decides what a family looks like and never
which family renders a room, so the Nile Delta Expedition and the Great Pyramid of Giza name a skin and
leave their puzzle pool alone — every other family in those pyramids draws its own default, which is
exactly what a name a family does not know is for. Authoring the _family_ as well waits until the
catalogue is broad enough that a themed pool still has variety inside it.

## 10. Open questions

1. **Does the player need a "no line here" mark?** Bridges apps ship one, and the
   solver reasons with closed ways out internally. The drag cycle has no room for a
   fourth state and no board needs the mark to be solvable, so v1 does without it —
   whether a real player misses it is a playtest question, not a design one.
2. **Is 8×8 at ~20 stars the ceiling?** The hit-area argument (§8) says the grid can be
   denser than 44px, but that is an argument, not a measured board on a real phone.
3. **Does the top tier land in budget?** The isolation rung is the one piece of
   coupled bookkeeping in the family (§2), so wizard is the tier most likely to run
   long. It is the first thing to time, and the fallback if it does is a leaner mix at a
   smaller star count rather than a lower cap.
