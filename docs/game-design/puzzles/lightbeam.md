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
becomes load-bearing the moment a piece bends light by anything other than a quarter turn,
which is exactly what the deferred prism (§11) does. `beam.spec.ts` proves both halves: the
ring loops when the light starts inside it, and the disc's beam never loops.

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
| **T2** | Dead end          | One state of a piece sends the beam to a wall or edge with no unsettled piece left on the way | That state is impossible    |
| **T3** | Only one feeds it | Exactly one piece-state can send the beam along the forced exit run                           | That state is forced        |
| **T4** | Never reached     | No configuration puts the beam on this piece at all                                           | Its state is free — a decoy |
| **T5** | Only one survives | Every arrangement of the remaining pieces fails, save with this one in this state             | That state is forced        |

T0/T1 are facts; T2–T5 are eliminations; propagation between them is the fixpoint
loop, as in the other families.

### 4.1 Why T5 is ranked last

T5 subsumes T2 and T3 — a solver could be T0/T1/T5 alone. It is ranked last for
the same reason Sumplete ranks its candidate-intersection last: its reason is "I
tried the alternatives and they all fail", which teaches nothing. T2's reason is a
sentence a child repeats back and can check by eye: _"face it that way and the
light dies in the wall, with no mirror left to save it."_

### 4.2 T4 is the point, not a footnote

The catalogue names "elimination of irrelevant pieces" as this family's skill. T4
_is_ that skill, and it is the only technique in any family whose conclusion is
"this piece does not matter". It makes decoys a first-class part of the puzzle
rather than clutter, and it gives the hint engine something genuinely useful to
say: _"the light never reaches this one, whatever you do."_

## 5. Generation

The configuration space is the product of the movable pieces' state counts —
`2^rotate · stops^sliding`. At nine pieces that is under 20 000 traces, each a walk
over at most 49 cells. **This family can afford exact enumeration**, which Sumplete
and Futoshiki cannot, and the gates below spend that freely.

1. Route a beam from sun-disc to shrine, dropping a mirror at each turn. Legs never
   revisit a cell, so the route never crosses itself — a crossing traces fine but
   puts two reasons on one square, and every technique points at a square. The final
   leg runs to the frame, which sets the shrine in the wall: an edge shrine has at
   most three approaches and the frame kills most of those, which is what lets T1
   fire at all.
2. Fix some of those mirrors as givens, make the rest movable, and set the movable
   ones to a **wrong** starting state so the board opens unsolved.
3. **Wall off the wrong settings.** For each movable piece, the light under its wrong
   setting has to run out — off the frame, or into a wall — before it meets anything
   else the player controls. That is what makes T2's reason available, and the piece
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

| Tier    | Grid | Movable pieces | Configurations | Cap | Vocabulary                    |
| ------- | ---- | -------------- | -------------- | --- | ----------------------------- |
| starter | 5×5  | 3.0            | 8              | T2  | Turn mirrors                  |
| junior  | 5×5  | 3.7            | 14             | T3  | + sliding mirrors, 1 shadow   |
| expert  | 6×6  | 5.8            | 57             | T4  | + sliding walls, first decoys |
| master  | 6×6  | 6.6            | 105            | T5  | 2 shadows                     |
| wizard  | 7×7  | 8.4            | 371            | T5  | Longer chains, 3 shadows      |

Piece and configuration counts are measured means over 40 seeds a tier, not
intentions. The ramp is asserted in `generateLightbeam.spec.ts` — the first pass at
this table read right and played wrong, with junior boards _smaller_ than starter
ones.

### 6.1 The cap does not bite on its own

This is the one thing about the family that had to be discovered rather than
designed. Built as §5 steps 1–3 describe, **every board is a chain of T2 and nothing
more**: every wrong setting has a wall or a frame edge waiting for it, so the light
visibly dies and the stronger rungs never have to fire. A wizard board would then
solve exactly like a starter one, only longer — the cap would be a label.

**Shadow pieces** are the fix, and they work from the other end. A shadow is a decoy
placed deliberately in the stretch a wrong setting would light. With something
unsettled standing in the way, the light does not visibly die — it disappears into a
piece nobody has pinned down yet. T2 has nothing to say, and ruling that setting out
takes T3 or T5. The shadow is still a genuine decoy (no winning beam touches it), so
T4 still frees it, and it is still the player's job to work out that it never
mattered.

Measured effect at wizard, over 40 seeds: with no shadows, T5 fires on 3 boards; with
three, on 28, and T2 alone carries only 14. That is the difference between a tier
table and a tier.

Knobs, in order of how much they actually move difficulty:

- **Technique cap** — what a board may _demand_. The honest dial, as everywhere.
- **Shadow count** — what makes it demand it. Useless without the cap, and the cap is
  decorative without it.
- **Turn count on the route** — how many mirrors the beam must bounce off.
- **Decoy count** — pieces the player must reason are irrelevant.
- **Set-vs-movable mirror ratio** — set mirrors are scaffolding, like givens.
- **Grid size** — footprint, and how long each run is.

7×7 is the ceiling for the same reason the other grid families cap there: inside
the encounter modal a 360px screen leaves the board about 320px, and 44px tap
targets do not survive an eighth column. There are no gutters to reclaim here, so
a cell is simply `board / N`. Measured in the encounter modal at 360×640: the board
comes out 318px, so a wizard cell is **45px** — over the bar, and an eighth column
would be 40px.

## 7. Controls

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

**No undo.** A cycle is its own inverse — tap round again and the piece is back —
so the Futoshiki argument for undo (a placement destroying work elsewhere) does
not apply. Nothing a tap does here is unrecoverable.

**Hints stay**, and cost almost nothing: the solver is mandatory for gate 6, so a
hint is the same solve the generator already runs. Dropping them would save two locale
blocks and forfeit the only thing that teaches a player who cannot yet see the
deduction — leaving them to flip pieces at random, which is the failure mode this
family has to avoid. A hint lights the piece it names **and the beam segment its
reason is about**; "the light dies here" means nothing without showing where.

### 7.1 A hint here is not a correction

Every other family's hint can start with "that number is wrong". Here **every setting
is a legal setting**, so there is nothing to be wrong about in that sense. A hint is
instead _the first reason the player has not yet acted on_: the deduction is replayed
from a blank board, and the hint is the earliest step whose conclusion the board in
front of them contradicts. Follow it and the hint moves on by itself.

T4 gets the second pass, and only when nothing is actually set wrong — otherwise the
game would be telling the player to ignore a piece while the route is still broken.
That makes it the one hint in the whole catalogue whose advice is to leave something
alone.

## 8. Board requirements

Beyond the shared screen bar:

- **The beam is always drawn**, from the sun-disc to wherever it currently ends.
  This is the family's live feedback, the equivalent of the balance scale's tilt.
- **The beam's end is marked** — absorbed, escaped, or looping — so a beam that
  stops short does not read as a rendering fault.
- Movable pieces read as movable at a glance, and a sliding piece's track is
  visible.
- Both mirror orientations read as visibly different objects, not a subtle
  rotation, at 44px.

## 9. Theming

Already written into the lore: `story-and-time-brainstorm.md` puts mirrors at the
**Lighthouse of Alexandria** journey and names a **"Letting the Sun In"** theme,
alongside the sundial and water clock. This family is the centre of that sun-god
cluster.

The component emits logical state only — `sunDisc | shrine | mirror(a|b) | wall`,
plus the traced path and its end reason. Colour, texture and glyph live in the
skin.

## 10. Value output

Side family — the answer is a route, not a number, so it does not feed
carry-forward (`PUZZLE_FAMILIES.md` P3).

## 11. Deferred

- **Prisms and colour splitting.** The catalogue already rules this a different
  puzzle shape rather than a knob, and points at The Talos Principle as prior art.
- **"Light the shrine at the fifth hour."** `story-and-time-brainstorm.md` proposes
  a timed variant reusing these exact pieces once a tick/scrub control exists —
  the obelisk shadow sweeping one column per hour. Same pieces, new problem.
- **Offline seed tables.** The direction recorded in `futoshiki.md` §11 applies
  here too, and this family wants it less: enumeration is cheap, so generation is
  fast without it.

### 11.1 Switch nodes — the next thing to build

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

1. A node the light can never cross, so its wire never fires — today's T4, one level up.
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

A node is fixed scenery with no state and nothing to tap, so the control scheme stays at
exactly one gesture.

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

### 11.2 Puzzle goals — pick two dials and turn them hard

Every tier currently turns every dial a little. Read the wizard row of `LIGHTBEAM_CONFIG`:
five turns, one set mirror, two sliding mirrors, one sliding wall, one decoy, three shadows.
Every wizard board is the **average** wizard board.

A **goal pool** fixes that: generation draws one or two goals per board and turns those
dials hard, leaving the rest slack. Boards then have character instead of mean settings —
and with 158 lightbeam nodes in the world, that is likely a bigger variety win than any new
piece type. It also adds the axis the family is missing: difficulty (cap, size) is one
thing, **what kind of problem this board is** is another, and they are currently welded
together.

The pool, and what each is built from:

| Goal                    | Built from                    | Tests                      | Needs   |
| ----------------------- | ----------------------------- | -------------------------- | ------- |
| **Long chain**          | turns high, decoys 0          | route-tracing              | nothing |
| **Sort the wheat**      | decoys high, turns low        | which pieces matter (T4)   | nothing |
| **Clear the way**       | sliding walls on the route    | does the light get through | nothing |
| **Blind alleys**        | shadows high                  | the exhaustive rung (T5)   | nothing |
| **Order of operations** | a node whose door blocks late | ordering                   | §11.1   |
| **Steer clear**         | a harmful node on a wrong ray | avoidance                  | §11.1   |

**Four of the six need no new mechanic** — they are a re-scheduling of knobs that already
exist. That version is cheap, and it is worth building **before** the family is playtested
rather than after: judging the current build means judging one recipe five times, whereas
with goals you would be judging the spread, which is the thing actually worth knowing.

Two things it has to get right:

- **A fallback ladder.** If the chosen pair will not generate inside the attempt budget,
  drop to one goal, then to none — and `log` which, because a silent fallback that always
  fires makes the whole pool decorative. This is the same discipline as "no silent caps".
- **The gates stay untouched.** A goal shapes what gets _placed_; it never shapes what gets
  _accepted_. Path uniqueness and the ladder still decide, so no goal can smuggle through a
  board that needs a guess.

It softens the tier table in §6: piece and configuration counts become per-goal ranges
rather than the flat means measured there, and `generateLightbeam.spec.ts`'s monotonicity
assertion would have to hold in aggregate over a tier rather than board by board.

Worth noting for later: nothing about this is specific to lightbeam — Futoshiki could draw
technique-flavour goals the same way. Build it here first and only generalise if a second
family actually wants it; a shared abstraction on one caller would be the premature kind.
