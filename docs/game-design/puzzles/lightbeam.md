# Mirror / Lightbeam

Family doc. The catalogue entry lives in `docs/game-design/PUZZLE_FAMILIES.md`
§4.15; the screen bar every family must clear lives in
`docs/instructions/puzzle-screens.md`. This doc holds what is specific to
lightbeam: its pieces, how the beam is traced, its deduction ladder, its
generation gates, and how difficulty is dialled.

Family id: `lightbeam`.

## 1. Rules

Light enters the grid from a fixed sun-disc on one edge, travelling in a fixed
direction. It runs straight until something stops or turns it. Get it to the
shrine.

- A **mirror** turns the beam 90°, off either face. `/` and `\` are its two
  orientations.
- A **wall** absorbs the beam. Light stops dead.
- Some pieces the player can change; some are part of the puzzle and cannot.

That is the whole rule, and the board states it without a word: the beam is drawn
wherever it currently goes, so every change shows its own consequence.

## 2. The pieces

All of them ship in the first version. Playtesting a beam puzzle with only half
its vocabulary would tell us about a different puzzle.

| Piece              | Fixed or movable | States | What it does                                                |
| ------------------ | ---------------- | ------ | ----------------------------------------------------------- |
| **Sun-disc**       | fixed            | —      | Emits the beam, one cell on an edge, one facing             |
| **Shrine**         | fixed            | —      | The target. Lights when the beam arrives                    |
| **Set mirror**     | fixed            | —      | A given, like a Sudoku clue                                 |
| **Wall**           | fixed            | —      | Absorbs the beam                                            |
| **Turn mirror**    | movable          | 2      | Tap cycles `/` ↔ `\`, position fixed                        |
| **Sliding mirror** | movable          | 2–3    | Fixed angle, tap cycles between authored stops              |
| **Sliding wall**   | movable          | 2–3    | Tap cycles between stops — moved out of the way, or into it |
| **Socket**         | fixed            | —      | Transparent. Light crossing it fires the wires leading out  |
| **Door**           | driven           | 2      | Stone on the route. No tap moves it; a socket does (§11.1)  |

The sliding wall is the one piece whose move is **clearing a path** rather than
bending one. That is worth having precisely because it is a different verb: every
other piece answers "which way does the light turn", and this one answers "does
the light get through at all".

## 3. Board model and beam tracing

State is a flat array: one integer per movable piece, its chosen state. Nothing
else. That makes reset trivial, comparison cheap, and the whole configuration
space enumerable (§5).

Tracing walks from the sun-disc, cell by cell:

- off the grid → the beam **escapes**
- a wall, or the sun-disc itself → the beam is **absorbed**
- a mirror → the beam **turns**; `/` maps right↔up and left↔down, `\` maps
  right↔down and left↔up
- the shrine → **lit**, and the puzzle is solved
- a `(cell, direction)` pair seen before → the beam **loops** forever

**Loops turn out to be unreachable, and that was worth finding out.** A 90° mirror maps
`(cell, direction)` one-to-one, so every beam state has exactly one predecessor, and the
disc's first state has none. The beam from the disc therefore walks a path and can never
join a ring: a ring of four mirrors does carry light round forever, but only if the light
starts inside it. So the board never has to draw a looping beam, and the player never has
to be told what one means.

Loop detection stays in the trace anyway, as the thing that keeps the walk total — and it
becomes load-bearing the moment a piece stops mapping directions **one-to-one**, which is
exactly what the deferred prism (§11) does: it turns one incoming direction into two
outgoing ones, so a beam state can have two predecessors and the argument above collapses.
`beam.spec.ts` proves both halves: the ring loops when the light starts inside it, and the
disc's beam never loops.

_This used to say "anything other than a quarter turn", which is the wrong condition and was
measured wrong (§11.3)._ A mirror set square to the beam reverses it — a half turn, not a
quarter — and reversal is still a bijection on directions, so it is still loop-free. The
angle is not what matters; injectivity is.

## 4. The deduction ladder

This is the part that decides whether the family belongs in this game at all. A
beam puzzle's natural solving mode is trial: flip a mirror, look, flip another.
That is not deduction, and `puzzle-screens.md` §5 requires a generated board to be
reachable by deduction alone, with hints drawn from the techniques rather than
from the answer.

There is a real ladder here, and generation is gated on it:

| #      | Technique         | Fires when                                                                                    | Decides                     |
| ------ | ----------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| **T0** | Forced entry run  | The run from the sun-disc crosses only cells nothing movable can change                       | Those cells carry the beam  |
| **T1** | Forced exit run   | Same, traced backwards from the shrine                                                        | Those cells carry the beam  |
| **T2** | Wiring fires      | The forced runs cross every socket a wiring names                                             | That door is open           |
| **T3** | Dead end          | One state of a piece sends the beam to a wall or edge with no unsettled piece left on the way | That state is impossible    |
| **T4** | Only one feeds it | Exactly one piece-state can send the beam along the forced exit run                           | That state is forced        |
| **T5** | Wiring dead       | No answer at all takes the light across a wiring's sockets                                    | Its stone stays resting     |
| **T6** | Never reached     | No configuration puts the beam on this piece at all                                           | Its state is free — a decoy |
| **T7** | Only one survives | Every arrangement of the remaining pieces fails, save with this one in this state             | That state is forced        |

T0/T1/T2 are facts; T3–T7 are eliminations; propagation between them is the fixpoint
loop, as in the other families.

**T2 is the only ordering fact in the catalogue.** Every other rung in every family concludes either
"these cells carry the beam" or "that setting is impossible". This one concludes _"the light has to get
through there, that door is shut, so it must reach this socket first"_ — and it is a fact rather than an
elimination, which is why it sits with T0 and T1 rather than at the top. It reads straight off the forced
set, needs no enumeration, and its reason is local: put a finger on the socket the run crosses and follow
the wire. See §11.1.

### 4.1 Why T7 is ranked last

T7 subsumes T3 and T4 — a solver could be T0/T1/T7 alone. It is ranked last for
the same reason Sumplete ranks its candidate-intersection last: its reason is "I
tried the alternatives and they all fail", which teaches nothing. T3's reason is a
sentence a child repeats back and can check by eye: _"face it that way and the
light dies in the wall, with no mirror left to save it."_

### 4.2 T6 is the point, not a footnote

The catalogue names "elimination of irrelevant pieces" as this family's skill. T6
_is_ that skill, and it is the only technique in any family whose conclusion is
"this piece does not matter". It makes decoys a first-class part of the puzzle
rather than clutter, and it gives the hint engine something genuinely useful to
say: _"the light never reaches this one, whatever you do."_

## 5. Generation

The configuration space is the product of the movable pieces' state counts —
`2^rotate · stops^sliding`. At nine pieces that is under 20 000 traces, each a walk
over at most 49 cells. **This family can afford exact enumeration**, which Sumplete
and Futoshiki cannot, and the gates below spend that freely.

1. Route a beam from sun-disc to shrine, dropping a mirror at each turn. **The route may
   cross itself, perpendicularly** (§5.2). The final leg runs to the frame, which sets the
   shrine in the wall: an edge shrine has at most three approaches and the frame kills most
   of those, which is what lets T1 fire at all.
2. Fix some of those mirrors as givens, make the rest movable, and set the movable
   ones to a **wrong** starting state so the board opens unsolved.
3. **Wall off the wrong settings.** For each movable piece, the light under its wrong
   setting has to run out — off the frame, or into a wall — before it meets anything
   else the player controls. That is what makes T3's reason available, and the piece
   it settles is what lets the entry run reach the next one. This chain is the whole
   starter board.
4. **Drop shadow pieces** (§6) into the very stretch a wrong setting would light, and
   scatter decoys where no setting can light at all.
5. **Gate — the path is unique.** Enumerate every configuration; every one that
   lights the shrine must trace the _same path_. Decoys may be free (that is what
   makes them decoys), but the route may not be ambiguous.
6. **Gate — deduction reaches it.** The ladder, capped per tier, must settle every
   piece on the path. A board that stalls needs a guess and is discarded.
7. **Thin the walls to a fixpoint** under the cap, re-running gates 5 and 6 on every
   removal. A wall the player cannot spend hides which obstacles the deduction turns
   on — the same argument that prunes Futoshiki's signs.
8. **Gate — the board opens unsolved**, and no single tap solves it.

Gate 5 is the honest form of uniqueness for this family. "Exactly one winning
configuration" would be the wrong test: a decoy has a free state, so a board with
decoys has many winning configurations and only one winning _route_.

### 5.2 Crossings, and an objection that did not hold

This doc used to forbid the route from crossing itself, on the grounds that a crossing "puts two
reasons on one square, and every technique points at a square". **That was wrong, and nothing had
to change to make it wrong.** Nothing in the family has ever been keyed by square: `forced` is keyed
by cell _and_ direction, the walk remembers `(cell, direction)` pairs, the uniqueness gate signs
paths by segment, and the board draws one polyline per segment. A crossed square was already two
things everywhere it mattered. Only the route builder disagreed, and the drawing needed no change
at all — it draws a cross without being asked.

What a crossing must be is **perpendicular**. A square entered twice on the same axis is the beam
retracing its own line, which is a different and much worse thing. A square entered once
horizontally and once vertically is a clean cross, and it forces the one fact worth having:
**nothing can stand there**, or the first pass would have turned. So a crossing may never be a
bend, a stop, a door or a socket, and generation keeps all of them off it.

The part that needed finding was not permission but **leg length**. Legs are drawn from a budget
that divides the grid by the turn count, which gives every leg the same length — and a fold of
equal legs can never cross itself, because it comes back exactly alongside its own line and stops
one square short, for ever. Measured with the even budget: **not one crossing in twenty boards.** A
folded route reuses ground it has already covered, so it gets its own, wider budget (`spread`), and
then crossings appear on every board that asks for one.

One thing it does not do is add a technique. It buys route length and deduction steps without
buying pieces — measured at wizard, `steps` 14.6 → 15.6 and pieces-on-the-route 6.9 → 7.2, with the
configuration space flat. That is a character dial and a good one, not a difficulty lever, and §7 is
where character dials live.

### 5.1 Fixed walls barely survive

Step 7 turns out to remove almost all of them: measured over 40 seeds a tier, a
shipped board carries **0.0–0.1 fixed walls**. Two reasons, and both are fine:

- Step 3 only adds a wall when the wrong ray would otherwise rejoin the route. On
  boards this size a wrong turn usually just runs off the frame, which is already a
  dead end, so no wall was needed in the first place.
- Where one was needed, step 7 keeps it, because removing it opens a second route.

So _"the light dies in stone"_ is a real reason the player hears — 17–34 times per 40
boards at expert and above — but the stone is almost always a **sliding wall the
player is holding in the way**, not scenery. That is a better board than one dressed
with walls nobody can spend, and it means the tier table's vocabulary column below
lists what a tier can _contain_, not what it will be decorated with.

## 6. Difficulty

Every tier gets a full configuration — this family is not gated to a debut tier.
Where it appears is authored per node (`encounter: "lightbeam"`), and the tag
allocator may also draw it anywhere from starter up.

That matters more than it looks: **a starter corridor can sit behind a ward gate
deep inside a wizard pyramid**, so a starter board is not only ever seen by a
beginner. Starter must therefore be _gentle_, not _empty_ — a board with a real
route to find, just a short one with few pieces and a low technique cap.

| Tier    | Grid | Cell | Baseline route             | Stops | Movable | On the route | Configurations | Cap | Goals drawn                 |
| ------- | ---- | ---- | -------------------------- | ----- | ------- | ------------ | -------------- | --- | --------------------------- |
| starter | 7×7  | 46px | 2 bends                    | 2     | 3.0     | 3.0          | 8              | T3  | 1 of: long chain, clear way |
| junior  | 7×7  | 46px | 3 bends                    | 2     | 3.9     | 3.7          | 15             | T4  | 1 of those + blind alleys   |
| expert  | 8×8  | 40px | 3 bends                    | 3     | 5.1     | 3.7          | 68             | T5  | 2 of all four               |
| master  | 8×8  | 40px | 4 bends, 1 shadow          | 3     | 6.4     | 4.5          | 170            | T6  | 2 of all four               |
| wizard  | 9×9  | 36px | 6 bends, 1 decoy, 1 shadow | 3     | 8.5     | 5.7          | 778            | T6  | 2 of all four               |

"On the route" is the count that matters and the one that was missing: pieces that can stand in the
winning beam's way, as against pieces on the board. Everything else is a decoy, and a decoy costs the
player a `neverReached` rather than a decision.

Piece and configuration counts are measured means over 40 seeds a tier, not
intentions, and they are the totals _after_ a board's goals are applied (§7). The
ramp is asserted in `generateLightbeam.spec.ts`, in aggregate over a tier rather
than board by board — with goals drawn per board, one starter grid can legitimately
out-measure one junior grid, and it is the tier that has to grow.

It has been got wrong twice, both times in a way that read right in the table and
played wrong: first with junior boards _smaller_ than starter ones, then again when
the goal pool let two goals add four pieces on top of baselines that already
carried some, putting five pieces on a starter board and collapsing expert, master
and wizard into one ten-piece blur.

### 6.1 The cap does not bite on its own

This is the one thing about the family that had to be discovered rather than
designed. Built as §5 steps 1–3 describe, **every board is a chain of T3 and nothing
more**: every wrong setting has a wall or a frame edge waiting for it, so the light
visibly dies and the stronger rungs never have to fire. A wizard board would then
solve exactly like a starter one, only longer — the cap would be a label.

**Shadow pieces** are the fix, and they work from the other end. A shadow is a decoy
placed deliberately in the stretch a wrong setting would light. With something
unsettled standing in the way, the light does not visibly die — it disappears into a
piece nobody has pinned down yet. T3 has nothing to say, and ruling that setting out
takes T4 or T6. The shadow is still a genuine decoy (no winning beam touches it), so
T5 still frees it, and it is still the player's job to work out that it never
mattered.

Measured effect at wizard, over 40 seeds: with no shadows, T6 fires on 3 boards; with
three, on 28, and T3 alone carries only 14. That is the difference between a tier
table and a tier.

Knobs, in order of how much they actually move difficulty:

- **Technique cap** — what a board may _demand_. The honest dial, as everywhere.
- **Shadow count** — what makes it demand it. Useless without the cap, and the cap is
  decorative without it.
- **Turn count on the route** — how many mirrors the beam must bounce off.
- **Decoy count** — pieces the player must reason are irrelevant.
- **Set-vs-movable mirror ratio** — set mirrors are scaffolding, like givens.

### 6.15 The boards were solvable without being read

Playtested, and the verdict was fun but far too easy — at every tier, wizard included. The cause was
not the tier table, and finding it needed measurement rather than opinion.

**Every board opened on `solution + 1` for every piece**, and every piece had exactly two settings. So
"wrong" meant "flipped", and _tapping every piece once solved every board in the game_: five tiers,
forty seeds each, two hundred out of two hundred. Nothing in §5's gates noticed, because every one of
those boards genuinely was reachable by the ladder as well. It was reachable by this too, and this is
quicker.

Three things follow, and only the first is the bug:

- **Openings are drawn, not derived.** Each piece opens on its own state, weighted heavily towards
  wrong so the board still has work in it, and a board does not ship unless it is dark, not one tap
  from done, and **not solvable by the same number of taps on everything**. A bigger offset would only
  have moved the exploit to "tap everything twice"; what has to hold is that the pieces are not all the
  same distance from their answers.
- **Greedy play is a gate now, from junior up.** With the parity gone, the obvious substitute took its
  place: a player who taps whichever piece leaves the light nearest the shrine solved 15–38% of the top
  tiers. §4 opens by saying a beam puzzle's natural solving mode is trial and that trial is not
  deduction — `resistsGreedyPlay` is what makes that a property of the boards rather than a sentence in
  this document. Starter stays fiddleable on purpose: a three-piece board should give way, and that is
  what makes it a gentle first board rather than an empty one.
- **A sliding piece can carry three stops.** Two stops ask "in the way or out of it"; three ask
  _which_, which is a different question and a harder one, and a board carrying one cannot sit on a
  single parity at all. §2's table always said 2–3; generation only ever built 2.

Then the ramp, which had **expert and master measuring identical** — both drew a three-bend route, so
both had 4.0 pieces on the route and the same length of deduction. Master goes to four bends and
wizard to six.

Measured over 40 seeds a tier, before → after:

| Measure                           | Before              | After               |
| --------------------------------- | ------------------- | ------------------- |
| Configurations                    | 8/15/42/70/288      | 8/15/68/170/778     |
| Pieces on the route               | 3.0/3.7/4.0/4.0/5.0 | 3.0/3.7/3.7/4.5/5.7 |
| Falls to getting-warmer taps      | 73/8/10/3/3%        | 85/0/0/0/0%         |
| Solved by tapping everything once | 100% everywhere     | never               |

Wizard's worst generation went from 50ms to 278ms, which is what the longer route and the extra gates
cost, and the attempt budget had to rise with it.

**The floor this exposes is worth knowing: three movable pieces.** Two binary pieces have no honest
opening at all — every start is lit, one tap from lit, or the same one tap on both — so generation
refuses that board rather than shipping one.

### 6.2 Grid size is capacity, not difficulty

**Grid size is not on that list, and an earlier version of this doc was wrong to put it
there.** It barely moves how hard a board is: the configuration space is driven by piece
count, and the reasoning by the cap. What size actually decides is whether the board has
_room_ — for the route's length, for the pieces, and for the empty shoulders that keep two
tappable pieces off each other (§9). It is a canvas, and it is sized by what has to fit.

That is measurable rather than arguable. Adding the spacing rule at the old 5×5 and 6×6
sizes made **every starter board fall back to no goal at all**, because there was nowhere
to put anything; the same rule at 7×7 and up costs nothing. Size did not change the
difficulty — it changed whether a board could be built.

It also means this family goes past the 7-wide ceiling the other grid families stop at.
Theirs is a real ceiling: every cell there is tappable, so cell size _is_ tap-target size.
Here only the pieces are tappable, so the ceiling is legibility instead, and 36px still
reads a mirror's diagonal clearly.

### 6.3 The maze reading, and the measure that follows from it

**A lightbeam board is a maze whose corridors are not drawn.** That is the most useful sentence anyone has
put on this family, and it settles what difficulty means here. In a maze you never enter a side passage
you can see is a dead end; it costs nothing to reject. The passage that costs something is the one you
have to walk three turns into, past two more forks, before it closes.

So difficulty is **how far a wrong turn has to be followed before it can be called wrong**, and how many
decisions sit on the way. Every other reading — how many pieces, how many settings, how wide the grid —
is a proxy for that at best.

**The ladder already encodes this exactly, which is the good news.** T3 `deadEnd` fires when a wrong
setting reaches a wall or the frame _"with no unsettled piece left on the way"_. That clause **is** "a
corridor you can see into from the entrance". A branch with a piece standing on it cannot be dismissed by
T3 at all, and the board has to spend a deeper rung on it. The model is right; it is the **spec** that
asserts the wrong thing.

Measured over 40 seeds a tier, every wrong setting of every player-owned piece traced with the rest of the
board solved:

| Tier    | Legs a wrong branch runs | Forks met on it | Seen from the door | Needs 2+ forks |
| ------- | ------------------------ | --------------- | ------------------ | -------------- |
| starter | 2.98                     | 1.00            | 33%                | 33%            |
| junior  | 3.24                     | 1.44            | 26%                | 48%            |
| expert  | 3.13                     | 1.46            | 25%                | 44%            |
| master  | 3.84                     | 2.04            | 14%                | 61%            |
| wizard  | 5.07                     | 2.67            | 13%                | 72%            |

**"Seen from the door" is the number to steer by** — the share of wrong turns a player can dismiss without
following them. It falls 33 → 26 → 25 → 14 → 13%, which is the right shape and is a genuine ramp rather
than the configuration count the spec currently checks.

**And it exposes a defect: junior and expert are the same board.** 26% against 25% seen from the door, 48%
against 44% needing two forks, 1.44 against 1.46 forks, and expert's branches are _shorter_ than junior's
(3.13 legs against 3.24). This is the same failure the PR already found and fixed once between expert and
master — two tiers measuring identical — reappearing one rung down on the measure that actually matters.
Route length was retuned; branch depth never was.

**What the spec should assert.** `generateLightbeam.spec.ts` currently checks that the configuration space
never shrinks as tiers rise, which counts moves rather than thinking (§6, and the correction that grid
size is capacity rather than difficulty). Replacing it with a fall in "seen from the door", asserted in
aggregate over a tier, would make the ramp a property of the boards. The junior/expert collapse has to be
fixed for that assertion to pass, which is the point of writing it.

### 6.4 The vocabulary ladder — one new thing a tier

Difficulty is set by **what a tier is allowed to use**, one addition at a time, rather than by turning
every dial a little further:

| Tier    | What it adds                        | Which currency it buys (§6.3)                               |
| ------- | ----------------------------------- | ----------------------------------------------------------- |
| starter | right angles only, dead ends 1 turn | neither — wrong turns are meant to be seen from the door    |
| junior  | longer dead ends, walls             | **legs** — a wrong turn has to be followed further          |
| expert  | sliding mirrors, sliding walls      | **forks** — an unsettled piece stands in the wrong ray      |
| master  | diagonal angles                     | geometry — the ray leaves the rows and columns you can read |
| wizard  | all of it                           | composition                                                 |

The two currencies §6.3 separated fall out cleanly: junior buys length, expert buys width. **A sliding
piece is exactly "a piece standing where a wrong ray goes"** — which is the lever authored angles could
not supply (§11.7), and it arrives at the tier where the fork count needs to start moving.

#### Three places the shipped config does not match this

1. **Sliding mirrors already debut at junior** (`slidingMirrors: 1`), a tier before the ladder puts them.
   That is most of why junior and expert measure alike: junior already owns expert's new thing.
2. **A starter board can draw a sliding wall.** Starter's pool is `[longChain, clearTheWay]`, and
   `clearTheWay` turns `slidingWalls` up. `longChain` turns `setMirrors` up. So **both** of starter's goals
   introduce vocabulary the ladder reserves for later tiers.
3. **An expert board can draw doors and sockets**, because `orderOfOperations` sits in expert's pool. The
   ladder keeps those for wizard.

#### The structural cause: goals introduce vocabulary, not just quantity

§7's pool was written as "the tier sets the route, a goal sets what is in the way", and the fairness note
in `lightbeamConfig.ts` gates two goals on the technique cap. But three of the six change the **piece
list** rather than the amount of it:

| Goal                | Turns up       | Introduces         |
| ------------------- | -------------- | ------------------ |
| `longChain`         | `setMirrors`   | set mirrors        |
| `clearTheWay`       | `slidingWalls` | sliding walls      |
| `orderOfOperations` | `doors`        | doors and sockets  |
| `sortTheWheat`      | `decoys`       | — more of the same |
| `blindAlleys`       | `shadows`      | — more of the same |
| `crossedBeams`      | `crossings`    | — route shape only |

So **a tier's goal pool has to be derived from its vocabulary rather than authored beside it**, or a goal
hands a board a piece its tier has not met. Under a strict reading of the ladder, starter is left with
`crossedBeams` alone — and that turns up `turns`, which fights "dead ends 1 turn". **Starter may want no
goal at all**, which is consistent with it being the tier that teaches rather than tests.

#### Applied, and re-measured

The ladder is in `lightbeamConfig.ts`. Measured over 40 seeds a tier afterwards:

| Tier    | Player pieces | Legs a wrong turn runs | Forks on it | Seen from the door | Worst gen |
| ------- | ------------- | ---------------------- | ----------- | ------------------ | --------- |
| starter | 3.0           | 2.96                   | 1.00        | **33%**            | 5ms       |
| junior  | 4.0           | 3.48                   | 1.50        | **25%**            | 25ms      |
| expert  | 5.9           | 3.90                   | 2.22        | **15%**            | 38ms      |
| master  | 7.5           | 4.21                   | 2.50        | **13%**            | 216ms     |
| wizard  | 8.3           | 5.09                   | 2.65        | **13%**            | 731ms     |

**Monotone on every column, and junior against expert is 25% to 15% — the collapse §6.3 found, closed.**
Master and wizard tie on the headline percentage and separate on everything else; a second shadow at
wizard parts them by one point for twice the generation time, which is not a trade worth making.

Four things the application taught, none of them predicted:

- **Three player pieces is the floor for an honest board, not a preference.** Starter at two bends
  generated **nothing**: two binary pieces make four configurations, and every dark one is either a tap from
  done or solved by tapping both, so `openingIsHonest` rejects all of them. Starter is three bends.
- **The ladder has to be cumulative.** First pass gave junior and expert the same route length, and junior's
  only legal goals both lengthen the route while expert's did not — so junior came out **harder than
  expert** on every measure. Expert keeps junior's length and adds sliding pieces on top.
- **A tier's addition belongs in the baseline only if every board should have it.** Pinning a sliding wall
  into expert, master and wizard took wizard's worst generation from 520ms to 1407ms, because a three-stop
  track has to fit a straight stretch spaced from everything already placed. The sliding **mirror** is
  expert's baseline; the sliding **wall** comes from `clearTheWay` in the pool, which is §7's lean-baseline
  rule doing its job.
- **Junior cannot demand more reasoning than starter, and its cap now says so.** Its addition buys legs, and
  the shrine-side elimination needs a piece standing in the wrong ray — which is expert's addition. The cap
  was `feedsExit`, a ceiling no junior board reached; it is `deadEnd` now.

**The vocabulary rule is a spec, not a note.** `generateLightbeam.spec.ts` asserts that no tier puts a piece
on a board before its tier: starter and junior carry turn mirrors and nothing else, expert and master never
carry a door or socket, and wizard carries both. That is the gate that was missing when a starter board
could draw a sliding wall.

#### One honest caveat on walls

Walls are character rather than depth. §5.1 already found that removing one "usually leaves the wrong
setting running off the frame, which `deadEnd` explains just as happily", and `thinWalls` strips nearly
all of them — a shipped board carries 0.0 to 0.1 fixed walls. So junior's walls make a wrong turn **die
somewhere you can point at** instead of sailing off the edge, which is worth having for how the board
reads, but the depth at junior has to come from the longer dead end beside it, not from the wall.

## 7. Puzzle goals — pick two dials and turn them hard

Before this existed, every tier turned every dial a little. The wizard row read: five turns
AND a set mirror AND two sliding mirrors AND a sliding wall AND a decoy AND three shadows —
so every wizard board was the **average** wizard board.

A **goal pool** fixes that. `LIGHTBEAM_CONFIG` now holds a lean baseline, and generation
draws one or two goals per board and turns those dials hard. Boards get character instead
of mean settings, and it adds the axis the family was missing: difficulty (cap, size) is one
thing, **what kind of problem this board is** is another, and they were welded together.

With 158 lightbeam nodes in the world, that is a bigger variety win than any new piece type
would be — and it needed no new piece at all. The four shipped goals are a re-scheduling of
dials the generator already had.

| Goal                    | Turns up                      | Tests                      | Built |
| ----------------------- | ----------------------------- | -------------------------- | ----- |
| **Long chain**          | `turns +2`, `setMirrors +1`   | route-tracing              | yes   |
| **Sort the wheat**      | `decoys +2`                   | which pieces matter (T5)   | yes   |
| **Clear the way**       | `slidingWalls +1`             | does the light get through | yes   |
| **Blind alleys**        | `shadows +1`                  | the exhaustive rung (T6)   | yes   |
| **Order of operations** | `doors +1`                    | ordering (T2)              | yes   |
| **Crossed beams**       | `crossings +1`, `turns +1`    | reading a square twice     | yes   |
| **Steer clear**         | a harmful node on a wrong ray | avoidance                  | §11.1 |

### 7.1 Three rules that keep it honest

**A goal only ever turns a dial up.** That is what lets two of them apply in either order
and both still mean what they say. The first draft had each goal flatten the dials it did
not care about, so drawing two silently cancelled the first.

**The tier sets the route; a goal sets what is in the way.** So a goal adds one or two
pieces, never four, and the tier still decides how big a board is. `longChain` gives two
more bends but one more _given_ mirror, because the length is the character, not the piece
count. Getting this wrong put five pieces on a starter board that wanted three (§6).

**The gates stay untouched.** A goal shapes what gets _placed_, never what gets _accepted_:
path uniqueness and the ladder still decide, so no goal can smuggle through a board that
needs a guess.

### 7.2 The fallback ladder, and why the board carries its goals

Two goals at once can be a pair no board satisfies, so when the attempt budget runs out a
goal is dropped and it tries again, down to the bare baseline.

The board then **records the goals it was actually built to**, as data on the puzzle rather
than a log line. A fallback that fires quietly would make the whole pool decorative while
every other measurement still looked fine, so `goals.spec.ts` asserts the ladder never
fires at the shipped config, and the playtest bench can show what a board was meant to be.

That assertion earned its keep immediately. The first measured run fell back on **30% of
wizard boards**, and the cause was not the goals at all: `buildRoute` drew each leg's length
from 1..size-2 regardless of how many legs it had to fit, so it ate the grid in three
strides and a long route almost never fitted. The leg budget now scales with the turn
count — and wizard's worst-case generation went from 332ms to 50ms as a side effect.

### 7.3 Which goals a tier may draw

A fairness question, not a taste one. `sortTheWheat` piles on decoys, and a decoy is only
fair once `neverReached` can prove it irrelevant — so expert and up. `blindAlleys` piles on
shadows, which need at least the shrine-side elimination to unpick — so junior and up.

One consequence worth knowing at playtest: a junior board demands the shrine-side
elimination **when it is a blind-alleys board**, which is about a third of them. That is the
goal system working as designed rather than a gap — the goal decides the reasoning, and the
cap only says how far a board is allowed to go.

Nothing about the mechanism is lightbeam-specific: Futoshiki could draw technique-flavour
goals the same way. Left here until a second family actually wants it — a shared abstraction
on one caller would be the premature kind.

## 8. Controls

One gesture: **tap a piece to cycle it**. Turn mirrors cycle orientation, sliding
pieces cycle to their next stop. Fixed pieces ignore taps. No drag, matching the
rest of the game.

**Every square a piece can stand in is tappable**, its vacant stops included, and all
of them cycle the same piece. Tapping where you want it to go is the same gesture as
tapping the piece, and it doubles the target.

A sliding piece draws its track faintly, and the track carries a **ghost of the
piece** rather than just an outline. An empty dashed square says only "something can
come here", which leaves the player to find out what by tapping — and whether the
thing that arrives bends the light or swallows it is the entire difference between the
two sliding pieces.

**A tap is animated: a sliding piece slides, and a turn mirror turns.** This is not polish. A piece
redrawn in a different square is a jump, and a jump leaves the player to work out what moved and how
far — which was survivable when every track had two stops and became a real cost once one can have
three (§6.15). The pieces therefore live in a layer above the cells, so each one keeps its identity
across a tap and its stop is a position it moves to rather than a square it reappears in. The answer
to "what did my tap just do" should not need working out.

**No undo.** A cycle is its own inverse — tap round again and the piece is back —
so the Futoshiki argument for undo (a placement destroying work elsewhere) does
not apply. Nothing a tap does here is unrecoverable.

**Hints stay**, and cost almost nothing: the solver is mandatory for gate 6, so a
hint is the same solve the generator already runs. Dropping them would save two locale
blocks and forfeit the only thing that teaches a player who cannot yet see the
deduction — leaving them to flip pieces at random, which is the failure mode this
family has to avoid. A hint lights the piece it names **and the beam segment its
reason is about**; "the light dies here" means nothing without showing where.

### 8.1 A hint here is not a correction

Every other family's hint can start with "that number is wrong". Here **every setting
is a legal setting**, so there is nothing to be wrong about in that sense. A hint is
instead _the first reason the player has not yet acted on_: the deduction is replayed
from a blank board, and the hint is the earliest step whose conclusion the board in
front of them contradicts. Follow it and the hint moves on by itself.

T5 gets the second pass, and only when nothing is actually set wrong — otherwise the
game would be telling the player to ignore a piece while the route is still broken.
That makes it the one hint in the whole catalogue whose advice is to leave something
alone.

## 9. Board requirements

Beyond the shared screen bar:

- **The beam is always drawn**, from the sun-disc to wherever it currently ends.
  This is the family's live feedback, the equivalent of the balance scale's tilt.
- **The beam's end is marked** — absorbed, escaped, or looping — so a beam that
  stops short does not read as a rendering fault.
- Movable pieces read as movable at a glance, and a sliding piece's track is
  visible.
- **No two tappable pieces ever touch**, and a piece's hit area reaches into the empty
  squares around it. Measured in the encounter modal at 360×640: the board is 318px, so a
  9-wide cell is 36px and its tap target 46px — over the 44px bar with no two targets
  meeting, because the nearest other piece is two squares away. This is what buys the wider
  grid, and it is a generation gate (`piecesAreSpaced`) rather than a rendering trick: before
  it existed essentially every board had touching pieces, up to ten pairs on one wizard grid.
- Both mirror orientations read as visibly different objects, not a subtle
  rotation, at **36px**. Written as 44px until §11.9 measured it, which was the wrong
  number off the line above: 44px is the _tap target_, and a glyph is drawn inside the
  **cell**, which is 36px. The bar is a fifth stricter than it read.
- **Nothing but light is drawn amber, and nothing but light is drawn as a continuous line.** The
  switch-node prototype (§11.1) is where this stopped being a preference: a wire in any other
  colour still read as a second beam until it was dashed as well.
- **A piece's outline says whose it is.** White for everything a tap can move, and a socket's own
  colour for everything a socket moves (§11.1). One question — "can I touch this?" — answered before
  anything else on the board has to be read.

## 10. Theming

Already written into the lore: `story-and-time-brainstorm.md` puts mirrors at the
**Lighthouse of Alexandria** journey and names a **"Letting the Sun In"** theme,
alongside the sundial and water clock. This family is the centre of that sun-god
cluster.

The component emits logical state only — `sunDisc | shrine | mirror(a|b) | wall`,
plus the traced path and its end reason. Colour, texture and glyph live in the
skin.

## 11. Deferred

> **Building the mirror work? Read §11.8 first, then stop.** §11.3 to §11.7 are the record of how the
> design was reached and contain **four recommendations that were later disproven** — an eight-state
> mirror, a four-state one, a retracted state, and a two-stop half-step-only set that measurement showed
> collapses a board's reach to a third. Each is marked where it was overturned, but the corrections arrive
> after the claims, so reading forwards will hand you a design that does not work. §11.8 is the decision;
> everything before it is the evidence. **§11.9 to §11.12 are what building it found**, in step order, and
> they are the current record: §11.9 moves one bar in §9, §11.10 replaced the mirror's two facts with one
> number, §11.11 replaced the wrong ray, and **§11.12 is where the mechanic reaches a player** — master and
> wizard route diagonally, so anything in §11.11 written about "no board ships one" has been overtaken.

- **Prisms and colour splitting.** The catalogue already rules this a different
  puzzle shape rather than a knob, and points at The Talos Principle as prior art.
- **"Light the shrine at the fifth hour."** `story-and-time-brainstorm.md` proposes
  a timed variant reusing these exact pieces once a tick/scrub control exists —
  the obelisk shadow sweeping one column per hour. Same pieces, new problem.
- **Offline seed tables.** The direction recorded in `futoshiki.md` §10 applies
  here too, and this family wants it less: enumeration is cheap, so generation is
  fast without it.

### 11.1 Traps — the missing half, and why the obvious build does not work

**As generated today, sockets are a checklist rather than a choice.** Every socket is drawn from route
cells strictly before the door it opens, so the winning beam crosses all of them on its way past. The
player never decides anything about a socket: the door opens as a side effect of solving the route. That
is a reason without a decision, and a reason without a decision is bookkeeping.

The other half is a **trap** — a socket the light must be kept _away_ from, whose stone lands in front of
the beam rather than out of its way. Put one on a board that also has a door and sockets stop being a
list to tick off: some have to be reached, some have to be dodged, and only the reasoning tells them
apart. Difficulty in this family is not how many taps a board takes, it is how much thinking each tap
needs, and the classification is the thinking.

Two things are built for it and verified:

- **The known walk fires sockets mid-flight.** It used to read one static grid, so a piece a socket
  _might_ move stayed `unknown` at both its cells and the walk simply stalled. Sound but blind — and blind
  to a trap, whose stone has to be able to land in front of the beam and kill it. Sound under a
  hypothetical pin too: `deadEnd` asks "suppose it is set that way", and under that supposition the beam
  really does cross the socket.
- **`wiringDead`**, the rung that proves a wiring can never fire, so its stone is known to be resting and
  the run walks straight past. Without it a board carrying a trap can never settle, because the stone it
  might drop sits `unknown` across the route for ever.

**What does not work is the obvious placement, and it was worth measuring rather than assuming.** Putting
the socket on a wrong setting's own ray — the way shadows are placed — produced **23 traps across 120
boards, every single one of them decoration**: remove it and the board is still a unique, deducible
puzzle. The reason is plain in hindsight. The wrong setting was _already_ wrong, killed by the frame or
by `blockWrongSettings`, so the trap adds nothing to why. It is the unspendable-wall problem (§5.1)
wearing a new hat, and it was reverted rather than shipped.

**The placement that would work** follows from what "load-bearing" has to mean here: the trap must be the
_only_ reason a wrong setting fails, so that setting has to otherwise **reach the shrine**. That is a
would-be second route, which generation currently rejects outright. So the step is not "decorate a wrong
ray" but:

1. Build the route, and deliberately leave one piece's wrong setting un-walled.
2. Trace it. Keep going only if that wrong setting reaches the shrine — a genuine second route.
3. Put the socket on that second route and the stone further along it.

Uniqueness is then restored _by the trap_, which makes it load-bearing by construction, and the board is
one where the wrong answer looks right until you notice what it runs over. Assert the load-bearing
property directly, the way §5.1's walls are asserted: take the trap out and the board must stop being a
puzzle.

**Step 2 is the hard one, and §11.3 is where the supply comes from.** Generation today builds boards with
exactly one route on purpose, so deliberately leaving a wrong setting un-walled and hoping it reaches the
shrine is fishing in a pond stocked against you. Giving mirrors a retracted state produces a second route
on half of wizard's boards as a side effect, which turns step 2 from a search into a filter. The two
sections are one piece of work.

### 11.2 Switch nodes — built

A **node** is a fixed, transparent cell wired to one movable piece. Light crossing it
lights the wire, and the piece it drives moves. The wire is drawn.

This started as two separate ideas — a waypoint the beam must cross, and a switch that
moves things — and they are better as one. **A node is a point you must touch before you
can solve, and it earns that "must" from the geometry rather than from a rule:** the door
it opens is standing in the route's way, so the light has to reach the node first. Nothing
declares the requirement. That is what makes it worth building.

#### Why the unified form beats a waypoint

A plain waypoint needs its own win condition — shrine lit _and_ every waypoint covered.
That drags in three things this family has so far done without: counting, per-waypoint
visible state, and the failure mode where **the beam is at the shrine but you are not
done**. A node needs none of them. The rule stays "light the shrine", and no rules text
is added at all, which is the P2 discipline (`PUZZLE_FAMILIES.md`) rather than a
concession to it.

It is also self-policing where a waypoint was not. A waypoint sitting on a stretch T0
already forces teaches nothing, so waypoints would have needed their own thinning pass
(§5 step 7). A node whose door is not actually blocking the route is simply a **decoy**,
and the gates already classify it as one — no new machinery.

#### The rung it buys: a forced-order fact

Every fact in the ladder today is either "these cells carry the beam" or "that setting is
impossible". A node adds a third kind: _"the light has to get through here, this door is
shut, so it must reach that node first."_ **Order**, which nothing in the catalogue
trains.

It is monotone — a door once open stays open — so it slots into the existing fixpoint loop
exactly as the `forced` segment set does. And it seeds deduction **from the middle of the
board**, which is the real prize: T0 grows forward from the disc and T1 backward from the
shrine, and they are weakest where they meet, in the middle of a long route, which is
precisely where wizard is thinnest.

#### The paradox stops being a restriction

A switch that moves a wall _behind_ the beam is the trap: the beam that reached the switch
no longer reaches it. Under the unified form that case does not arise — the node is early
on the route and the door is late, by construction — so the door always opens **ahead** of
the light and the drawn beam is never a picture of something that has since stopped being
true.

That leaves the semantics simple: walk forward, apply a node's effect the moment the light
crosses it, keep walking. One pass, deterministic, still a pure function of the
configuration, so the exact enumeration every gate depends on survives untouched.

#### Decoys at three levels

The wiring is what keeps this admissible. Every reason in the ladder is local — "face it
that way and the light dies in that stone" is checkable because the stone is _there_ — and
a switch that can move the stone would break that, collapsing the reason into "I tried the
alternatives and they failed", the rung ranked last for teaching nothing. A drawn wire
puts locality back: you can see what each node drives and follow it with a finger, so the
reason survives with one hop of indirection.

Then "this does not matter" gets three depths, the third new to the catalogue:

1. A node the light can never cross, so its wire never fires — today's T5, one level up.
2. A node that fires into a piece the light never touches anyway: real wire, irrelevant
   consequence.
3. A node that fires, moves a piece that **is** on the route, and still changes nothing.

#### What to check before believing it

- **Yield, not logic.** Opening a door creates routes that were not there before, so
  path-uniqueness (gate 5) has more to reject. Measure first.
- **The loop-detection seen-set must be keyed by node-state, or cleared on each firing.**
  Otherwise a legitimate re-traverse of a cell reads as a loop. Termination is safe either
  way: nodes only ever fire once, so the trace is at most (nodes + 1) bounded walks.
- **The drawing is the likeliest thing to kill this, not the reasoning.** The board already
  carries cells, a two-pass beam, piece glyphs, movable rings, dashed tracks with ghost
  pieces, and end markers — at 45px a cell on a 7×7. A wire layer crossing all of that is
  where it turns to soup. Prototype the board visually _before_ writing any logic, which is
  the reverse of the order the rest of this family was built in.

#### What the visual prototype found, before any of it ran

Done, ahead of the logic, as `LightbeamBoard.stories.tsx` — `NodeDoor`, `NodeTrap` and
`NodeDensity`, the last of them a real generated wizard board with two wires laid over it at the
318px the encounter modal actually gives. **The drawing survives, and on one condition.**

Three rules make the wire legible, and only the first was designed in advance:

1. **The beam owns cell centres and edge midpoints; the wire owns the grid lines.** Every beam
   segment runs midpoint → centre → midpoint, so a wire routed corner-to-corner along cell
   boundaries can only ever cross it transversally. They never share a lane, at any size. This is
   also what keeps the wire off a mirror's diagonal, which is the one glyph that reaches the
   corners.
2. **The wire is verdigris, never amber.** Light is amber and movable pieces are sky; oxidised
   copper is a third thing.
3. **The wire is dashed, and the beam is continuous.** Colour alone was not enough. Rule 1 keeps
   the wire out of the beam's lane but cannot keep it from running one half-cell from a _parallel_
   stretch of beam — the beam moves with every tap, and the wire cannot chase it. At 35px a cell,
   two solid lines that close together read as one double-tracked thing however they are coloured.
   A dashed line cannot be read as light at any size.

**Ownership is a colour, and it does more work than the wires do.** Every piece carries an
outline saying whose it is: **white for the player's**, and a socket's own colour for a socket's.
That answers "can I touch this?" before a single wire is traced, and it is what makes a socket
driving three pieces legible at a glance — the three wearing its colour are the three it drives.

That colour then settled a question this doc had already got wrong once. The first cut of the
prototype concluded that two wires meeting at a shared corner were unreadable, and that **wire
separation therefore had to be a fourth generation gate** beside `piecesAreSpaced`. Giving each
socket its own hue made that wrong: the ambiguity at a crossing was never geometric, it was that
both wires were the same green and there was nothing at the crossing to tell them apart. Two
colours and it reads fine. Separation stays a nicety, the generator keeps its three constraints,
and `NodeDensity`'s three boards are kept as the evidence for the correction.

Three things the prototype settled that were open questions in the sections above:

- **A node needs no lit/unlit state of its own to draw.** The wire lights when the beam crosses
  the socket, which the board reads off the beam it is already drawing. Nothing is inferred that
  the player cannot see.
- **The wire attaches to the stop the node drives the piece _to_**, not to where the piece is
  standing. That is what makes a shut door legible: the socket, the wire, and the empty square
  the stone will land in are all on screen before anything has happened.
- **The socket and its effect want to be separate things** (`BeamNode` and `NodeWiring`), which is
  what makes the two shapes below one mechanic rather than two.

#### Fan-out and fan-in

A wiring names a set of sockets and one piece. Both useful shapes fall straight out of that, and
neither needs a rule explaining it:

- **Fan-out** — one socket named by several wirings. Crossing it sets several pieces at once. The
  colour does the explaining; the wires only confirm it.
- **Fan-in** — one wiring naming several sockets, and the piece does not budge until the light has
  been through **all** of them. That is a genuinely different problem from a door: not "reach that
  square" but _"reach these two squares, and there is one beam to do it with"_ — which is a
  routing constraint rather than a setting to rule out, and the first thing in the family that
  asks the player to plan a beam rather than settle a piece. The piece wears both sockets' colours
  split round its edge, so the demand is visible on the thing being demanded of.

Each strand of an and-wiring shows its own socket's state, so a half-satisfied one is visibly
half-satisfied — the player can see which socket is still missing, which is the whole of the
puzzle it sets. The wire only thickens when the wiring actually fires, because a wire drawn as
carrying while nothing moved is the one lie this layer must not tell.

A node is fixed scenery with no state and nothing to tap, so the control scheme stays at
exactly one gesture.

#### What shipped, and what the measurements say

All of the above, minus the harmful node (below). A socket is a transparent cell; a **door** is stone on
the route that no tap will shift. The two are separate types on purpose — `BeamNode` is the socket,
`NodeWiring` names a set of sockets and the piece they drive — which is what makes fan-out and fan-in one
mechanic rather than two.

**A door is not tappable, and that is the whole reason a socket is worth reaching.** A door the player
could simply open would make the socket decoration, so a driven piece contributes nothing to the
configuration space: `pieceOptions` gives it exactly one state, and every enumeration, gate and play model
in the family goes through that. It also drops out of `piecesAreSpaced` — that rule is about a thumb
landing on the piece the player meant, and a door is not something anyone can mean.

The three worries above, answered:

- **Yield was not the problem.** Doors generate on the first or second attempt; wizard sits at 30ms a
  board with one, against a 278ms worst case for the tier as a whole.
- **The loop-detection set is cleared whenever a wiring fires**, which keeps a legitimate re-crossing from
  reading as a loop. Termination is unaffected: a wiring fires once, so the clear happens at most as many
  times as there are wirings. `beam.spec.ts` holds a board that re-crosses its own run.
- **The drawing was the risk, and the prototype above is what retired it.**

Ordering falls out of generation rather than being checked for: sockets are drawn from route cells
strictly _before_ the earliest door, so an effect always lands ahead of the light and the drawn beam is
never a picture of something that has stopped being true.

Where it appears is `orderOfOperations`, a goal from expert up (§7), plus a door on every wizard board
whose wiring names two sockets. Measured over 40 seeds a tier, against the same boards without any of it:

| Measure                                    | Without doors       | With                                         |
| ------------------------------------------ | ------------------- | -------------------------------------------- |
| Configurations at wizard                   | 778                 | **1618**                                     |
| Pieces on the route                        | 3.0/3.7/3.7/4.5/5.7 | 3.0/3.7/3.9/4.8/**6.9**                      |
| Boards using the exhaustive rung at wizard | 20/40               | **29/40**                                    |
| Boards where T2 fires                      | —                   | 15/40 expert, 15/40 master, **40/40 wizard** |

Wizard's configuration space is 5.6× what it was before this iteration began, and none of that came from
a wider grid.

#### Still deferred: the node that closes a way

The harmful node below is designed and not built. Nothing about it is hard — the semantics are unchanged,
since effects land ahead of the light either way — but it wants its own hint voice and its own fairness
question (a trap the player can walk into needs the ladder to be able to _warn_, not only to explain
afterwards), and neither is answered by anything above.

#### A node can also be the thing to avoid

The effect does not have to help. A node wired to **close** a way — dropping stone in front
of the shrine — turns the mechanic inside out at no cost: the semantics are unchanged
(effects land ahead of the light either way, so the drawn beam stays honest, and the light
simply stops at the new stone), but the reasoning is new. The ladder has no form of
_avoidance_ today, and this one is local with one hop of indirection: _"that setting sends
the light through the node, which drops stone in front of the shrine, so it cannot be that
setting."_

It composes nastily with the shadow pieces (§6.1): a wrong branch that trips a harmful node
is a trap twice over.

That is the real argument for the node — not one extra trick but a **machine you have to
understand before you can drive it**. Which nodes to light, and which to steer clear of.

### 11.3 A third mirror state — measured, and it is not a fourth angle

**More rotation is not more clicks, it is more reachable positions**: more ways through the same room
without adding a piece to it. That is the knob worth having, because board area is this family's scarcest
resource — every extra piece has to clear `piecesAreSpaced` (§9), and grid size does not buy difficulty
anyway (§6). A knob that raises what one piece can do, rather than how many pieces there are, is the only
kind that does not spend room.

Measured over 30 seeds a tier on the real generator (`base` is today's two faces):

| Tier    | Cells the beam can be made to reach | Boards still single-route |
| ------- | ----------------------------------- | ------------------------- |
| starter | 15.2 → **20.2**                     | 30/30 → 28/30             |
| junior  | 19.2 → **24.1**                     | 30/30 → 26/30             |
| expert  | 21.7 → **28.3**                     | 30/30 → 26/30             |
| master  | 28.3 → **36.5**                     | 30/30 → 18/30             |
| wizard  | 36.2 → **48.5**                     | 30/30 → 15/30             |

**A third of the room again, at no piece cost and no extra square.** The clearest way to read it: a master
board whose mirrors have the third state reaches 36.5 cells, and a wizard board today reaches 36.2 — so
the knob buys wizard's coverage on master's 8×8 with 1.8 fewer mirrors. That is the claim, quantified.

**But the useful third state is a retraction, not another angle, and that took measuring to see.** Two
candidates were surveyed on identical boards:

- **retract** — `/`, `\`, and _out of the beam's way_. Three states.
- **rotate4** — 45° steps: `/`, `\`, `|`, `—`. Axis-aligned, a mirror reflects a beam meeting its face
  straight back and passes one grazing it, so every incoming direction gets four behaviours: turn one way,
  turn the other, reverse, pass. This is the one that is literally "more angles".

They come out **the same on every measure that matters** — reach 48.5 vs 49.2 at wizard, and identical
route counts and identical single-route counts at every tier — while rotate4 costs **232× the enumeration**
against base, where retract costs 23×. §5's exact enumeration has a 20 000-trace budget; retract lands at
15 200 and rotate4 at 152 800, so one fits and the other ends the enumeration the whole family is built on.

The reason the two extra angles earn nothing is worth keeping: **a reversed beam is sent back the way it
came, into the half of the board it has already crossed and toward the disc, which absorbs.** It explores
territory the beam has covered and rarely finds a shrine placed away from the disc. Reversal is not a
wrong idea, it is a nearly empty one.

Retraction also wins on the ladder's own ordering principle — explainability, not power (§4). An
axis-aligned mirror **blocks or passes depending on which way the light is coming**, so "can the light get
through here" stops being answerable by looking at the cell. A retracted mirror is out of the way for
every direction, which keeps every reason local.

**Two things follow, and the second is the interesting one.**

1. **This is a generation problem, not a tracing one.** Nothing in the walk needs changing: a retracted
   piece leaves its cell empty, which is what an empty cell already is. The list of states a turn mirror
   cycles through has always been able to hold a third thing, and there has never been a third thing to put
   in it. _(This said `MirrorFace` and `faces: MirrorFace[]`; §11.10 replaced both with `angles:
MirrorAngle[]`, so the non-reflecting member would now be a sentinel angle or a widened element type.
   The point stands, the names do not.)_
2. **The uniqueness cost is the whole of the work.** Half of wizard boards (15/30) gain a second route to
   the shrine once mirrors can retract, and a second route is exactly what gate 5 rejects. Paying for it
   with more stone costs board area, which is the thing the knob was worth having for.

**Which is where this meets the trap (§11.1).** That section is blocked on needing a wrong setting that
_genuinely reaches the shrine_ — "a would-be second route, which generation currently rejects outright".
The retracted state manufactures those, on half of wizard's boards. So the two open items are one item:
**retraction is the supply of second routes, and the trap is what makes one of them fail for a reason.**
Uniqueness comes back not by walling the second route off but by putting a socket on it, which is the
placement §11.1 already argues for and could not previously source. Neither is worth building alone.

### 11.4 The diagonal beam — and it beats §11.3 with one piece

A finer mirror cut, at 22.5° steps, turns an orthogonal beam by 45°. **Light then travels the diagonals
too, and a mirror already standing on that diagonal is edge-on to it, so the beam runs straight past.**
Pass-through stops being a state anyone had to invent (§11.3's retraction) and becomes a consequence of
the angle.

**Light on the diagonal slips through corners, and a rounded corner is what says so.** A diagonal step
only resolves the cell it lands in; the two cells it squeezes past are never consulted. Walls are drawn
with rounded corners, so the gap the beam uses is visible in the glyph — no rules text, which is the P2
discipline rather than a concession to it. It is also the naive implementation: step, resolve where you
landed, never look sideways.

That makes stone conditional for the first time in this family. **A wall no longer guarantees a block** —
it stops orthogonal light and lets diagonal light by at its corner — so a wall can be a decoy, and
blocking a diagonal beam means putting stone where its centre-line actually crosses. `blockWrongSettings`
(§5) has to learn the difference.

#### The geometry, which is provable rather than a hope

Reflection on the direction circle is `out = 2θ − in`. With mirrors at `θ = 22.5·m` and beams at
`in = 45·k`, the outgoing index is `(m − k) mod 8`: another 45° direction, so **the direction set is
closed**, and injective in `k`, so **every face is still a bijection**. By §3's argument loops therefore
stay unreachable — the same conclusion as today, for the same reason, at four times the vocabulary. The
measurement below traced about half a million configurations and found **zero loops**, as it should.

The same algebra says which mirrors a beam can pass, since passing is `out = in`, i.e. `m = 2k`:

- **Aligned orientations** (0°, 45°, 90°, 135° — including today's `/` and `\`) each pass one pair of
  opposite directions. `/` is transparent to a beam running up-right along it.
- **Half-step orientations** (22.5°, 67.5°, 112.5°, 157.5°) pass nothing. They always deflect.

So the two halves are one mechanism: the half-step mirrors make a beam diagonal, and the aligned mirrors
are what a diagonal beam can then run past.

#### Measured, 30 seeds a tier, retrofitted onto today's boards

`cut` is how many of a board's turn mirrors get the finer 8-orientation cut; the rest stay at `/` and `\`.

| Tier    | Reach: none → 1 → 2 cuts | Boards still single-route | Configurations with 2 cuts |
| ------- | ------------------------ | ------------------------- | -------------------------- |
| starter | 15.2 → 27.0 → **31.9**   | 30/30 → 23/30 → 20/30     | 128                        |
| junior  | 19.2 → 29.2 → **33.6**   | 30/30 → 27/30 → 15/30     | 248                        |
| expert  | 21.7 → 32.8 → **39.8**   | 30/30 → 28/30 → 14/30     | 781                        |
| master  | 28.3 → 40.0 → **46.4**   | 30/30 → 25/30 → 12/30     | 1 997                      |
| wizard  | 36.2 → 49.5 → **56.7**   | 30/30 → 21/30 → 12/30     | 10 547                     |

**One cut mirror beats §11.3's retraction applied to every mirror on the board** — 49.5 cells against
48.5 at wizard, 27.0 against 20.2 at starter. That is the whole argument for preferring this: the reach
comes from one piece being able to do more, which is the only kind of knob that does not spend board area.

**It has to be a per-piece property, not a rule about mirrors.** Eight orientations everywhere is ~9.4M
traces at wizard; one cut multiplies the configuration space by 4, two by 16. This is how the family
already works: sliding pieces carry 2–3 stops, not every piece everything.

_An earlier draft of this section said "one or two a board", which is the wizard number stated as if it
were a general rule._ Headroom is a function of how many pieces a board already carries, so it varies by
tier — measured over 30 seeds, taking §5's 20 000 traces as the affordability figure:

| Tier    | Player pieces | Configurations | Cut mirrors that fit |
| ------- | ------------- | -------------- | -------------------- |
| starter | 3.0           | 8              | 5                    |
| junior  | 3.9           | 15             | 5                    |
| expert  | 4.6           | 49             | 4                    |
| master  | 6.1           | 125            | 3                    |
| wizard  | 8.2           | 659            | 2                    |

**The constraint is piece count, not the mechanic** — and it bites backwards. The tiers with room for four
or five cut mirrors are the ones §11.4's cautions say should not have them, and wizard, where the reach is
most wanted, has the least room. Note also that the 20 000 is a figure this doc quotes rather than a
ceiling anything enforces: `eachConfig`'s limit defaults to infinity and no caller passes one, so it is a
wall-clock concern, not a gate.

**Which points at the actual move: a cut mirror should replace a piece, not be added to one.** That is
§11.4's own finding applied to its own cost — the reach comes from one piece doing more, so it should be
spent on doing more with fewer. Drop two ordinary mirrors from a wizard board and cut two of what remains:
659 → 165 → 2 637, a quarter of today's cost carrying the mechanic, with room for a third cut.

**A cleverer uniqueness check is not the unlock, which was worth measuring rather than assuming.** Since
generation knows the route by construction, only pieces the beam can actually stand on can change a path,
so a check that branched only there would face a smaller space. Measured, it recovers 3.1× at wizard (659
→ 213) and moves the affordable count from 2 to 3 — real, but not a dissolution. The reason it is not
bigger: nearly every piece is touched by the beam under _some_ configuration (8.2 of 8.2 at wizard). A
free piece here is usually one the route survives either way, not one the light can never reach, so there
is far less dead weight in the enumeration than the decoy count suggests.

#### What the measurement says to be careful about

- **The diagonal routes are the rare part.** Mean diagonal routes to the shrine run 0.07–0.97 a board:
  most of the new routes the cut creates are still orthogonal. That is the signature of a retrofit — these
  boards put their shrine where an _orthogonal_ route reaches it, so a diagonal leg mostly wanders off.
  **Every number above is a floor**, and the mechanic wants a generator that routes diagonally on purpose
  rather than one that tolerates it.
- **The relative gain is largest at starter (+110%), which is backwards.** The beam can be made to cross
  two thirds of a starter board. The cut is a top-tier piece — a drawn goal or a wizard baseline — not a
  change to what a mirror is.
- **Uniqueness is the bill, again.** Two cuts leave 12/30 wizard boards single-route. Identical in kind to
  §11.3's cost and answered the same way: those second routes are what §11.1's trap needs, so the socket
  restores uniqueness rather than a wall. All three sections are one piece of work.
- **Reach counts cells the beam can be _made_ to cross, not cells on winning routes.** Some of the growth
  is a wider space to wander in. That is the same measure §11.3 used, so the comparison holds, but it is
  not a count of good moves.

#### Prototype the drawing first, again

§11.2 learned this the hard way and the order should be the same here. Three things to draw before any
logic: the **rounded wall corner** (which must not ship before the mechanic, or it promises a gap that is
not there), a **diagonal beam through a corner**, and a **wire crossing one**.

_An earlier draft of this section called diagonal beams a direct collision with the wire's lane. That was
wrong._ Wires run corner-to-corner **along cell boundaries**; a diagonal beam runs corner-to-corner
**through cell interiors**. Between the same two corners those are different paths, sharing only the
corner points — so a diagonal beam crosses a wire transversally at 45°, which is exactly the property
§11.2's rule 1 exists to guarantee. The open question is narrower than a broken rule: whether coincident
_points_ at corners read cleanly at 35px, and whether eight mirror orientations are tellable apart at all
at that size. The second is the likelier killer.

### 11.5 Parity, and how two cut mirrors turn back into a worklist

**A cut mirror is countable, and that is a failure mode.** Half-step orientations flip the beam between
square and diagonal; aligned ones preserve it. Checked over all 64 (orientation, direction) pairs:
`parity(out) = parity(m) XOR parity(in)`, so the four half-step orientations `{1,3,5,7}` flip and the four
aligned `{0,2,4,6}` do not. The beam leaves the disc square, so **the number of half-step crossings is
fixed by how the shrine can be entered** — even for a square-only shrine, odd for a diagonal-only one.

Put two cut mirrors on a board whose shrine can only be entered square and the player never has to look at
the board: two mirrors, an even count needed, so both are half-step — one to leave the square, one to come
back. Their roles are settled by counting. That is §11.1's checklist socket in a new costume, and it is
the same objection: **a reason without a decision is bookkeeping.**

#### It is crossings, not mirrors — so one can do both

The invariant counts times the beam crosses a half-step mirror, not how many exist. One cut mirror crossed
twice flips parity twice, and the count then tells the player nothing. Verified, on a 7×7:

```
 . . . . . . .     S  disc at (3,0), facing right
 . . . . - . .     C  the one cut mirror, m=1 (22.5°)
 . . . x . x .     -  aligned mirror, m=0     |  aligned, m=4
 S + C . . . |     x  the beam travelling diagonally
 . . + x . x .     +  the beam travelling square
 . . + . - . .     X  shrine at (6,2)
 . . X . . . .
```

The trace: right into `C`, which sends it **up-right**; a diamond of three aligned mirrors at (1,4), (3,6)
and (5,4) carries the diagonal round; it comes back into `C` travelling **up-left**, and leaves
**downward** to the shrine. One cut mirror, both flips, and the excursion is exactly the route-folding
`crossedBeams` already asks for.

**The obvious version of this does not work, and the algebra says why.** If the beam simply retraces —
goes out along a diagonal and is reversed straight back down it — then re-entering on the opposite
direction gives `exit = m - (d + 4)`, which reduces to the opposite of the original entry. The light goes
back the way it came, into the disc, every time. A search over three million boards found double-crossings
easily and **every retracing one was absorbed by the disc**. The excursion has to return on a _different_
diagonal, which costs two or three aligned mirrors — so one cut mirror instead of two is real, but it is
not free.

#### The rule that follows

**Never let the count of cut mirrors determine the number of half-step crossings.** At least one of these
has to hold on any board carrying more than one:

- a cut mirror set to one of its four **aligned** orientations in the solution, so it is serving as an
  ordinary mirror and `n` cuts no longer means `n` flips;
- a **double crossing**, as above;
- a shrine that can be entered **either way**, so arrival parity pins nothing.

#### The same invariant, used well, is a rung the ladder has never had

Every technique in §4 is local — this cell, that setting. Parity is **global**: it counts over the whole
route without looking at any square. That is worth having precisely when it _constrains without deciding_,
which is the line between a deduction and a worklist. With three cut mirrors and a square-only shrine it
reads: _"an even number of these are making a diagonal, so at least one of the three is not"_ — which
narrows the board and still leaves the player to find out which. With two it reads: _"both of them"_, and
there is nothing left to find out.

### 11.6 The rule this breaks, and the choice that follows

**§9 already says: "Both mirror orientations read as visibly different objects, not a subtle rotation, at
44px."** Eight orientations at 22.5° steps are, by construction, subtle rotations of one another. So
§11.4 as written does not merely carry a drawing _risk_ — it contradicts a board requirement this family
already holds itself to and already ships against. That has to be resolved before any of it is built.

There is a resolution, and it costs something. **Give a cut mirror four states — `m ∈ {1,3,5,7}` — rather
than eight.** Then:

- **Its own states are 45° apart**, the same visual separation as `/` versus `\`, which is the
  discrimination the board already passes at 36px.
- **It never shares an angle with an ordinary mirror** (which is 45° or 135°), so the two are always
  22.5° apart — near enough that _type_ must be carried by the glyph rather than the angle. A cut mirror
  wants to be drawn as a different object, not a rotated one.
- **It is cheaper.** Four states against two is a 2× multiplier per piece, not 4×, so under the same
  20 000 traces wizard affords **four** cut mirrors rather than two, and master seven.

**The cost is that it always flips parity**, because every one of `{1,3,5,7}` is a half-step. A four-state
cut mirror can no longer be quietly used as an ordinary mirror, which was the first and cheapest of
§11.5's three ways of stopping the count from giving the answer away. The other two still stand — a double
crossing, or a shrine that can be entered either way — and they are now doing all the work.

So the two horns, and they are a genuine choice rather than a technicality:

|                   | Eight states                               | Four states                |
| ----------------- | ------------------------------------------ | -------------------------- |
| Reads at 36px     | **No** — breaks §9                         | Yes, at today's separation |
| Countable (§11.5) | Harder — four aligned states hide the role | **Yes** — always flips     |
| Cost per piece    | 4×                                         | 2×                         |
| Wizard affords    | 2                                          | 4                          |

**Four states is the better trade, and it should be decided before anything is drawn**, because it is the
difference between prototyping a piece with eight rotations and one with four. It also means the drawing
prototype's job is much narrower: show that a four-state cut mirror is a visibly different _object_ from
a two-state one, and that its four angles separate at 36px.

#### Straight and diagonal angles alone cannot make a diagonal beam

Worth stating plainly, because it is the obvious thing to reach for and it is foreclosed. Mirrors at
`0°`, `45°`, `90°` and `135°` are exactly the **even** orientations, and even orientations preserve
parity (§11.5). Closing the direction set under all four of them and starting from `right` yields
`right, up, left, down` and nothing else — checked, not argued. **A mirror at an odd multiple of 22.5° is
the only thing that puts light on the diagonal**, so the clean angles and the diagonal beam cannot both be
had. (The one alternative is a disc that _emits_ diagonally: the beam then runs entirely on the diagonal
with clean 45° mirrors throughout, and every wall is corner-slippable. That is a different board rather
than a mixed one, and it is worth a look on its own.)

#### Better: separate the angle step from the rotation range

This supersedes the four-state recommendation above. **The step and the range are independent knobs**, and
once they are pulled apart, the cut mirror stops being expensive or awkward:

**A cut mirror takes the 22.5° step but only two states, like every other mirror on the board.** The pair
to use is `{22.5°, 157.5°}`. For a beam arriving travelling right it offers **up-right or down-right** —
precisely the shape of today's `/` `\` fork, which offers up or down. Both turns carry the light onward;
no state is wasted on sending it back where it came from.

Three things fall out, and the first is the big one:

- **It costs nothing.** Two states is a 1× multiplier — a cut mirror is exactly as expensive as an
  ordinary one. The affordability table above and the 5/5/4/3/2 headroom in §11.4 **stop applying**: a
  board can carry as many cut mirrors as `piecesAreSpaced` allows. The question "how many can we afford"
  simply goes away.
- **It is the same control.** Two taps to cycle, like every other mirror. Nothing new to learn.
- **Parity feeds the family's own skill instead of being a worklist.** Both states are half-steps, so a
  cut mirror flips whenever the beam crosses it. §11.5's count then reads _"an even number of cut mirrors
  are on the route"_ — and working out **which pieces the light actually reaches** is T6 `neverReached`,
  the one technique this family calls its own (§4.2). The global constraint now hands work to the best
  rung on the ladder rather than answering the board.

**What it costs is legibility margin, and that is what the prototype must now test.** The two states are
45° apart as lines, against 90° for `/` versus `\` — a shallow-rising line against a shallow-falling one.
They are mirror images across the horizontal, so they are a genuine pair rather than a subtle rotation,
but the margin is half of what §9 currently passes at. The 90°-separated alternatives (`{22.5°, 112.5°}`
and `{67.5°, 157.5°}`) buy that margin back and spend a state doing it: one of their two turns sends the
light backwards, which on most boards is dead.

So the prototype's job is now one question rather than several: **at 36px, does a shallow `/` read as a
different object from a steep `/`, and do the two states of a cut mirror read as a pair?**

#### What the state set has to contain — and why two states is worse than useless

The two-state recommendation above is wrong, and measuring it is what showed why. Reach and routes for a
board with one mirror converted, 30 seeds a tier, wizard shown:

| State set                        | Keeps `/` and `\` | Reach (today 36.2) | Routes to the shrine |
| -------------------------------- | ----------------- | ------------------ | -------------------- |
| `{22.5°, 157.5°}`                | **no**            | **10.4**           | **0.07**             |
| `{22.5°, 67.5°, 112.5°, 157.5°}` | **no**            | 15.7               | 0.20                 |
| all eight                        | yes               | **49.5**           | 1.37                 |

**A half-step-only mirror does not add the diagonal, it removes the quarter turn.** Every other piece on
the board, and the route the generator built, depend on that cell being able to turn light 90°. Take it
away and the beam deflects 45° and wanders off the board: reach collapses to under a third of today's, and
almost no board lights at all. Four half-steps are barely better than two. Only the eight-state set works,
and it works for one reason — **it contains `/` and `\`**. The axis was never how many states; it is
whether the aligned pair survives.

That makes the legibility problem structural rather than a matter of degree. Half-step orientations
interleave the aligned ones, so **every** half-step sits exactly 22.5° from an aligned one. Any state set
that keeps the quarter turn _and_ reaches the diagonal therefore contains a 22.5° pair, which is precisely
what §9 calls a subtle rotation. No choice of count escapes it.

#### Which points at two pieces rather than one

The way out is not a mirror with more states but **a second piece type**, told apart by its glyph the way
a sliding mirror is already told apart from a turning one:

- **Turn mirror** — `{45°, 135°}`, as today. Does the quarter turns the board is built on.
- **Cut mirror** — `{22.5°, 157.5°}`, a different object. Its whole job is to put light on the diagonal
  and take it off again.

Each is internally legible — 90° and 45° separation respectively, both clear of a subtle rotation — and
the two are distinguished by being different things, not by angle. Cost stays at 1× per piece, and the
parity reading of §11.5 gets sharper: a cut mirror is now visibly the piece that flips, so _"an even
number of cut mirrors are on the route"_ is something the player can see rather than infer.

**This is not what the table above measured, and that limit matters.** Those numbers come from
_converting_ an existing mirror, which is why they look so bad — the route lost its quarter turn and got
nothing usable back. A cut mirror **added** as its own piece, placed where a 45° deflection is actually
wanted, is a different proposition and is untested. Testing it needs a generator that routes diagonally on
purpose (§11.4), so this is the point at which the measuring stops paying and the generator has to be
built.

### 11.7 The mirror as a node with authored stops

**§11.6's conclusion was wrong, and this is the correction.** It claimed that any state set keeping the
quarter turn _and_ reaching the diagonal must contain a 22.5° pair, so the legibility problem was
structural and no choice of count escaped it. The reasoning was that every half-step sits 22.5° from an
aligned orientation — which is true, and does not follow, because **the adjacent aligned orientation need
not be in the set**. Checked over all 28 pairs, two sets clear every test at once:

| Stops                   | Angles          | Separation | Turns offered to a beam arriving rightward |
| ----------------------- | --------------- | ---------- | ------------------------------------------ |
| `{22.5°, 135°}`         | half-step + `\` | **67.5°**  | up-right **or** down                       |
| `{45°, 157.5°}`         | `/` + half-step | **67.5°**  | up **or** down-right                       |
| _today's_ `{45°, 135°}` | `/` + `\`       | 90°        | up or down                                 |

Each keeps a quarter turn, so it does not strip the board of the capability its route was built on — the
failure that made every half-step-only set collapse — and each reaches the diagonal. 67.5° apart is well
clear of a subtle rotation. **Two stops, so the cost stays 1×.**

#### The idiom already exists, one axis over

This is not a new concept for the family, it is an existing one applied to the other degree of freedom.
§2's table already reads:

> **Sliding mirror** — _fixed angle, tap cycles between **authored stops**_

So the symmetric piece is a **turn mirror with authored _angle_ stops** rather than a fixed pair. Same
authoring, same two-or-three stops, same cost, and the same drawing convention. A mirror stops being a
physical object with a free rotation and becomes **a node offering the light a small authored set of
directions**, drawn as a rotation.

That is worth more than the diagonal it was reached for:

- **Branching becomes a per-piece dial**, which is exactly §6.3's "forks met on a wrong branch" — the
  measure difficulty actually runs on. It can now be authored rather than hoped for.
- **Per-piece variety dissolves the counting problem.** §11.5's worklist existed because a uniform class
  of cut mirror could be counted. With each mirror carrying its own stop set, some flipping parity and
  some not, there is no class to count and nothing to infer from the tally.
- **Three stops do not fit forward-only** — no three orientations are both pairwise 45° apart and all
  carrying the light onward. A third stop is therefore always a _visibly_ bad turn, which is a corridor
  seen from the door: cheap, and legitimately what a starter board wants (§6.3 puts starter at 33%).

#### Rotation is discovered; only position has to be drawn

_This section first said the opposite — that a piece's stops must be drawn, never discovered, with a
mirror's angles shown as ghost lines. That is wrong, and it contradicts what already ships._
`LightbeamBoard.tsx` puts it plainly: **`track` is false for a turn mirror, which has one cell and goes
nowhere.** Tracks and ghost stops are drawn for sliding pieces only. Today's turn mirror is already
learned by tapping it.

The distinction the code makes is the right one, and it is about **occupied space**:

- **A sliding piece's stops are facts about the board.** Each is a cell that might be blocked, and every
  other route calculation depends on knowing which. Hide them and the board stops being readable at all.
- **A rotation happens in a cell that is occupied either way.** Nothing outside that square changes.
  Only the deflection does, and the beam redraws the instant it is tapped.

**So discovery here is not the trial §4 rules out.** That prohibition is against _solving_ by flipping
things until the shrine lights. Handling a piece to learn what it offers is a different act, and a cheap
one: taps cost nothing (difficulty in this family is not move count, §6), cycling is reversible, the
whole repertoire is seen in as many taps as it has stops, and the beam shows every consequence in full
because it is always drawn. Reading a piece by turning it **is** reading the board.

One thing is probably still worth showing without showing the angles: **how many stops a piece has**,
since T4 and T7 both reason over its full set and a third stop nobody found is a rung that silently
cannot fire. The movable ring drawn in as many segments as the piece has stops says "there are three of
these" without saying what they are. Cheap, and worth a playtest rather than a rule.

#### Rotating out of the way — the sliding wall's verb, in one cell

A stop that is edge-on to the beam lets it pass (`m = 2k`, §11.4). So a rotation can do what only a slide
could do before: **clear the path without going anywhere.** For a beam arriving rightward, and keeping
every stop at least 45° from its neighbours:

| Stops             | Angles      | What the taps do                              |
| ----------------- | ----------- | --------------------------------------------- |
| `{0°, 45°}`       | `—` `/`     | passes through, or turns it up                |
| `{0°, 135°}`      | `—` `\`     | passes through, or turns it down              |
| `{0°, 45°, 135°}` | `—` `/` `\` | passes through, turns it up, or turns it down |

_This also corrects the claim above that three stops never fit._ They do not fit when all three must
**turn** the light; they fit easily once "let it through" counts as one of the three, which is exactly
what this piece adds.

**Why it is worth more than it looks: cells are this family's scarce resource.** §9's spacing rule is a
generation gate, and it is what buys the wider grid. A sliding wall spends two or three cells to ask "in
the way, or out of it". A rotating mirror asks the same question in **one**, and answers a second one —
"and if it is in the way, which way does it send the light?" — with the same tap. That is the
more-without-more-room lever §11.4 went looking for, found in a piece that needs no new geometry at all.

**The honest cost is that such a stop is direction-dependent.** A horizontal mirror passes a beam
travelling right and turns one travelling up back down — the same stop, two behaviours, depending on how
the light arrives. That is a real dent in the locality §4.1 prizes: "can the light get through here" stops
being answerable from the cell alone. It is also precisely the _understand-the-machine_ character that
made switch nodes worth building, and the beam being drawn at all times is what keeps it learnable. It
belongs at the top tiers, as suggested — not in the bottom two.

#### What authoring the wrong turn actually buys

With two fixed faces a mirror's wrong setting is whatever geometry hands you. With authored stops the
generator **picks** it, so it can choose one that dies late and past other pieces rather than one that
flies straight off the board. Measured over 40 seeds a tier — for every player-owned mirror, today's wrong
face against the best alternative any legible stop could offer (at least 45° off the solution's own
angle):

| Tier    | Legs today → best | Forks today → best | Mirrors with a deeper option |
| ------- | ----------------- | ------------------ | ---------------------------- |
| starter | 2.98 → **4.21**   | 0.75 → 0.79        | 4%                           |
| junior  | 3.61 → **5.40**   | 1.47 → 1.53        | 6%                           |
| expert  | 3.78 → **5.58**   | 1.62 → 1.76        | 13%                          |
| master  | 4.34 → **6.26**   | 2.13 → 2.34        | 17%                          |
| wizard  | 5.42 → **7.67**   | 2.66 → **3.05**    | 30%                          |

**It buys length reliably and branching barely.** A wrong turn runs 40–50% further before it dies, at
every tier. Forks move 4–15%, and on most mirrors the geometry already offers the best fork count
available — only 4% of starter mirrors and 30% of wizard ones have a strictly deeper alternative.

**That distinction matters, because the two are not the same currency.** §6.3's maze reading named both:
_"only after 3 turns you can decide it's a dead end"_ is legs, and _"maybe you even then found forks you
need to try"_ is forks. But only forks block T3 — its clause is "with **no unsettled piece** left on the
way", so a branch running seven legs into a wall with nothing standing on it is still dismissed in one
step. Legs are the work of tracing; forks are the work of thinking.

So the honest reading: **authored angles are a strong lever on how far you must follow a wrong turn, and a
weak one on how much you must weigh while following it.** Both are worth having — a board whose wrong
branches take four legs to close is meaningfully less transparent than one where they take two — but
authoring angles alone will **not** fix the junior/expert collapse §6.3 found. Their fork counts barely
separate even at their best (1.53 against 1.76). Closing that gap needs **placement** to cooperate:
pieces standing where wrong rays actually go. That is `buildPieces`, not the angle set.

Two things in favour anyway. The lever **grows with tier** — 4% to 30% of mirrors having a deeper option —
which is the right direction, since it is most available exactly where it is most wanted. And the two
levers compound: an authored angle that sends a wrong ray somewhere, and a piece placed where that ray now
goes, are the same generation pass.

_Caveat on the table: it is an upper bound._ Each alternative was checked only for still failing to light
the shrine. Swapping a mirror's wrong stop changes the puzzle, and the board would have to be re-proved
unique and deducible afterwards — so these are what selection could reach for, not what it would keep.

### 11.8 The decided design, in one place

Everything above this line is how it was reached. This is what to build.

**1. A mirror is a node with authored rotation stops.** Two or three stops per piece, authored by the
generator, drawn as a rotation. Not a free rotation, and not the same set on every piece — the variety is
the point (§11.7).

**2. A stop set must keep a quarter turn.** This is the hard constraint, and the one that killed three
earlier drafts: every other piece and the route itself depend on that cell being able to turn light 90°.
Half-step-only sets strip it and collapse reach to under a third of today's, lighting almost no board. The
two sets that keep a quarter turn, reach the diagonal, and stay legible at 67.5° apart:

| Stops           | Turns offered to a beam arriving rightward |
| --------------- | ------------------------------------------ |
| `{22.5°, 135°}` | up-right, or down                          |
| `{45°, 157.5°}` | up, or down-right                          |

**3. A stop edge-on to the beam passes it**, which is the sliding wall's "get out of the way" verb in one
cell instead of three — and cells are this family's scarce resource. `{0°, 45°}`, `{0°, 135°}`, or
`{0°, 45°, 135°}`. Direction-dependent, so top tiers only.

**4. Diagonal light slips through corners.** A diagonal step resolves only the cell it lands in, never the
two it squeezes past; walls are drawn with rounded corners so the gap is visible. No rules text — and it
is also the naive implementation.

**5. ~~Stops are discovered by tapping, not drawn.~~** ~~Only _position_ has to be drawn, because a sliding
piece's stops are facts about which cells might be blocked. A rotation happens in a cell occupied either
way. The stop **count** is probably worth showing (a ring in as many segments) since T4 and T7 reason over
the full set — playtest it rather than ruling it.~~

**Overturned, and playtesting it is what overturned it** (§11.13). Both halves were wrong. The ring in as
many segments is _unbuildable_ — a mirror is a line across the whole cell, so it runs through the annulus
and occludes the marks that annotate it. And the count was the wrong thing to want: a short tick at each
stop the piece is **not** in draws the stops **themselves**, inside one cell, which is the comparison §11.9
concluded there was nowhere to make. So a rotation mirror's stops **are** drawn, and a fork is read rather
than probed — which is the difference §4 draws between deduction and trial, now on the deduction side. What
stays true is the half about _sliding_ pieces: their stops are cells, and the cells are already drawn.

**6. Geometry, settled and provable.** Directions are the 8 multiples of 45°; a mirror at orientation
`m` (22.5°·m) sends a beam travelling `k` out along `(m − k) mod 8`. Every face is a bijection, so **loops
stay unreachable** by §3's argument — half a million traced configurations, zero loops. Half-step
orientations flip square↔diagonal; aligned ones do not.

**7. Parity is a constraint to manage, not a feature.** Because the beam leaves the disc square, the number
of half-step crossings is fixed by how the shrine can be entered — so a uniform class of half-step piece
can be _counted_, which answers the board instead of asking it. Per-piece stop variety dissolves this: with
some pieces flipping and some not, there is no class to count. Never let a tally give the answer away.

**8. Cost is per-piece and small.** Two stops is 1×, three is 1.5×. Spend it by **swapping a cut mirror in
for an ordinary one**, not by adding a piece — the reach comes from one piece doing more.

**9. Where it goes.** Master, per §6.4's vocabulary ladder, where shadows currently hold the slot.

**10. Build in this order, and not another.**

1. **The drawing, at 36px, before any logic.** Two stops of one piece must read as a pair, and a shallow
   `/` must read as a different object from a steep one. §9 forbids "a subtle rotation", and §11.2's
   precedent is that the drawing is what kills this kind of thing, not the reasoning. — **done, §11.9.**
2. **The walk** — 8 directions, diagonal steps resolving one cell. — **done, §11.10.**
3. **`blockWrongSettings`** — ~~it has to learn that a wall no longer stops diagonal light at its corner, so
   stone is conditional for the first time.~~ **That reason is wrong** (§11.11): stone stays unconditional,
   what has to change is the _ray_ — a wrong setting is read off the piece's stop set — and what the piece
   costs is `exitRun` rather than stone.
4. **The generator**, routing diagonally on purpose. Every reach number in §11.4 is a retrofit floor.
   — **done, §11.12**, and it is where the mechanic reaches a player: master and wizard route diagonally.
5. **One mirror type, and the list authored per piece** — rule 1's own promise, which steps 1–4 have not
   kept: the generator ships `[45°, 135°]` on 921 of 961 mirrors and every list is two stops long. The
   drawing goes first again, because the fill that tells a cut mirror from an ordinary one only works while
   lists come in two flavours, and rule 1 asks for many. — **its drawing is gated, §11.13**, and the answer
   is a tick at each stop the piece is not in, which is also the first thing in the family that would let a
   player read a fork without tapping it (so it owes rule 5 an argument). The generator and the measurement
   come before traps. Its drawing is one mirror glyph with a tangential tick at each stop the piece is not
   in, and **rule 5 is overturned by it** — rule 5's own text says so.
6. **Traps** (§11.1), which need the second routes this supplies.

**Three things paper cannot settle, and they were the whole remaining risk — all three are now closed:**
~~whether the stops read at 36px~~ (settled — §11.9), ~~what the generator's yield is once uniqueness has
more to reject~~ (settled — §11.11 for the swap-in, §11.12 for a route that actually bends diagonally:
40/40 boards on every tier either way, and master's worst board got nearly four times _faster_ to build),
and ~~whether the ladder still _deduces_~~ (settled — §11.12: every master and wizard board settles inside
its own cap, and what it costs is a rung rather than a guess).

**One rule reads more narrowly than it should, and §11.12 is the correction.** Rule 2 lists two stop sets;
they are the rightward slice of **one** fact, which is that a half-step angle has exactly one partner
keeping a quarter turn — the diagonal three eighth-turns away. Over the four half-steps that is four pairs
(§11.11), and `cutStops` derives them rather than tabulating them.

### 11.9 What the drawing found, at 36px

Step 1, run before a line of the walk was written. Both questions pass, so the mechanic survives its
gate — but not on the terms the reasoning above assumed.

**The angle was never going to carry it, and 67.5° was never the problem.** The two questions look alike
and are not:

| Question                                           | Separation | Verdict                                           |
| -------------------------------------------------- | ---------- | ------------------------------------------------- |
| Do the two stops of one cut mirror read as a pair? | 67.5°      | **Yes**, comfortably — 90° was never load-bearing |
| Does a cut mirror read as a different _object_?    | 22.5°      | **Not from the angle. Never could.**              |

Two thirds of a right angle is plenty: the shallow stop lies along the row and the steep one across it,
and neither can be squinted into the other. What 67.5° actually costs is not legibility but the _feel_ of
the turn — an ordinary mirror snaps between two diagonals, a cut mirror lands between them, and that is a
tell that it is a different kind of piece before its glyph is read at all.

**So the glyph carries the whole of the second question, and the split that works is not a shape but a
_fill_.** — **and the second question turned out not to be a question** (§11.13): a fill answers "is this
piece unusual", which is only worth asking while the answer is otherwise hidden. Drawing the stops
themselves answers "where can it point", which is what a player actually needs, and the fill is gone. What
survives from this section is question 1 and everything below it about motion; the paragraphs on solid
against hollow are the record of a step, not the current drawing. An ordinary mirror is the polished **edge** — one solid stroke. A cut mirror is the **plate** —
an outline, two silvered faces, cut ends. Solid against hollow is a judgement the eye makes on **one
cell**, with no second cell to compare against, and that is what reading a board consists of. Every
candidate that differed by degree instead — a thicker bar, a longer one, a tapered one — reads fine in a
row of eight and stops reading the moment there is only one of them on the board.

Two candidates were rejected for reasons worth keeping:

- **A bar with a notch cut out of the middle** — the literal reading of "cut" — draws as a dashed line at
  36px, and dashed is already the wire's word (§9). It would have read as a second wire.
- **Two parallel strokes** passes both questions and was the runner-up, but it can read as two thin
  mirrors in one cell, which is a thing this family will eventually want to mean something else.

**One thing survived that was not designed for.** The beam crosses a mirror through the cell centre —
which is exactly the plate's hollow — so the fill that answers question 2 is drawn straight through by
the thing the board is about. It survives because the beam is amber and the plate is sky: §9's "nothing
but light is drawn amber" paying out for a case it was not written for.

**And one thing the drawing nearly got wrong, which only motion would have caught.** A mirror line is the
same line half a turn later, so every stop has two representative angles, and which one is drawn decides
which way the piece appears to turn. Generalising the glyph from two faces to any angle silently reversed
the ordinary mirror's quarter turn — identical in every still frame, backwards in the hand. Folding the
drawn angle into (−90°, 90°] fixes both that and the new case: `/`→`\` is the clockwise quarter turn it
always was, and a cut mirror swings 67.5° rather than 112.5° the other way. The window is not minimal for
angles in general — it is for every stop set §11.8 allows, which is what it has to be.

### 11.10 What the walk found

Step 2: eight directions, and a mirror that actually reflects off the stop it is drawn at. It went in
smaller than the estimate — four source files, and no new case anywhere in the walk — and it overturned
two things written above.

**The mirror stopped being two facts and became one number.** `Direction` is now an index into the eight
multiples of 45°, as the handoff into this step recommended, and rule 6's law is written the way rule 6
writes it: `reflect(angle, travel) = (angle - travel) mod 8`. Taking the index is what made the rest
collapse — but the bigger simplification was not planned. A mirror used to carry a `MirrorFace` (`"/"` or
`"\\"`) and, since §11.9, an optional stop beside it; once the walk reflects off the stop, the face is read
by nothing. Two arrays that must be authored in step, where only one is ever consulted, is a bug waiting
to be typed, so the face is gone. **One number says what a mirror does, and the walk, the drawing and the
deduction all read that one number.**

Three things then fall out of the arithmetic instead of having to be built:

| §11.8 rule                                      | What the subtraction gives                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| 6 — half-steps flip square↔diagonal             | An even angle preserves `travel`'s parity, an odd one flips it. Nothing to write. |
| 3 — a stop edge-on to the beam passes it        | A mirror lies along the beam when `angle` is `2·travel`, and `2t − t = t`.        |
| the backward walk reuses the forward reflection | `angle - (angle - travel)` is `travel` at every angle, not just the diagonals.    |

**Rule 4 cost nothing, in the walk or in the drawing.** A diagonal step resolving only the cell it lands
in is what `stepCell` already does, so the implementation is the absence of one. And the wall glyph did
not need redrawing: its rounded corners plus the cell's 8% inset already leave a gap that a diagonal beam
visibly passes between at 35.3px a cell (`DiagonalBeam`, left frame — stone hugs the run in three places,
two cells at a time).

**Rule 6's loop claim is right, and §3 had already worked out why — but the code had not caught up.** §3
corrects itself on exactly this point: the condition is injectivity, not turn size. `walkForward` and
`beam.spec.ts` were still saying the guard would earn its keep "the moment a piece bends light by anything
other than a quarter turn", with the deferred prism as the example. The cut mirror is a piece that bends
light by 67.5°, and it changed nothing — `reflect` is a **bijection in the direction** at every angle, so
`(cell, direction)` has one predecessor, the disc's first state has none, and a beam from the disc walks a
path. Step 2 is what forced those two comments into line with the doc. What eight directions do add is
**retroreflection** — `angle - travel === travel + 4`, a beam meeting a mirror square on its back — and the
beam simply retraces its own line to the disc and is absorbed, because the return trip carries a different
direction and so a different key. The guard stays a guard; it still catches a beam bouncing between two
retroreflectors, started between them.

**The one place eight directions would have quietly weakened every board in the family.** `exitRun` tries
each direction the shrine could be lit from and fires when exactly one survives; over eight candidates
instead of four it would fire far less often, because a diagonal backward walk that runs into an unsettled
piece comes back `unknown` rather than dead. The fix is exact rather than a fudge: a beam's parity can only
change at a half-step, so **a board with nothing off the diagonals is still a four-direction board**, and
`travelledDirections` reads that off the pieces rather than off a flag. Measured: all 200 boards the
generator makes across the five tiers are byte-identical before and after this step, so the eight-direction
walk is behaviour-neutral on everything that ships today.

**The wire question the handoff flagged, answered — and it is structural, not luck.** §11.2 rule 1 keeps
wires out of the beam's lane by giving the beam cell centres and edge midpoints and the wire the grid
lines; a diagonal beam turns at cell **corners**, which are on the wire's side of that line, and rivets are
drawn at corners too. So the endpoints coincide, and often: over 40 generated wizard boards with every
mirror cut, **104 lit configurations put a beam corner exactly on a rivet**, on 2 of the 40 boards. It does
not read as the beam joining the wire, and the reason is worth keeping: **a beam polyline bends only at
cell centres**, so a corner point is always mid-line — the beam crosses the rivet and cannot appear to
terminate on it. The one case that could is the escape marker, which for a diagonal exit is drawn at a
corner; no board generates one yet.

**And the two prototype frames stopped demonstrating the mechanic, exactly as expected.** `CutMirrorStops`
and `CutMirrorDensity` retrofit cut mirrors onto generated boards, and step 1 relied on those boards still
tracing honestly because an aligned stop reflects as the face beside it did. They still trace — but every
cut mirror on their winning routes happens to sit at an aligned stop, so the frames now show **no diagonal
light at all**. They are kept for the drawing question they answer, which still has to hold; the diagonal
is shown by `DiagonalBeam`, whose two hand-authored frames are the mechanic at shipping size and whose
third was found by the search above.

### 11.11 What the wrong ray found

Step 3: `blockWrongSettings`, and the rays it is given to close. Rule 10's one-line reason for this step
does not survive, and the thing that replaces it is not a wall at all.

**Stone never became conditional.** A wall absorbs anything that _lands_ in it, diagonal included, and
`blockWrongSettings` walls exactly the cell the wrong ray lands in first — so the part of stone that is
unconditional was never touched. §11.4's claim is true of a _barrier built of separate walls_: stone no
longer seals a corner, so two walls no longer close a diagonal between them. Nothing in the generator
builds a barrier that way, so nothing had to learn it.

**What was concretely broken was the ray.** The wrong setting's direction was built as _the other
diagonal_ — `reflect(angle === SLASH ? BACKSLASH : SLASH, enter)` — and that fails twice over on a cut
mirror, silently both times: the ray points along a turn the piece cannot make, so stone lands in a cell
the light never visits; and a three-stop piece (rule 3) is wrong in two ways while the count stays at one.
Both go away by reading the piece's own stop set: **one ray per stop that is not the answer.**

#### Measured, 40 seeds a tier, one cut mirror swapped in for an ordinary one

Rule 8's swap, with the route left square: the stop set keeps the bend's quarter turn, so what the piece
adds is a _wrong_ setting that throws the light off at 67.5°. That is the only way to put a diagonal ray in
front of `blockWrongSettings` before the generator routes diagonally, and it is a dial of its own: no tier
draws it, so the piece stays out of §6.4's vocabulary ladder until rule 9's slot is actually spent.

| tier    | boards built | attempts a board, 0 → 1 → 2 cut | fixed walls a board, 0 → 1 cut | `exitRun` used, 0 → 1 cut |
| ------- | ------------ | ------------------------------- | ------------------------------ | ------------------------- |
| starter | 40/40        | 2.25 → 2.25 → 2.25              | 0.00 → 0.03                    | 40 → 40                   |
| junior  | 40/40        | 4.03 → 3.95 → 3.75              | 0.00 → 0.10                    | 40 → 40                   |
| expert  | 40/40        | 71 → 87 → 92                    | 0.05 → 0.17                    | 39 → 32                   |
| master  | 40/40        | 144 → 138 → 152                 | 0.23 → 0.13                    | 34 → 19                   |
| wizard  | 40/40        | 112 → 130 → 173                 | 0.10 → 0.23                    | 26 → 12                   |

**A diagonal wrong ray needs less stone, not more, and the reason is the frame.** `stepsToEdge` takes the
minimum over both axes, so a ray leaving at 45° meets the frame in far fewer steps than one running along a
row — of 200 wrong rays with a cut mirror on the bend, the first cell is off the board outright 37 times,
and the walls the rest need are the same fraction of a wall a board carried before. The cost §11.4 expected
here is not there.

**Yield does not collapse either.** Every seed on every tier still builds, with one cut mirror or two, and
the rejection this step can force — a wrong ray whose first cell is on the route, where no wall may go —
rises from 19 drafts in 86 to 26 in 101 at expert, and 13 in 69 to 18 in 72 at wizard. So rule 8's swap is
affordable at **every** tier rather than only the one rule 9 assigns it to.

#### The cost is a rung, it is board-wide, and one piece is enough to trigger it

`exitRun` is what pays. `travelledDirections` opens all eight directions as soon as a single half-step stop
exists **anywhere on the board**, and a diagonal backward walk that meets an unsettled piece comes back
`unknown` rather than dead — so "exactly one survives" fails far more often. Measured on fresh boards, over
the four square directions against all eight:

| tier    | fires over four | fires over eight |
| ------- | --------------- | ---------------- |
| starter | 40/40           | 28/40            |
| junior  | 40/40           | 35/40            |
| expert  | 30/40           | 13/40            |
| master  | 33/40           | 13/40            |
| wizard  | 23/40           | 5/40             |

That is §11.10's warning arriving as a bill rather than a hypothetical, and it inverts how this piece should
be described. **A cut mirror does not add a piece's worth of work; it takes away the board's best-explained
rung and hands the work to the exhaustive pair** — `onlySurvivor` goes from 10 of 40 master boards to 25,
and 27 of 40 wizard boards to 32. For rule 9's slot that is roughly the trade master wants, but it is a
change of character rather than an addition, and what it spends is the family's clearest sentence: _the
shrine can only be lit from there._

The lever, if step 4 wants it narrowed, is **§11.5's parity counting**, and it is the one place that
argument becomes useful rather than dangerous: the shrine can only be entered on a parity the route's
half-step crossings allow, and `travelledDirections` currently reads nothing finer than "is there a
half-step anywhere on this board".

#### The ladder does deduce on a board with a cut mirror on its route

§11.8's second named risk, closed for the swap-in. The smallest case settles on `deadEnd` with the frame
doing the walling; a three-stop `{0°, 45°, 135°}` piece has both its wrong settings ruled out for
_different_ reasons, one in stone and one at the frame, which is the two-ray case as a sentence a player
can hear; and every generated board in the tables above settles inside its own tier's cap, since generation
gates on exactly that.

#### Two things the rules above say less precisely than they should

- **Rule 3's "edge-on" stop is direction-dependent in a stronger sense than the rule states.** The angle
  that lies along the beam is `2·travel`, so `{0°, 45°}` is written for a beam arriving along the row. Put a
  flat stop in front of a beam arriving down the column and it does not pass — it **retroreflects**, sending
  the wrong ray back up the route it came from, where every cell is the route's own and no wall may go, so
  the draft is thrown away. A rule 3 set has to be built from the bend's arrival direction.
- **Rule 2's table is the rightward slice of one rule.** Keep the bend's quarter turn, add the half-step
  67.5° off it leaning the other way, and a rightward beam gives exactly that table's two rows; over the
  four arrival directions it gives four pairs — `{22.5°, 135°}`, `{45°, 157.5°}`, `{67.5°, 135°}` and
  `{45°, 112.5°}`. Derived rather than tabulated, because a bend arrives from any of the four.

#### The drawing, because stone landed somewhere it never had

A wall for a diagonal wrong ray sits one diagonal step from the mirror, touching it at a **corner** — and
rule 4 teaches the opposite lesson about corners everywhere else on the board. It reads, and what carries it
is the end of the line rather than the marker: the beam runs visibly _into_ the brick and stops in the
middle of it, which is not the picture a beam that clears a corner makes (`CutMirrorWrongRay`, 8 boards in
200 have one — the story is now `DiagonalRoute`, since step 4 inverted what it shows).

**The marker is the part to look at again.** An absorbed beam is dotted where it meets the obstacle's face,
which for a diagonal entry is the cell corner — so the dot lands on the one point rule 4 gives the opposite
meaning to, and on a 9-wide board it sits in a four-cell junction. The escape marker has the same open
question (§11.10), no board ships either, and marking the cell centre for a diagonal end would settle both.
Left for whoever routes diagonally on purpose rather than decided here. — **decided that way in §11.12**,
and both markers took it.

One thing confirmed rather than found: the junior frame puts a cut mirror at **135°** two cells from an
ordinary mirror at **135°**, both doing the identical quarter turn, on a board the generator built. Solid
bar against hollow plate is the whole of the difference, which is §11.9's answer to question 2 holding up
where it counts.

#### Left alone on purpose

- **`spacedFrom` and `piecesAreSpaced` stay on the four square neighbours.** That is a tap-accuracy rule,
  not a beam rule, and diagonally adjacent tap targets already touch at their corners today.
- **`placeShadows` still steps two cells along the ray.** On a diagonal ray the first cell is a corner
  neighbour, which the spacing rules do allow — but it is also where that ray's own stone goes, so two cells
  out is right there too. Worth knowing while reading it: the wall for a ray lands _in front of_ a shadow
  placed on that same ray, and `thinWalls` is what takes it away again on the boards where the shadow is
  what the deduction needs (master keeps it on 8 boards in 40).
- **The rules text and the tier table.** Neither moves while no tier draws the dial: `mirrors` still says
  "a quarter turn, off either of its faces", which is true of every mirror a player can meet. Turning it on
  owes that sentence a rewrite — and rule 5 says a cut mirror's stops are discovered by tapping, not drawn,
  so what it owes is a sentence rather than a legend.

### 11.12 What routing diagonally found

Step 4, and the step where the mechanic reaches a player: **master and wizard now route diagonally**, so a
board's winning beam leaves the rows and columns. It is smaller than steps 1–3 put together — one new
helper in the route builder and three square assumptions generalised — and it overturns two things above.

**The dial changed meaning, and the swap-in is retired.** `cutMirrors` used to swap a cut mirror in at a
square bend and spend its _wrong_ setting on a diagonal (§11.11). It now says how many of the route's bends
turn the beam diagonally, and the stop set is read off the bend rather than authored beside it. The two are
the same piece with the answer and the wrong setting exchanged, which is why nothing was lost by dropping
the older reading: a cut mirror's stop set is one diagonal and one half-step, and all step 4 does is take
the other stop.

**Rule 2's two sets are one fact.** A half-step angle has exactly **one** partner that keeps a quarter turn
— the diagonal three eighth-turns away, since the other candidate is always the flat or upright angle, and
neither of those can turn square light 90° at all. So `cutStops` is a lookup with no table: `{22.5°, 135°}`,
`{67.5°, 135°}`, `{45°, 112.5°}`, `{45°, 157.5°}` and nothing else exists. §11.11 had already derived those
four pairs from the arrival direction; they are the same four from the other end.

#### The route's shape is forced, and it is §11.5's invariant arriving as a construction

**An ordinary mirror is no use to diagonal light.** A beam arriving at 45° either runs along the mirror's
line and is passed straight through (`reflect(2, 1) = 1`) or meets it square on its back and comes home
(`reflect(6, 1) = 5`); the other two diagonals say the same. So **only a half-step bend can close a diagonal
leg**, and there are exactly two legal shapes:

- **consecutive pairs** — out of the square on one bend, back into it on the next;
- **one at the very last bend** — the diagonal leg is then the run into the frame, and the shrine is entered
  diagonally.

Which means an odd dial has nowhere to put its odd cut but the final bend. That is §11.5's parity law used
rather than feared: the number of half-step crossings is even for a shrine entered square and odd for one
entered diagonally, so **the dial and the route's shape determine each other**. Both tiers ship
`cutMirrors: 1`, which is also what keeps §11.5's own prohibition satisfied — its rule only bites on a board
carrying more than one, and with one there is no count to read.

#### What had to learn eight directions, and what deliberately did not

| Place                      | What it assumed                               | What it says now                                                                                         |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `angleFor(enter, exit)`    | a mirror only if `enter + exit` is a diagonal | any genuine turn; refuses the two non-turns and, per rule 2, the flat and upright angles                 |
| `perpendicular(direction)` | a three-way conditional on up/down            | `direction % 4` — the pair named from the **axis**, so a leg and its reverse offer the same two in order |
| `axisOf(direction)`        | `"h" \| "v"`                                  | `direction % 4` — four axes, since a diagonal is a line too                                              |

The middle one is the correction worth keeping: the old function looked like it was answering "which way
across this beam" and was in fact answering "which way across this axis", and only the second question has a
stable answer. Taking the axis reproduces it exactly on all four square directions — verified board by board
below — and gives a diagonal leg its own two crossings instead of silently handing it `[up, down]`.

**A crossing may now be 45°, and that is `axisOf` reading correctly rather than a widening.** The rule was
written as "perpendicular" because there were two axes; the fact it forces is that **nothing can stand there,
or the first pass would have turned**, and a row crossed by a diagonal forces exactly that. Measured over 200
generated boards: **9 crossings at master and 13 at wizard** now meet at 45°. Looked at (`DiagonalRoute`,
last frame): it draws as an X leaning over and still reads as one square the beam goes through twice, because
a beam polyline bends only at cell centres and both passes bend at the same point — the same structural
reason §11.10 gave for a beam corner not appearing to terminate on a rivet.

**Sliding pieces stay on square legs, and that is a decision rather than an oversight.** A track across a
diagonal beam would draw its ghosts on a diagonal, and §9 has not settled what a diagonal run of ghosts
reads as — so the givens and the sliding pieces are drawn from the square bends alone, sliding walls from
square straights, and a door's open stop from a square leg's two crossings. `trackRuns` therefore still
builds a row or a column, and the spec that asserts as much is still true. Three call sites, one rule.

**A wrong setting that sends the beam home needs no stone.** At a 45° bend the partner stop lies 135° off
the answer, which is exactly the way back: `reflect` is its own inverse in the direction, so the light
retraces every leg it has flown, off every mirror that carried it, and the disc swallows it. No wall may go
there — the cells are the route's own — and none is wanted, so `wrongSettingRays` drops that ray instead of
`blockWrongSettings` refusing the draft. It is a death the player can see and the first one in the family
that is neither stone nor the frame.

**And it turned up a sentence that was already wrong.** `deadEnd`'s absorbed variant said _the light runs
straight into stone_ for every absorption, and the disc absorbs too. Measured on the shipped tiers before
anything changed: **13 of 40 starter boards had a `deadEnd` reason about a beam that had gone home**, and 13
of 40 junior ones — the commonest wrong sentence in the family, on its gentlest tier, and invisible until a
board was built where going home is the _designed_ wrong answer. There is a `disc` variant now.

#### Measured, 40 seeds a tier

The gate steps 1–3 were verified against — _any change that alters a generated board is a bug_ — held to the
last byte through the eight-direction generalisations, and then was spent on purpose:

| tier    | boards | attempts a board | fixed walls a board | `exitRun` used | diagonal route | worst gen               |
| ------- | ------ | ---------------- | ------------------- | -------------- | -------------- | ----------------------- |
| starter | 40/40  | 2.3 → 2.3        | 0.00 → 0.00         | 40 → 40        | 0/40           | byte for byte unchanged |
| junior  | 40/40  | 4.0 → 4.0        | 0.00 → 0.00         | 40 → 40        | 0/40           | byte for byte unchanged |
| expert  | 40/40  | 71 → 71          | 0.05 → 0.05         | 39 → 39        | 0/40           | byte for byte unchanged |
| master  | 40/40  | 144 → 372        | 0.23 → 0.30         | **34 → 19**    | **40/40**      | 168ms → **58ms**        |
| wizard  | 40/40  | 112 → 243        | 0.10 → 0.38         | **26 → 11**    | **40/40**      | 589ms → **319ms**       |

**Yield holds and the clock improves.** Every seed on every tier still builds, and master's worst board got
nearly three times _faster_ despite two and a half times the attempts — a diagonal draft that will not fit
fails in the route builder, which is the cheapest place to fail. §11.4's fear that the geometry would cost
generation time is the opposite of what happens.

**The attempts are up for one structural reason**, worth knowing before tuning anything: with one cut the
diagonal leg is the final run to the frame, and a diagonal leg roams both axes across a board whose square
legs have already crossed it — so `mayCross` rejects far more drafts on a tier that has not drawn
`crossedBeams`. `MAX_ATTEMPTS` went 1600 → 2400 to cover it, and the fallback ladder got _rarer_ rather than
commoner: over 120 seeds × five tiers, **2 boards fell back on a goal before and 1 after**.

**The bill is the rung §11.11 predicted, and it is smaller than §11.11 measured.** `exitRun` — _the shrine
can only be lit from there_, the family's clearest sentence — falls from 34 boards in 40 to 19 at master and
26 to 11 at wizard, with `onlySurvivor` doing that work instead. §11.11 measured 15 for master; the extra
four come from master's baseline shadow coming _off_ as the cut goes on, which is §6.4's one-new-thing rule
applied rather than a separate saving. Starter and junior would pay nothing at all if they drew the dial —
40/40 either way — because the cost is density, not the piece: a diagonally-entered shrine set in the frame
walls most of the eight candidates by itself, and it is the unsettled pieces on the other approaches that
turn a candidate `unknown`.

**§6.3's ramp, re-measured in one pass** (the table in `lightbeamConfig.ts`): monotone on every column, and
master and wizard part on the headline percentage for the first time — 13% against 10%, where they used to
tie at 13%. The note that stood there said a second shadow at wizard was the only way to separate them and
would cost twice the generation time; it is the other way round. **Expert and master are the close pair now**
(14% against 13%), and §6.3's measure cannot see what parts them, because what master spends is a rung and
the measure counts the geometry of a wrong branch. Anyone landing the difficulty-metric swap §6.3 asks for
should expect those two to read as one tier and to need reseparating.

#### The four decisions §11.11 left, answered

1. **`exitRun` going quiet board-wide: paid, and the lever stays deferred with a reason.**
   `travelledDirections` is already as tight as any sound board-wide rule can be — a diagonal beam requires
   at least one half-step crossing, and with one half-step stop anywhere both parities are reachable. Going
   tighter needs a **bound on how many times the beam crosses a half-step mirror**, and no local rule
   supplies one: §11.5's own double-crossing board shows a single cut mirror flipping parity twice. The
   generator knows the count (`cutBendSlots` fixes it), but reading it off the route would be the solver
   knowing something the player cannot see, which is the line §4 does not cross. So the rung is spent, and
   the exhaustive pair earns its place in master's cap.
2. **Both end markers now sit at the cell centre for a diagonal end.** `sidePoint` is a cell **corner** for a
   diagonal direction, and a corner is the one point rule 4 gives the opposite meaning to — diagonal light
   slips _between_ two corners everywhere else — while on a 9-wide grid it lands in a four-cell junction
   belonging to none of them, and corners are also where rivets are drawn (§11.10). Looked at rather than
   reasoned (`DiagonalRoute`, frames 4 and 5, at 4×): the absorbed beam now runs visibly into the middle of
   the brick and stops there, which is the whole of what the picture has to say. The cost is small and real
   — for an **escape** the corner was the true exit point, so the centred dot reads as mid-line rather than
   as an endpoint — and it is paid to keep the marker off the corner, where both the rivet reading and the
   slipped-through reading live. One rule for both markers beats two rules.
3. **Rule 3's three-stop, edge-on set is not built.** It needs the stop set built from the bend's arrival
   direction (a flat stop in front of a beam coming down a column retroreflects up the route and the draft
   dies), it costs 1.5× rather than 1× per §11.8 rule 8, and it is a second new word for a tier that has
   just been given one. The hand-authored `{0°, 45°, 135°}` board in `techniques.spec.ts` still holds the
   walk and the two-ray derivation honest; nothing generates one.
4. **Two diagonally adjacent movable pieces reached by one beam: measured, and it does not happen.** Over
   200 generated boards on every tier, with one cut mirror and with two, **no winning beam links two movable
   pieces a diagonal step apart** — zero, every tier. So `spacedFrom` and `piecesAreSpaced` stay on the four
   square neighbours (a tap-accuracy rule, as §11.11 said) and no new gate was added. The uniqueness and
   settling gates would catch a board where it mattered.

#### One thing found that belongs to §11.2 rather than here

`LightbeamBoard` drew the pieces from the player's states and traced the beam from the _fired_ configuration
— so a door the light had already opened was drawn shut, with the beam running straight through the brick.
Visible on most wizard boards, and squarely against §11.1's promise that effects land ahead of the light by
construction, so the drawn beam is never a picture of something that has stopped being true. Fixed in the
same commit, because it was making step 4's own frames unreadable: the board now draws `firedConfig`, and a
door slides aside as the light reaches its socket.

#### Left alone on purpose

- **Traps** (§11.1), which is what the second routes were for — and they are no longer next. Rule 10 gained
  a step: **one mirror type with the list authored per piece** (§11.13) comes first, because step 4 is what
  made the gap between rule 1 and the generator measurable.
- **The difficulty-metric swap** (§6.3), still separate, and now with the expert/master caveat above.
- **`placeShadows`, `thinWalls` and the spacing rules**, unchanged — §11.11's list still reads correctly.

### 11.13 What the stop drawing found, before any of its logic

Rule 10 step 5, run the way step 1 was: the drawing first, at 35.3px, before a line of the generator
changes. The question is not the mechanic's — it is **rule 1's**, which steps 1 to 4 have not kept.

**Measured first, because the gap is the reason for the step.** Over 200 generated boards on the five
tiers, the authored stop lists are:

| tier    | distinct lists authored                         | stop counts |
| ------- | ----------------------------------------------- | ----------- |
| starter | `[45°, 135°]` ×120                              | 2 only      |
| junior  | `[45°, 135°]` ×160                              | 2 only      |
| expert  | `[45°, 135°]` ×194                              | 2 only      |
| master  | `[45°, 135°]` ×200, then four derived pairs ×40 | 2 only      |
| wizard  | `[45°, 135°]` ×247, then four derived pairs ×40 | 2 only      |

**921 of 961 mirrors carry the identical list, and no list anywhere is longer than two.** Rule 1 says "two
or three stops per piece… not the same set on every piece — the variety is the point", and the generator
ships one set with a garnish. The type was never the obstacle: `MovablePiece`'s `turnMirror` has been
`{ at, angles }` since §11.10, one mirror with an authored list, exactly as rule 1 describes.

**So what is actually blocking rule 1 is the drawing, and it always was.** A cut mirror is told from an
ordinary one by a _fill_ — solid bar against hollow plate (§11.9) — which is **one bit**, and it only says
anything because there are only two flavours to distinguish. Author genuinely varied lists and that bit
goes silent. §11.9's finding is what forces this: the 22.5° between two stop sets can never be read off a
drawn angle, because you are judging one cell with nothing to compare against.

#### Three candidates, and the one rule 5 suggests is the one that fails

Prototyped in `StopRingPrototype`, which imports nothing from `LightbeamBoard` — the bar geometry,
`glyphTurn` and `OwnerRing` are copied on purpose, so looking at a candidate cannot change the shipped
board. Cells are 35.3px, shot at 1× to judge and 6× to inspect.

| candidate                             | verdict                                                        |
| ------------------------------------- | -------------------------------------------------------------- |
| **A — a ring in as many segments**    | **Rejected**, and it is rule 5's own wording                   |
| **B — pips, counted like dice**       | **Rejected** above three, and it carries less for the same ink |
| **C — a tick at each stop not taken** | **Passes**, and it answers a question that was not asked       |

**A fails for a reason worth keeping: the bar runs through the annulus the ring wants.** A mirror is a line
across the whole cell, so any ring drawn around it is crossed and occluded by the very thing it annotates.
At two stops it reads as two arcs; by four it is a dashed circle of indeterminate count, and at 35.3px it
is a mush at every count. Rule 5's parenthesis — "a ring in as many segments" — cannot be built.

**B is countable to about three and then stops.** Past that the pips collide with the bar's ends and read
as "some dots". It is also the weaker candidate at equal cost: pips sit at fixed bearings, so they say how
many stops there are and nothing about **which**.

#### C, and the thing it settles that §11.9 said could not be settled

The bar says where the piece stands; a short tick at each stop it is **not** in says where else it goes.
Three findings, in order of how much they change:

1. **It draws the angles, not the count.** §11.9 concluded the drawn angle can never distinguish
   `[22.5°, 135°]` from `[45°, 135°]` — true, and irrelevant here, because a tick puts the comparison
   **inside the one cell**. There is now a candidate on which a player can read a piece's whole fork
   without touching it. **That contradicts §11.8 rule 5** ("stops are discovered by tapping, not drawn"),
   and it is a design change to be argued rather than slipped in: what rule 5 buys is board area, and what
   it costs is that a fork is probed rather than seen — which §4 says is the difference between trial and
   deduction.
2. **The count falls out and never has to be counted.** What a player needs is "what are my options here",
   and one tick against three is a _texture_ — a fan — that reads before it is counted. So the countability
   ceiling A and B were being judged against is not a real bar.
3. **The marginal discrimination is bare-against-one-tick, not two-against-three** — and that is what
   decides how to spend it. At 35.3px a single tick is present but quiet, while the step from one to three
   is loud. Since every mirror has at least two stops, **every mirror carries at least one tick**, so the
   quiet comparison never arises on a board: one tick is the baseline the eye calibrates on, and more than
   one is the thing worth seeing. Drawing the tick on ordinary mirrors too is what makes that true — which
   is the opposite of the instinct to draw it only where a piece is unusual, and that instinct is `cut`'s
   one bit wearing a different coat.

**The `OwnerRing` question is closed: no collision.** All three candidates sit inside the cell's outline,
and the socket-driven two-colour split stays legible against them — the ring is pink and green at the edge,
the marks are sky inside. Concentric was the worry and it is not one.

#### What the gate therefore says to build, which is not what was proposed to it

The proposal into this step was to replace `Blocker.cut: boolean` with a stop **count**. The drawing says
that is the wrong field: the renderer needs the **angles**.

```ts
{ kind: "mirror"; angle: MirrorAngle; stops: readonly MirrorAngle[] }
```

One field replaces one field, and a derived boolean disappears rather than being swapped for a derived
number. `angle` stays what it has always been — which stop the piece is in, and the only thing the light
reads. `stops` is the authored list, which the flattening into `CellContent[][]` currently throws away and
is exactly what the renderer has to have. `sameBlocker` compares the list instead of the bit, which is
strictly more information, so the resolved-or-`unknown` engine gets no weaker.

`cut`, and `isCut` with it, then has nothing left to do. It is worth recording what it was: **a rendering
hint smuggled through a physics value**, and it meant two different things depending on which branch built
it — a fact about the piece's list when `pieceOccupant` passed `angles`, and a fact about the current angle
when `configGrid` fell back to `[angle]` for a fixed or sliding mirror. A fixed mirror authored off the
diagonals drew as a plate for no reason anyone chose.

#### What building it found, and the one thing the prototype missed

The gate above was run on cells with no beam through them, and that is what hid it: **a radial tick is
collinear with the beam whenever a stop's line is the line the beam leaves on.** The beam is drawn over the
pieces with `mix-blend-screen`, so the tick came out **cream** — which costs the mark its meaning and breaks
§9's "nothing but light is drawn amber" in the same stroke. Not rare, either: a beam travels one of eight
bearings and a stop is one of eight mirror lines, and the very first shipped board (`DiagonalRoute`, master
seed 10) does it.

**The fix is to lay the tick _across_ its bearing rather than along it.** A tangential dash cannot be
collinear with anything radial: the beam crosses it square, brightens the middle, and the ends stay sky.
Checked on the cell that failed, at 8×.

And it cannot be hidden by the bar either, which is worth writing down because it is _why_ candidate A's
failure does not carry over. A ring failed because the bar is a diameter and crosses the annulus. It crosses
it at **its own bearing** — and that is the one stop no tick is ever drawn for, since the ticks are the
alternatives. Arcs placed only at the stops the piece is not in are the one set of arcs the bar cannot
touch. Candidate A was the right _mark_ at the wrong _bearings_.

**The board is denser and it holds.** Every mirror now carries at least one tick, so a wizard grid gained
nine or more strokes. Looked at on a nine-mirror board with two three-stop pieces retrofitted in
(`CutMirrorDensity`, which is what that frame asks now): the ticks stay subordinate to the bars, one tick
against two is visible at a glance, and nothing competes with the amber beam, the socket rings or the
dashed wire.

**And the model change is behaviour-neutral, verified the same way step 4 was.** `sameBlocker` now compares
the whole stop list rather than the bit, which is strictly more discriminating — and it changes no outcome,
because two candidate occupants of one piece differ in `angle` before they could differ in `stops`. All 200
boards across the five tiers are byte-identical.

**And the gate that was missing, found by someone looking at the screenshot rather than at the glyph.** The
beam had been drawn with **gaps** in it since the layer was written: `segmentPoints` tested `segment.exit`
for truthiness, and `DIR.right` is `0`, so every cell the light crossed rightward was drawn from its entry
face to its centre and stopped. Around a third of the segments on a typical board. The escape marker had the
identical bug — a beam leaving the grid rightward drew no marker at all.

Worth recording as a lesson about where the gates were pointed rather than as a typo. Three drawing gates ran
in this family — §11.9, §11.10, and the one above — and every one of them asked whether a _piece_ could be
read. None asked whether the **beam** could, and the beam is the only thing on the board that answers a tap.
That matters most for the play style the family's premise treats as the failure mode: trial is only cheap if
you can see what your tap did, so a beam with holes in it breaks the trial loop rather than the deduction
one. `Direction` being an index is what made it typable; `MirrorAngle` has the same hazard at `0`, and both
now have specs asserting the zero case rather than a comment hoping for it.

What this section still owes, unchanged: the generator authoring varied lists, and the measurement.

#### The generator authoring the lists, and what a bigger fork buys

Step 5 point 2. `mirrorStops` is the sibling of `slidingStops` — the most stops a route mirror's list may
hold — and `mirrorStopSet` draws each list per piece: the answer, the diagonal rule 2 demands, then extras
drawn from the angles whose wrong ray the board can actually close.

**The closability filter is the whole of why this is affordable.** A `k`-stop piece has `k − 1` wrong rays
and every one has to leave the route, so the obvious build — draw `n` angles and let `blockWrongSettings`
reject the draft — throws away most of its work. Choosing extras from the angles whose first ray cell is off
the route, off the grid, or a retrace to the disc costs one array filter and keeps the yield at **40/40 on
every tier at every size tried**.

Measured over 40 seeds, at the top three tiers:

| stops | tier   | built | avg fork | distinct forks | configurations | pieces a board | worst gen  |
| ----- | ------ | ----- | -------- | -------------- | -------------- | -------------- | ---------- |
| 2     | expert | 40/40 | 2.00     | 1              | 4 368          | 5.9            | 44ms       |
| 2     | master | 40/40 | 2.00     | 5              | 9 216          | 7.0            | 61ms       |
| 2     | wizard | 40/40 | 2.00     | 5              | 21 216         | 8.2            | 252ms      |
| 3     | expert | 40/40 | 2.41     | 7              | 11 151         | 5.9            | 83ms       |
| 3     | master | 40/40 | 2.35     | 23             | 23 400         | 7.0            | 210ms      |
| 3     | wizard | 40/40 | 2.33     | 23             | 73 836         | 8.1            | **1511ms** |
| 4     | expert | 40/40 | 2.80     | 20             | 24 000         | 5.9            | 246ms      |
| 4     | master | 40/40 | 2.72     | 42             | 52 455         | 6.9            | 544ms      |
| 4     | wizard | 40/40 | 2.61     | 40             | 126 924        | 8.1            | **4772ms** |

**The variety is the headline.** §11.13 opened on 921 of 961 mirrors carrying the identical list; three stops
takes a tier from **5 distinct forks to 23**, and four takes it to over 40. The piece count does not move —
7.0 to 7.0, 8.2 to 8.1 — so this is rule 8's "one piece doing more" rather than another piece, which is the
same trade the diagonal cut made.

**What it costs is generation, and it is the enumeration that pays.** Both exhaustive gates — `routeIsUnique`
and `surveyWinners` — walk the whole configuration space with a full `traceBeam` per configuration, so a
space three times larger is a build three times slower. Wizard at three stops is 1511ms, past the 1400ms
`lightbeamConfig.ts` already calls a trade not worth making, and four stops is 4772ms.

**So rule 8's cost model gets applied rather than quoted: the decoy pays for the fork.** Three stops is 1.5×,
something has to go, and dropping wizard's baseline decoy lands it at **655ms** with 23 distinct forks and a
configuration space still 1.8× what two stops gave. Decoys still reach wizard boards through `sortTheWheat`,
and `neverReached` still fires without one, because a shadow is a decoy too.

**Wizard only, and that is §6.4 rather than caution.** Master's addition this cycle is already the diagonal
cut; giving it the fork as well would be two new words at one tier. Master at three stops is measured and
cheap (210ms, 23 forks) if the ladder is ever re-cut — the numbers are in the table above rather than needing
a rerun.

**And the fork is what showed "seen from the door" is not the ramp.** Wizard's fork went 5 shapes to 23 and
its configuration space 21 216 to 37 350 — the maze got substantially bigger — while §6.3's headline
percentage moved from 10% to 11%, reading it as very slightly _easier_. A metric built on the cost of
following a wrong turn cannot see this, because following a wrong turn costs one tap. The tier table in
`lightbeamConfig.ts` now says so, and steers by what `docs/instructions/puzzle-screens.md` §5 names instead:
which techniques a board demands.

**One correction to the spec that step 4 wrote.** `cutBends` selected pieces by `isCut(angles)` — anything
off the two diagonals — which was the same thing as "the route bends diagonally here" only while every list
was a pair. Once lists are authored, an ordinary quarter-turn bend can carry a half-step among its _other_
stops, so the predicate caught pieces the route does not bend diagonally at. What `cutMirrors` counts is
diagonal legs, which is a fact about the **answer**, and the spec now says that. Two more assertions moved
the same way: rule 2 is now checked over every list rather than over the cut pieces' pairs, and "every wrong
setting fails" is scoped to the mirrors the winning beam actually crosses — a decoy's setting is free by
construction, which is what `neverReached` proves, and asserting otherwise was a claim about the wrong pieces.

#### One thing this section decided and did not spend

**Master at three stops is measured and affordable** — 210ms worst, 23 distinct forks — and it is not taken,
because master's addition is already the diagonal cut and §6.4 allows one new word a tier. The numbers are in
the table above rather than needing a rerun, for whenever the ladder is next re-cut.

And one thing to settle before step 2 rather than after: **rule 5.** If a fork is drawn rather than
discovered, the piece stops paying for itself in taps and starts paying in ink, and §6.3's "seen from the
door" is measured over wrong _settings_ — a fork the player can see changes what that number means.

### 11.14 Where drafts actually die

Generation is reject-heavy and was reject-blind, which is a bad pair: a master board costs 356 discarded
attempts and nothing recorded which gate discarded them, so every tuning decision in §11.12 and §11.13 was
made without knowing whether the route builder, the piece placement or one of the two exhaustive gates was
doing the rejecting. `LightbeamOptions.reject` names the gate, off unless asked for. Measured over 40 seeds
a tier:

| tier    | rejects a board | where they die                                                       |
| ------- | --------------- | -------------------------------------------------------------------- |
| starter | 1               | `noRoute` 100%                                                       |
| junior  | 3               | `noRoute` 95%, `noHonestOpening` 5%                                  |
| expert  | 70              | `noRoute` 92%, `noPieces` 4%, `tooFewCrossings` 3%, `piecesTouch` 1% |
| master  | 356             | `noRoute` 95%, `tooFewCrossings` 3%, `noPieces` 2%, `piecesTouch` 0% |
| wizard  | 226             | `noRoute` 97%, `noPieces` 2%, `tooFewCrossings` 1%, `piecesTouch` 0% |

**`routeIsUnique` and `solveLightbeamByTechniques` reject nothing. Not one draft, on any tier, across 200
boards.** Every draft that reaches them passes them. So the two gates the family is built on — §5 gate 5 and
the house rule's "reachable by deduction alone" — are already **assertions rather than filters**: at the
shipped dials, route-then-obstruct produces uniqueness and deducibility as a by-product of construction, and
the enumeration only confirms it.

That is worth stating carefully, because it is easy to over-read. It does **not** mean the gates are
unnecessary; it means they are not currently doing selection, and what keeps them passing is unmeasured. They
are what would catch a dial moved into unsafe territory, and they are the reason nobody has had to think
about uniqueness while turning knobs. Removing them would trade a known cost for an unknown risk.

**What it does overturn is a cost story.** The natural assumption — the one this doc's own §11.13 leans on
when it explains wizard at three stops costing 1511ms — is that a bigger configuration space is expensive
because the gates run more often. They do not run more often; they run **once per accepted board** and always
pass. The 1511ms is one enumeration over a space three times larger, not many enumerations. And conversely
the 356 attempts a master board costs are **cheap** rejections: worst-case generation there is 55ms, so a
discarded draft costs about 0.15ms, because it dies in the route builder before any piece is placed.

**So the honest target for anyone optimising this is `buildRoute`, not the gates.** 92–97% of all work is a
route builder being asked for a path it cannot lay — legs that run off the grid, a crossing budget that
cannot be met, a diagonal leg with nowhere to go — and it is asked blind, with no knowledge of the grid it
has left. A builder that knew its own constraints would cut nearly all of that, and it is a much smaller
change than replacing the architecture.

### 11.15 Can authored branches carry uniqueness on their own?

A question for the generator §11.14 points at — one that **authors** each wrong branch as a corridor rather than
deriving a ray and walling it. If every branch is built to die, is the enumeration still needed?

The proposed invariant was: _no branch may join the golden path or reach the shrine, and sharing a cell with
the golden path is not a join if the beam passes through it in a different direction._

**The second half is right, and for a good reason.** The walk is keyed on `(cell, direction)` — that is what
`segmentKey` and the loop guard use — so two beams sharing a `(cell, direction)` pair have identical futures.
Sharing a cell while travelling differently is genuinely not a join. It also sharpens the first half: the
condition is "shares no `(cell, direction)` with the golden path", not "does not reach the shrine", because a
branch that rejoins **upstream** of where it left also delivers the light.

**But the pair is not sufficient, and here is the board that proves it.** Found by sampling 400 000 random
boards, keeping the ones where every single-piece deviation from the winning configuration satisfies the
invariant, and asking whether the winning path is then unique.

```
 · · · X ·     S  disc (3,4), facing left      A  (3,0) stops {112.5°, 135°}
 C # · # ·     X  shrine (0,3)                 B  (2,1) stops {0°, 45°}
 · B · · ·     #  wall                         C  (1,0) stops {22.5°, 67.5°, 135°}
 A · · · S
 · · · · ·
```

Golden: left along row 3, **A** turns it up, up to **C**, C bends it down-right into **B**, B bends it
up-right to the shrine. Every one of the four single-piece deviations is safe — three escape the frame and
one is absorbed by the disc it came from, and none of them rejoins:

| deviation      | end      | rejoins |
| -------------- | -------- | ------- |
| A → other stop | escapes  | no      |
| B → other stop | absorbed | no      |
| C → 67.5°      | escapes  | no      |
| C → 135°       | escapes  | no      |

And yet the configuration that moves **all three** lights the shrine by a second, shorter path: A's wrong
stop sends the beam up-right straight into **B's cell**, and B at _its_ wrong stop bends it to the shrine,
skipping C entirely. Two branches that each die, combining into a route.

**The mechanism is the whole finding.** A branch that enters a cell holding a **tappable** piece is not one
corridor — it is one corridor per stop of that piece, because `(cell, direction)` determines the future only
where the cell's content is fixed. Authoring covers the stop the branch was traced against. The others exist,
and the invariant says nothing about them.

Rate: **1 in 949** boards that satisfied the invariant, over 400 000 sampled. Two caveats pointing opposite
ways: random boards mostly throw their branches off the frame, which is why only 949 of 6 823 satisfied the
invariant at all — and an authoring generator aims branches at interesting territory on purpose, so the real
rate should be **higher** than this floor rather than lower. At shipping scale 0.1% is dozens of boards with
two answers.

#### The sufficient rule, and why it is also the cheap one

> While authoring a branch, if it enters a cell any tappable piece can occupy, **recurse**: author every stop
> of that piece and require every continuation to die as well.

That restores "the future is determined" everywhere, so uniqueness becomes a property of the construction. It
is more work than the invariant above and **less** than the gate it would replace: the recursion walks the
**reachable deviation tree**, and today's `routeIsUnique` walks the whole product. Once a beam dies, the
settings downstream of it cannot matter, which is exactly what makes enumerating 37 350 wizard configurations
wasteful — the tree is roughly the golden mirrors times their fork size, plus a recursion wherever a branch
meets a tappable cell, which is low hundreds of walks rather than tens of thousands.

So the authored generator can plausibly hold uniqueness **by construction and more cheaply than the current
gate**, while keeping the reuse — a branch running through a golden mirror's cell, or past a slider — that
makes the board dense and keeps nearly every mirror the player's to touch. The alternative, branches built
only from givens and never touching a tappable cell, makes the proof trivial and fills the board with scenery
instead: the fixed count grows as mirrors × fork × branch depth while the tappable count stays at the golden
path's, so three-stop forks with one turn a branch put two fixed mirrors on the board for every live one.

**The board above is the test any such generator has to pass.**

#### Interactive against static is a weight, not a count

Which mirrors are the player's has been a **count** for the family's whole life — `setMirrors`, how many bends
are givens — and it wants to be a **share**, because what it controls is not a quantity of pieces but which of
the two designs above a board is built to. A given costs a cell and reads as scenery, contributes nothing to
the configuration space, and may be passed through by a branch freely, because a fixed face keeps
`(cell, direction)` determining the future. A tappable mirror is the opposite on all three counts, and every
branch that touches one owes the recursion.

So the share is a **continuous dial between the two designs, choosable per tier** rather than once for the
codebase. Low, and branches are built of givens, uniqueness is nearly free, and the board fills with scenery —
the static count grows as mirrors × fork × branch depth while the live count stays at the golden path's, so
three-stop forks with one turn a branch leave two static mirrors for every live one. High, and branches reuse
the pieces already on the board — a golden mirror's back face, a slider's vacated cell — so the board stays
dense and every glyph is worth touching.

It is therefore also the family's **main lever on generation cost**, since it drives the configuration space
and the recursion depth at once, and it is the knob to set before any other. One floor holds whatever the
weight says: **three tappable pieces**, which is where §5's opening rules already put the family's floor and
why a starter board carries three bends rather than two.

The drawing already carries the distinction, which is what makes a low share survivable rather than confusing:
a white outline says a piece is the player's and anything else says it is part of the puzzle (§9). What a low
share costs is play, not legibility — fewer things to try, on a board with more to look at.
