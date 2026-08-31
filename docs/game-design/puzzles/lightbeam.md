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

- A **mirror** turns the beam. Tapping it cycles it between its own two or three
  authored angles; most turn light a quarter turn, off `/` or `\`.
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
| **Turn mirror**    | movable          | 2–3    | Fixed cell, tap cycles between authored angle stops         |
| **Sliding mirror** | movable          | 2–3    | Fixed angle, tap cycles between authored stops              |
| **Sliding wall**   | movable          | 2–3    | Tap cycles between stops — moved out of the way, or into it |
| **Socket**         | fixed            | —      | Transparent. Light crossing it fires the wires leading out  |
| **Door**           | driven           | 2      | Stone on the route. No tap moves it; a socket does (§7)     |

**A wiring names a set of sockets and one piece**, which is what makes two shapes one mechanic. **Fan-out**
is one socket named by several wirings — crossing it sets several pieces at once, and the colour does the
explaining. **Fan-in** is one wiring naming several sockets, and the piece does not budge until the light
has been through **all** of them: not "reach that square" but _"reach these two squares, and there is one
beam to do it with"_, which is the first thing in the family that asks the player to plan a beam rather
than settle a piece. The piece wears both sockets' colours split round its edge, each strand shows its own
socket's state so a half-satisfied wiring is visibly half-satisfied, and the wire only thickens when the
wiring actually fires — a wire drawn as carrying while nothing moved is the one lie this layer must not
tell.

**A door is not tappable, and that is the whole reason a socket is worth reaching.** A door the player
could open would make the socket decoration, so a driven piece contributes nothing to the configuration
space: `pieceOptions` gives it exactly one state. It also drops out of `piecesAreSpaced`, which is about a
thumb landing on the piece the player meant, and a door is not something anyone can mean.

The sliding wall is the one piece whose move is **clearing a path** rather than
bending one. That is worth having precisely because it is a different verb: every
other piece answers "which way does the light turn", and this one answers "does
the light get through at all".

It comes in two forms and they are the same piece: **driven** by a socket, which is the door, and **tapped**,
which is stone resting on the beam's own line one cell from where it belongs. The tapped one authors no
corridor at all — its wrong stop is standing in the golden path, so the beam is absorbed in the piece itself —
which is why it settles on `deadEnd` and belongs at the tiers still learning to read where the light died.
**It always has exactly two stops.** A third would be a second cell off the beam's line, and stone off that
line blocks nothing, so the board would have two answers.

## 3. Board model and beam tracing

State is a flat array: one integer per movable piece, its chosen state. Nothing
else. That makes reset trivial, comparison cheap, and the whole configuration
space enumerable (§5).

Tracing walks from the sun-disc, cell by cell:

- off the grid → the beam **escapes**
- a wall, or the sun-disc itself → the beam is **absorbed**
- a mirror → the beam **turns**
- the shrine → **lit**, and the puzzle is solved
- a `(cell, direction, firedSet)` triple seen before → the beam **loops** forever

**One number says what a mirror does**, and the walk, the drawing and the deduction all read
that one number. `Direction` is an index into the eight multiples of 45°, a mirror's `angle`
is an index into the eight multiples of 22.5°, and the whole law is a subtraction:

```
reflect(angle, travel) = (angle − travel) mod 8
```

Three facts fall out of the arithmetic rather than having to be built. An **even** angle
preserves the beam's parity and an **odd** one flips it between square and diagonal. A mirror
lies **along** the beam — and so passes it — exactly when `angle` is `2·travel`, since
`2t − t = t`. And the backward walk reuses the forward reflection unchanged, because
`angle − (angle − travel)` is `travel` at every angle.

**Diagonal light slips through corners.** A diagonal step resolves only the cell it lands in;
the two it squeezes past are never consulted. Walls are drawn with rounded corners so the gap
is visible in the glyph — no rules text, and it is also the naive implementation.

**Loops are unreachable, and the condition is injectivity rather than turn size.** `reflect` is
a bijection in the direction at **every** angle, so each beam state has exactly one predecessor
and the disc's first state has none: the beam from the disc walks a path and can never join a
ring. A ring of four mirrors does carry light round forever, but only if the light starts inside
it. So the board never has to draw a looping beam. A mirror set square to the beam reverses it —
a half turn, not a quarter — and that is still a bijection, so it is still loop-free; the beam
simply retraces its own line to the disc, which absorbs it, because the return trip carries a
different direction and so a different key.

Loop detection stays in the trace as the thing that keeps the walk total, and it becomes
load-bearing the moment a piece stops mapping directions one-to-one — which is exactly what the
deferred prism does (§11.1). It also catches a beam started between two retroreflectors.
`beam.spec.ts` proves both halves: the ring loops when the light starts inside it, and the disc's
beam never loops.

**A socket changes the board mid-walk, which is why the key carries the fired set.** That stays
well founded because firing is **monotone** — a wiring fires once and never un-fires — so a walk
cannot cycle through door states, and clearing the loop guard when a wiring fires is both sound
and total.

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
the wire. See §7.

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

## 5. Generation — the maze is authored

The configuration space is the product of the movable pieces' state counts. At nine pieces that is under 20 000
traces, each a walk over at most 49 cells, so **this family can afford exact enumeration** where Sumplete and
Futoshiki cannot. It turns out not to need it: the gates below are cheap because the construction hands them
their answer.

1. **Lay the golden path** from sun-disc to shrine, dropping a mirror at each turn. The route may cross itself
   on a different axis (§5.2). The final leg runs to the frame, which sets the shrine in the wall: an edge
   shrine has at most three approaches and the frame kills most of those, which is what lets T1 fire at all.
   The builder **backtracks** — it tests a leg before taking it and checks a bend cell has room — so it never
   asks for a path it cannot lay.
2. **Decide which mirrors are the player's.** A share, not a count (`interactive`). A **given** costs a cell,
   contributes nothing to the configuration space, and a branch may pass through it freely because its face is
   fixed. A **tappable** mirror is the opposite on all three counts.
3. **Author a corridor for every stop a tappable mirror is _not_ set to.** Choose where it goes, place the
   mirrors it turns at, and terminate it: off the frame, in stone, in the disc, or on a trap's own stone. A
   corridor mirror is off the winning beam's line by construction, so it is a **decoy** — and a **shadow**
   where it stands in a wrong ray, which is what stops every board being a chain of T3 eliminations (§6.1).
4. **Where a corridor enters a cell a tappable piece can occupy, recurse**: author every state of that piece
   and require every continuation to die too. This is the rule that makes the construction sound rather than
   merely plausible, and §11.3 has the 5×5 board that proves the simpler invariant is not enough.
5. **Uniqueness is a property of the construction, not a verdict.** Take any configuration and let `k` be the
   first bend not at its golden angle: the beam reaches `k` along the golden path and leaves down a corridor
   built to kill it. Two conditions carry that, and both are §11.3's — a branch may share no
   `(cell, direction)` pair with the golden path, and no cell's contents may be undetermined when the beam
   arrives.
6. **Gate — the route is the only route.** `reachableDeviations` walks every future the light can have, fanning
   out only where it meets a piece it has not been through. It answers the same question as enumerating the
   whole product and costs 13× to 836× less, because once a beam dies the settings downstream of it cannot
   matter. `routeIsUnique` remains as the independent second opinion.
7. **Gate — deduction reaches it.** The ladder, capped per tier, must settle every piece on the path. A board
   that stalls needs a guess and is discarded.
8. **Gate — the board opens unsolved**, and no single tap solves it, and no uniform number of taps does either.

There is no wall-thinning pass. Every wall is placed because a corridor had nowhere else to end, so there is
nothing for a pruner to find — and a pruner would be actively wrong here, because it tests uniqueness and the
ladder while most authored stone is holding a branch out of territory the recursion would otherwise have to
clear.

Gate 6 is the honest form of uniqueness for this family. "Exactly one winning configuration" would be the wrong
test: a decoy has a free state, so a board with decoys has many winning configurations and only one winning
_route_.

### 5.2 Crossings

**The route may cross itself, and nothing in the family is keyed by square.** `forced` is keyed by
cell _and_ direction, the walk remembers `(cell, direction)` pairs, the uniqueness gate signs paths
by segment, and the board draws one polyline per segment — so a crossed square is already two
things everywhere it matters, and the drawing renders a cross without being asked. The objection
worth answering is the one that sounds right: a crossing does **not** put two reasons on one
square, because no technique here points at a square alone.

What a crossing must be is a **genuine crossing**, at 45° or 90°. A square entered twice on the
same axis is the beam retracing its own line, which is a different and much worse thing. A square
the beam enters on two different axes forces the one fact worth having: **nothing can stand
there**, or the first pass would have turned. So a crossing may never be a bend, a stop, a door or
a socket, and generation keeps all of them off it. `axisOf` reads the axis off `direction % 4`, so
a diagonal leg has its own two crossings rather than being handed the square pair — which is why
9 crossings at master and 13 at wizard now meet at 45°. Drawn, that is an X leaning over, and it
still reads as one square the beam goes through twice, because a beam polyline bends only at cell
centres and both passes bend at the same point.

The part that needs care is **leg length**. Legs are drawn from a budget
that divides the grid by the turn count, which gives every leg the same length — and a fold of
equal legs can never cross itself, because it comes back exactly alongside its own line and stops
one square short, for ever. Measured with the even budget: **not one crossing in twenty boards.** A
folded route reuses ground it has already covered, so it gets its own, wider budget (`spread`), and
then crossings appear on every board that asks for one.

One thing it does not do is add a technique. It buys route length and deduction steps without
buying pieces — measured at wizard, `steps` 14.6 → 15.6 and pieces-on-the-route 6.9 → 7.2, with the
configuration space flat. That is a character dial and a good one, not a difficulty lever, and §7 is
where character dials live.

### 5.1 Stone is authored, and a wall the player cannot spend is still ruled out

Every wall on a board is there because a corridor had nowhere else to end. Measured over 40 seeds a tier:
0.00 a board at starter, then 2.98 / 0.50 / 1.00 / 6.75 — the two peaks being the tiers whose modes ask for
stone. So _"the light dies in stone"_ is a reason the player hears often, and the stone is a real obstacle
rather than scenery.

There is exactly one exception, and it is deliberate: wall-heavy places a **pair** of walls either side of a
diagonal golden step, which stop nothing at all. The winning beam is seen to slip between the two corners,
which is §3's corner rule taught by the board rather than by rules text. The pair is what makes it read as a
statement rather than as an ordinary dead end, so it is kept as a pair or not at all.

## 6. Difficulty

Every tier gets a full configuration — this family is not gated to a debut tier.
Where it appears is authored per node (`encounter: "lightbeam"`), and the tag
allocator may also draw it anywhere from starter up.

That matters more than it looks: **a starter corridor can sit behind a ward gate
deep inside a wizard pyramid**, so a starter board is not only ever seen by a
beginner. Starter must therefore be _gentle_, not _empty_ — a board with a real
route to find, just a short one with few pieces and a low technique cap.

| Tier    | Grid | Route            | Branch turns | Fork | Pieces | Off route | Configurations | Cap | Modes            |
| ------- | ---- | ---------------- | ------------ | ---- | ------ | --------- | -------------- | --- | ---------------- |
| starter | 7×7  | 3 bends          | 1            | 2    | 4.9    | 1.9       | 32             | T7  | wall-heavy       |
| junior  | 8×8  | 5 bends          | 1            | 2    | 7.0    | 2.0       | 235            | T7  | slider-heavy     |
| expert  | 9×9  | 5 bends, 1 cross | 1            | 2    | 7.5    | 2.5       | 317            | T8  | slider-heavy     |
| master  | 9×9  | 6 bends, 1 cross | 1            | 2    | 10.4   | 4.8       | 2 502          | T8  | 2 of three, trap |
| wizard  | 9×9  | 6 bends, 1 cross | 2            | 3    | 12.9   | 7.3       | 70 055         | T8  | 2 of three, trap |

**"Off route" is the column that decides whether a tier is a puzzle at all**, and every tier now has one: a piece
the winning beam never touches cannot be settled by watching where the light dies, so `deadEnd` alone does not
finish the board and there is no trail to follow.

"On the route" is the count that matters and the one that was missing: pieces that can stand in the winning
beam's way, as against pieces on the board. Everything else is a decoy, and a decoy costs the player a
`neverReached` rather than a decision.

Piece and configuration counts are measured means over 40 seeds a tier, **per board**, not intentions. The ramp
is asserted in `lightbeamConfig.spec.ts`, in aggregate over a tier rather than board by board — with modes drawn
per board, one wizard grid can legitimately out-measure another, and it is the tier that has to grow.

**Generation time is not a constraint on this table**, and it must not become one: a budget vetoes a design
choice silently, because the cost of an opportunity not taken leaves no measurement behind (§11.4). The
top tier is expensive to build — 599ms a board, 4.5s at worst — and the answer to that is a seed list
(`docs/instructions/puzzle-screens.md` §6.1), not a smaller tier. It buys less here than elsewhere, because
this family's gates run inside the attempt rather than around it: a listed seed halves a wizard board rather
than removing it. Half of an expensive board is still cheaper than a tier the design did not want.

**Every tier holds the tappable share at 1.0**, so `interactive` is a knob the table does not currently turn.
It is kept because it is the cheapest lever there is when one is needed — a given costs a cell, contributes
nothing to the configuration space and authors no corridor, so lowering it thins a board on all three counts at
once. What the ramp actually runs on is **route length and grid**, plus the top tier's fork.

**The bottom of the ladder is a playtest finding rather than a measured one**, and nothing in the table saw
it: every tier carries a piece off the winning route, so `deadEnd` is no tier's cap and there is no tutorial
tier. Starter's first skill is the family's own — _"this piece does not matter"_ (§4.2), the only conclusion
in any family that reads that way — and the demand that starter be _gentle rather than empty_ is met by the
three-bend route and the 7×7 grid rather than by there being nothing to work out. Starter also holds its
tappable share at 1.0: a branch mirror drawn as a **given** redirects a wrong ray rather than standing in
it, which puts the trail back on about one board in six.

**A mirror the light can never reach is a decoy, not a shadow, and the table cannot tell them apart.**
`branchDepth` exists to stand a piece **in a wrong ray**; when the mirror lands where no beam arrives the
tier asked for a shadow and got scenery, on about one starter board in three. `dropUnreachable` removes
tappable pieces no reachable beam can arrive at — safe for the same reason `pruneStone` is, since a piece no
beam reaches is on no beam's path — and runs before the opening is drawn, because how many pieces a board
carries is what §5's opening rules reason about. Master and wizard keep theirs by dial (`decoys`): a piece
to rule out is real vocabulary at a tier whose ladder can prove it irrelevant.

**Read the configurations column per board.** It is a mean over 40 seeds, not a total across them — read as
a total it once aimed a tuning pass at putting 37 350 configurations on a single wizard grid.

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

**Grid size is not on that list, and it is the tempting thing to put there.** It barely moves how hard a board is: the configuration space is driven by piece
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
not supply (§11.4), and it arrives at the tier where the fork count needs to start moving.

**What the ladder governs is how much of a piece a tier may ask for, not whether the piece exists there.** That
is the correction §7.4 makes, and playtesting is what forced it: a tier authored to one set of dials builds one
board over and over, so starter was five turn mirrors every time and junior was six plus exactly one three-stop
slider every time. Every tier now draws a **flavour** a board, and the low tiers' pools reach the whole
vocabulary — a slide, a given, a door — one mechanic a board and never two at once, which is how a mechanic gets
met rather than averaged in. The ramp stays in the measurements: the configuration space still grows every tier
(35 / 425 / 816 / 2 731 / 65 494 measured over 24 seeds), and what a flavour changes is which question a
particular board asks.

#### Where the ladder is now enforced rather than described

The failure this guards against is a pool that introduces _vocabulary_ rather than quantity — a starter board
that can draw a sliding wall, or a tier that already owns the next tier's new thing, which makes two tiers
measure alike. Modes are one word each and a tier is authored to its own, so the ladder is the table rather
than a rule the table has to be checked against. Two rungs of it are enforced by generation refusing to build: a branch that
turns needs a cap above `deadEnd`, and a trap needs `wiringDead` (§7.3). The rest is asserted in
`lightbeamConfig.spec.ts` — piece count, configuration space and pieces-on-the-route all monotone across the
five tiers.

The caveat worth knowing is about stone. Walls are authored, so junior really does get the stone §6.4 asks
of it — 2.98 a board, against the 0.00 the previous generator managed however it was configured, because it
only ever added a wall where a wrong ray would otherwise rejoin the route and on a short route it mostly ran
off the frame instead.

## 7. Modes — what kind of board this is

Without modes a tier turns every dial a little at once — five turns AND a set mirror AND two sliding mirrors
AND a sliding wall AND a decoy AND three shadows — and every wizard board is then the **average** wizard board.

A **mode** fixes that, one level deeper than a pool of dial-tweaks could. A mode changes how the
maze around the route is _constructed_, so it adds the axis the family was missing: difficulty (the cap, the
share of tappable mirrors) is one thing, **what kind of problem this board is** is another, and they were welded
together.

| Mode             | What it constructs                                                           | Tests                            |
| ---------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| **wall-heavy**   | stone closes a branch even where the frame would; corner pairs on a diagonal | reading where light died         |
| **slider-heavy** | golden bends that slide rather than turn                                     | is it in the way, and which cell |
| **switch-heavy** | doors, the sockets that open them, and a trap                                | ordering (T2), and avoidance     |

A tier holds a pool and draws from it (`modePool`, `modeCount`), so boards get character instead of mean
settings. Wizard draws two of three; the tiers below are authored to one mode or none, because §6.4's ladder
gives each of them exactly one new word.

**A socket sits between the first tappable piece and the earliest door**, and both bounds are generation
rules rather than gates. Strictly **before** the door means an effect always lands ahead of the light, so
the drawn beam is never a picture of something that has stopped being true, and the paradox of a switch
that moves a wall behind the beam never arises. Strictly **after** one piece a tap can move means the
socket is not crossed by every configuration: a socket on the route's first leg leaves its door open from
the first frame, T2 has nothing to fire on, and the player is looking at a switch with no off.
`generateLightbeam.spec.ts` holds it as _"leaves the socket dark under some setting the player can
choose"_.

**A trap is the one thing on the board the light must be kept _away_ from**, and it is what stops sockets
being a checklist: some have to be reached, some dodged, and only the reasoning tells them apart. It has to
be the **only** reason its wrong setting fails, so that setting must otherwise reach the shrine — the
generator routes one there on purpose and puts the socket on that corridor with the stone further along, so
the wrong answer looks right until you notice what it runs over. `trapIdle` rejects a trap that turns out to
be decoration, which is the acceptance test as a gate: take the trap out and the board must stop being a
puzzle.

### 7.1 Three rules that keep it honest

**A mode only ever adds.** That is what lets two apply in either order and both still mean what they say.

**The tier sets the route; a mode sets what is in the way.** So the tier still decides how big a board is, and
`interactive` — the share of mirrors that are the player's — is what carries the ramp (§6).

**The gates stay untouched.** A mode shapes what gets _placed_, never what gets _accepted_: route uniqueness and
the ladder still decide, so no mode can smuggle through a board that needs a guess. Where a mode cannot be
delivered honestly the draft is **rejected** rather than quietly downgraded — `noTrack` when a slider's track
does not fit, `noDoor` when a door and its sockets do not, `noTrap` when no wrong setting can be routed to the
shrine, and `trapIdle` when the trap turns out to be decoration.

### 7.2 Why the board carries its modes

The board **records the modes it was actually built to**, as data on the puzzle rather than a log line. A
fallback that fires quietly would make the whole pool decorative while every other measurement still looked
fine, so a spec asserts what each tier delivered and the playtest bench can show what a board was meant to be.

That principle earned its keep twice over, and both times the failure was silent. The slider track search once
counted the sliding piece's own bend as a neighbour to keep clear of, so it rejected every track and
slider-heavy produced **zero sliding pieces** while every other number looked healthy. And the generator this
one replaced asked `clearTheWay` for a sliding wall and mostly did not get one — 17 asked, 0 placed at master —
while still recording the goal as drawn.

### 7.3 Which modes a tier may draw

A fairness question, not a taste one, and two of the answers are hard constraints rather than preferences
(§7.1):

- **A branch that turns needs a cap above `deadEnd`.** Its mirror is a shadow, and a shadow defeats `deadEnd`
  by design: the light disappears into a piece nobody has settled instead of visibly dying. So starter and
  junior keep their branches straight, and generation refuses rather than quietly building an easier board.
- **A trap needs the rung that proves a wiring can never fire.** Without `wiringDead` the stone a trap might
  drop sits `unknown` across the board for ever and nothing settles.
- **wall-heavy and traps fight**, because wall-heavy's stone kills the trap corridor before the trap gets to.
  A wizard board that draws both gets no trap, which is why it records what it drew.

And one thing worth knowing at playtest: wall-heavy makes a board **easier** in ladder terms, because stone that
closes a branch also settles it. It buys legibility and spends uncertainty, so it is not a difficulty dial.

Nothing about the mechanism is lightbeam-specific: Futoshiki could draw technique-flavour modes the same way.
Left here until a second family actually wants it — a shared abstraction on one caller would be the premature
kind.

### 7.4 Flavours — the dials vary per board too

A mode says what kind of maze is built around the route. Everything else about a board — how many pieces slide,
whether one of them is stone, whether a bend is a given, whether there is a door, whether a mirror offers a
third angle — was a **tier constant**, and that is what a player reports as "every one of these is the same
puzzle". They were right, and the measurement is blunt: on 12 junior seeds, 12 boards carried six or seven turn
mirrors and exactly one three-stop sliding mirror. Nothing else ever appeared.

So a tier holds a **pool of flavours** and draws one a board, off the seed, exactly as `modePool` does for modes
— a flavour is merged over the tier's own dials and may set any of them, modes included. The tier is the range;
the board is the sample.

Three rules keep it from becoming "every dial a little, per board":

- **One mechanic a flavour.** A flavour that asked for a slider _and_ a door _and_ a given would be the average
  board again, with extra steps. The pool's job is that a mechanic arrives on a board built around it.
- **The tier still owns the ceiling.** §6.4's ladder says how far a piece may be pushed at a tier — a two-cell
  track at starter, three cells at junior, a third mirror angle from expert — and a flavour may not exceed it.
  What the ladder no longer says is that the piece is absent below its tier.
- **A flavour that cannot be delivered is a rejection, not a downgrade** (§7.1). `noSlidingWall` joins
  `noTrack`, `noDoor` and `noTrap`: a board recording a flavour it does not carry is the silent failure §7.2 is
  about.

One gate had to become a gate because of this. **"A piece off the winning beam's line"** (§6.1) used to hold by
construction, since a tier had one set of dials and those dials produced one; a flavour that turns `interactive`
down, or one whose branch mirrors all prune away as unreachable, can lose it — and a board where every piece
stands in the winning beam is solved by following the light. It is now `noShadow`, asked of every board whose
tier asked for branches at all.

Measured over 24 seeds a tier, before → after:

| Tier    | Distinct board shapes | Configurations | Rejections a board |
| ------- | --------------------- | -------------- | ------------------ |
| starter | 1 → 6                 | 34 → 35        | 1.1 → 2.3          |
| junior  | 1 → 6                 | 304 → 425      | 4.0 → 6.8          |
| expert  | 1 → 5                 | 328 → 816      | 2.1 → 3.8          |

**The configuration space is not what moved, and that is the point.** Starter's is unchanged; what changed is
that its 24 boards are six shapes instead of one.

Master and wizard already drew two modes of three a board, so they keep their dials: at those tiers the
composition is the puzzle, and the pool there would be arguing with §6.4's "everything".

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
  grid, and it is a generation gate (`piecesAreSpaced`) rather than a rendering trick. It stays on
  the four square neighbours: it is a tap-accuracy rule, and diagonally adjacent targets already
  touch at their corners.
- **The beam owns cell centres and edge midpoints; the wire owns the grid lines.** Every beam
  segment runs midpoint → centre → midpoint, so a wire routed corner-to-corner along cell
  boundaries can only ever cross it transversally, at any size. That is also what keeps a wire off
  a mirror's diagonal, the one glyph that reaches the corners. A diagonal beam runs corner to
  corner **through cell interiors**, so it crosses a wire at 45° and shares only the corner points
  — and because a beam polyline bends only at cell **centres**, a corner point is always mid-line
  and the beam cannot appear to terminate on a rivet.
- **A beam's end marker sits at the cell centre when the beam ends diagonally.** A corner is the
  one point the corner rule (§3) gives the opposite meaning to, it lands in a four-cell junction on
  a 9-wide grid, and rivets are drawn at corners. One rule for both markers beats two.
- **A mirror's unused stops are drawn**, as a short tick laid **across** each stop's bearing — never
  along it, or the tick is collinear with the beam whenever a stop's line is the line the beam
  leaves on, and `mix-blend-screen` turns it amber. Every mirror carries at least one tick, so one
  tick is the baseline the eye calibrates on and a fan of three reads as a texture before it is
  counted. Ticks at the stops a piece is **not** in are also the one set of marks the bar cannot
  occlude, since the bar lies at its own bearing.
- Both mirror orientations read as visibly different objects, not a subtle
  rotation, at **36px** — which is the _cell_, not the 44px tap target of the line above. A glyph is
  drawn inside the cell, so this bar is a fifth stricter than the tap rule it sits under.
- **Nothing but light is drawn amber, and nothing but light is drawn as a continuous line.** The
  wire is why this is a rule rather than a preference: in any other colour it still reads as a second
  beam until it is dashed as well.
- **A piece's outline says whose it is.** White for everything a tap can move, and a socket's own
  colour for everything a socket moves. One question — "can I touch this?" — answered before
  anything else on the board has to be read.

## 10. Theming

Already written into the lore: `story-and-time-brainstorm.md` puts mirrors at the
**Lighthouse of Alexandria** journey and names a **"Letting the Sun In"** theme,
alongside the sundial and water clock. This family is the centre of that sun-god
cluster.

The component emits logical state only — `sunDisc | shrine | mirror(angle, stops) | wall | socket
| door`, plus the traced path and its end reason. Colour, texture and glyph live in the skin.

### 10.1 The finishing run — the light takes the route it just proved

**A solved board plays its own answer back before the shell is told.** A thicker beam runs from the
sun-disc along the route the player found, and the shrine flares once it arrives. The board is already
made of a beam and a niche, so the celebration is made of the same two things.

**It comes off one number.** `useCelebration` (core, `src/mods/core/app/`) reports how far the run has
got, 0 → 1, and this family splits it: the beam owns the first 70% and the shrine the rest. The split is
the whole design — a shrine flaring while the route behind it is still filling in reads as two animations
rather than as one arrival — and it is why the hook reports **progress** rather than a step index.

Three rules come with it, all from `puzzle-screens.md` §3: a tap is **refused while it plays** (cycling a
mirror mid-run would unlight the board its own win is travelling along, and the shell cannot help, because
it has not been told about the solve yet); the whole run is **capped at about a second**, because the
shell stops its solve-time clock on "solved" and that number is §3.2's instrument; and
**`prefers-reduced-motion` skips it entirely**, wait included, so `progress` stays at 0 and the solve is
reported at once.

`celebration.spec.tsx` checks the surge and the flare partway, complete and not-finishing, along with the
refused tap.

## 11. Deferred

### 11.1 Not built

- **Prisms and colour splitting.** The catalogue rules this a different puzzle shape rather than a knob,
  and points at The Talos Principle as prior art. It is also the piece that would make loop detection
  load-bearing (§3): one incoming direction becomes two outgoing ones, so a beam state can have two
  predecessors and the no-loops argument collapses.
- **"Light the shrine at the fifth hour."** `story-and-time-brainstorm.md` proposes a timed variant
  reusing these exact pieces once a tick/scrub control exists — the obelisk shadow sweeping one column an
  hour. Same pieces, new problem.
- **A three-stop edge-on mirror**, `{0°, 45°, 135°}`. A stop lying along the beam passes it, which is the
  sliding wall's "get out of the way" verb in one cell instead of three. It needs the stop set built from
  the bend's **arrival** direction — a flat stop in front of a beam coming down a column retroreflects up
  the route, where no wall may go, and the draft dies — and it costs 1.5× per piece against 1×. A
  hand-authored board in `techniques.spec.ts` keeps the walk and the two-ray derivation honest; nothing
  generates one.
- **Making the exhaustive rungs walk the reachable deviation tree.** T7 `onlySurvivor` enumerates the
  whole configuration product, and generation costs almost exactly what that rung costs — 97.65ms of a
  98.97ms wizard board. `reachableDeviations` already answers the neighbouring question 13× to 836×
  cheaper by never visiting the settings downstream of a dead beam, and the same trick applies. **The last
  measured bottleneck in the family**, and what wizard's multi-second worst board is made of.
- **A better difficulty metric than the cap** (§6.3). "Seen from the door" is retired as the ramp and
  `lightbeamConfig.ts` says why: a board whose fork went from 5 shapes to 23 reads as very slightly
  _easier_ on it, because following a wrong turn costs one tap. Replacing it is separate work, and expert
  and master will need reseparating when it lands — they read as one tier on the current measure, and what
  parts them is a rung rather than the geometry of a wrong branch.
- **Master at three stops.** Measured and affordable — 210ms worst, 23 distinct forks — and not taken,
  because master's addition is already the diagonal cut and §6.4 allows one new word a tier. The numbers
  are in `lightbeamConfig.ts` for whenever the ladder is re-cut.
- **Shipping the solve alongside the seed.** A hint is a full solve, so the top tier's hint latency rises
  with its configuration space; the per-board cache already gets that down to one press, which is what
  makes this wait. About 400 bytes a board against ten for the seed alone — a bundle-size question for the
  day a hint's latency is the thing players notice.

### 11.2 Ways to measure this family wrongly

Each has been walked into at least once, and each looks like a generator bug while it is happening.

**A decoy's setting is free by construction.** The light never reaches it, which is what T6
`neverReached` proves — so "every wrong setting fails" is false over all mirrors and true only over the
pieces the winning beam crosses. Asserted the wrong way round, it says a decoy is not a decoy.

**Uniqueness is one winning route, not one winning configuration.** The two coincide only on a board with
no free piece. Any tier that puts a mirror off the winning beam's line has many winning configurations.

**`Direction` is an index and `DIR.right` is `0`.** Never test a direction for truthiness. This has
shipped twice: the beam drawn with holes in it for every rightward cell, and a beam escaping rightward
drawing no marker. `MirrorAngle` has the same hazard at `0` (flat), and both have specs asserting the zero
case rather than a comment hoping for it.

**A drawing gate that only asks whether a _piece_ can be read.** The beam is the only thing on the board
that answers a tap, so a beam with holes in it breaks the trial loop rather than the deduction one — and
trial is only cheap if you can see what your tap did, which is the premise §4 rests on. Ask of the beam
what is asked of the glyph.

**A mode that cannot be delivered has to reject, not degrade.** A fallback firing quietly makes a whole
pool decorative while every other measurement looks healthy (§7.2).

### 11.3 The board that proves §5's recursion is needed

§5 step 4 recurses wherever a corridor enters a cell a tappable piece can occupy. The cheaper invariant —
_no branch may share a `(cell, direction)` pair with the golden path_ — is **not sufficient**, and this
5×5 is why. Found by sampling 400 000 random boards and keeping those where every single-piece deviation
satisfies it.

```
 · · · X ·     S  disc (3,4), facing left      A  (3,0) stops {112.5°, 135°}
 C # · # ·     X  shrine (0,3)                 B  (2,1) stops {0°, 45°}
 · B · · ·     #  wall                         C  (1,0) stops {22.5°, 67.5°, 135°}
 A · · · S
 · · · · ·
```

Golden: left along row 3, **A** turns it up to **C**, C bends it down-right into **B**, B bends it
up-right to the shrine. All four single-piece deviations are safe — three escape the frame, one is
absorbed by the disc, none rejoins. And yet the configuration that moves **all three** lights the shrine
by a second, shorter path: A's wrong stop sends the beam up-right into **B's cell**, and B at _its_ wrong
stop bends it to the shrine, skipping C.

**The mechanism is the finding.** A branch entering a cell that holds a **tappable** piece is not one
corridor — it is one corridor per stop of that piece, because `(cell, direction)` determines the future
only where the cell's content is fixed. Authoring covers the stop the branch was traced against; the
others exist, and the pair invariant says nothing about them.

Rate: **1 in 949** boards that satisfied the invariant, and that is a floor rather than an estimate — a
branch that turns needs a mirror, and that mirror is another piece for some other branch to walk into, so
reuse is manufactured by branch depth. At one turn a branch it runs 4.7 reuse fan-outs a board.

The board is transcribed into the spec as the regression test: the deviation tree reports two winning
routes at one reuse fan-out, which is what tells the two rules apart.

### 11.4 Measured and rejected

Kept as one line each, so nothing here gets rebuilt on the strength of the idea alone.

**Mirror geometry**

- **A retracted third mirror state** (`/`, `\`, out of the way) — buys a third more reach at no piece
  cost, and the diagonal cut beats it with one piece rather than every mirror (49.5 cells against 48.5 at
  wizard, 27.0 against 20.2 at starter).
- **Four 45° rotation states** (`/`, `\`, `|`, `—`) — identical reach and identical route counts to
  retraction, at **232×** the enumeration against 23×. The two extra angles reverse the beam, which sends
  it back through the half of the board it has already crossed, toward the disc, which absorbs. It also
  makes a mirror block or pass depending on the direction of arrival, so "can the light get through here"
  stops being answerable from the cell.
- **Half-step-only stop sets** — `{22.5°, 157.5°}`, or all four half-steps. They do not add the diagonal,
  they **remove the quarter turn** every other piece and the route itself depend on: reach collapses to
  under a third of today's and almost no board lights. **A stop set must keep a quarter turn** — which is
  what makes each half-step angle have exactly one legal partner, the diagonal three eighth-turns away.
- **Eight-state cut mirrors** — 22.5° apart is the subtle rotation §9 forbids, and 4× per piece. Two
  stops 67.5° apart do the same job at 1×.
- **Straight and diagonal angles alone** cannot put light on a diagonal: those are the even orientations,
  they preserve parity, and closing the direction set under them from `right` yields only the four square
  directions. A mirror at an odd multiple of 22.5° is the only thing that reaches the diagonal.

**Drawing**

- **A ring in as many segments as the piece has stops** — a mirror is a diameter, so it crosses and
  occludes the annulus meant to annotate it; mush at 35.3px at every count. The mark was right and the
  bearings were wrong: ticks drawn only at the stops the piece is **not** in are the one set the bar can
  never touch.
- **Pips counted like dice** — countable to about three, then they collide with the bar's ends, and they
  say how many stops there are rather than **which**.
- **A radial tick** — collinear with the beam whenever a stop's line is the line the beam leaves on, so it
  came out cream under `mix-blend-screen` and broke §9's "nothing but light is drawn amber". Laid
  tangentially it cannot be collinear with anything radial.
- **Telling a cut mirror from an ordinary one by a fill** (solid bar against hollow plate) — one bit, and
  it only says anything while there are two flavours to distinguish. Authoring varied stop lists silences
  it.
- **Wire separation as a fourth generation gate** — the ambiguity where two wires meet at a corner was
  never geometric, it was that both were the same green. Per-socket hues settled it and the generator kept
  its three constraints.
- **A cell-corner end marker for a diagonal beam** — a corner is the one point §3's corner rule gives the
  opposite meaning to, it lands in a four-cell junction on a 9-wide grid, and rivets are drawn at corners.
  Both markers sit at the cell centre.

**Generation**

- **Branch uniqueness from the `(cell, direction)` pair invariant alone** — insufficient; §11.3 is the
  board.
- **`thinWalls` on an authored board** — it re-checks uniqueness and the ladder, passes, and strips
  exactly the stone holding branches out of tappable cells. Of 722 authored walls only 30 are load-bearing
  for uniqueness; the other 692 are load-bearing for the proof.
- **A socket placed on a wrong setting's own ray**, the way shadows are placed — **23 traps across 120
  boards, every one decoration**, because the setting it was meant to kill was already dead. A trap has to
  be the _only_ reason a wrong setting fails, so that setting must otherwise reach the shrine, which is
  why a trap needs a generator that routes one there on purpose.
- **Widening `spacedFrom` to diagonal neighbours** — over 200 boards on every tier, no winning beam links
  two movable pieces a diagonal step apart. It is a tap-accuracy rule, and diagonally adjacent targets
  already touch at their corners.
- **Giving every mirror the full fork** — `forkSize` is a maximum drawn per piece, not a length. Uniform
  three-stop mirrors cost 71 005 configurations against 20 435 for the same variety.

**Difficulty**

- **Shifting every tier's dials down a rung**, to fix the bottom two not being puzzles — the tier below
  was not a puzzle either, so starter inherited junior's trail.
- **Three-stop forks as the starter fix** — doubles the configuration space and changes nothing: every
  wrong stop still visibly dies, so the solving mode is identical. **Choice in the configuration space is
  not the same as a decision**; only a piece off the winning beam's line buys one.
- **A generation-time budget as a design constraint.** It twice decided a design question silently — a
  decoy dropped from wizard to afford a three-stop fork, and branch depth held at one because two turns
  measured at 8.5 seconds — and neither was recorded as a decision, because **the cost of an opportunity
  not taken leaves no measurement behind**. A budget is the right instrument for a cost the player pays
  and the wrong one for a cost a build machine could pay instead (`puzzle-screens.md` §6.1).
