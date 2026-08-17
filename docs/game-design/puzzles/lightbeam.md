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

| Piece            | Fixed or movable | States    | What it does                                    |
| ---------------- | ---------------- | --------- | ----------------------------------------------- |
| **Sun-disc**     | fixed            | —         | Emits the beam, one cell on an edge, one facing |
| **Shrine**       | fixed            | —         | The target. Lights when the beam arrives        |
| **Set mirror**   | fixed            | —         | A given, like a Sudoku clue                      |
| **Wall**         | fixed            | —         | Absorbs the beam                                 |
| **Turn mirror**  | movable          | 2         | Tap cycles `/` ↔ `\`, position fixed             |
| **Sliding mirror** | movable        | 2–3       | Fixed angle, tap cycles between authored stops   |
| **Sliding wall**  | movable         | 2–3       | Tap cycles between stops — moved out of the way, or into it |

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

| #      | Technique          | Fires when                                                             | Decides                        |
| ------ | ------------------ | ---------------------------------------------------------------------- | ------------------------------ |
| **T0** | Forced entry run   | The run from the sun-disc crosses only cells nothing movable can change | Those cells carry the beam     |
| **T1** | Forced exit run    | Same, traced backwards from the shrine                                 | Those cells carry the beam     |
| **T2** | Dead end           | One state of a piece sends the beam to a wall or edge with no unsettled piece left on the way | That state is impossible       |
| **T3** | Only one feeds it  | Exactly one piece-state can send the beam along the forced exit run     | That state is forced           |
| **T4** | Never reached      | No configuration puts the beam on this piece at all                    | Its state is free — a decoy    |
| **T5** | Only one survives  | Every arrangement of the remaining pieces fails, save with this one in this state | That state is forced   |

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

1. Route a beam from sun-disc to shrine, dropping a mirror at each turn.
2. Fix some of those mirrors as givens, make the rest movable, and set the movable
   ones to a **wrong** starting state so the board opens unsolved.
3. Scatter walls, decoy mirrors and sliding pieces off the path.
4. **Gate — the path is unique.** Enumerate every configuration; every one that
   lights the shrine must trace the *same path*. Decoys may be free (that is what
   makes them decoys), but the route may not be ambiguous.
5. **Gate — deduction reaches it.** The ladder, capped per tier, must settle every
   piece on the path. A board that stalls needs a guess and is discarded.
6. **Gate — the board opens unsolved**, and no single tap solves it at tiers above
   starter.

Gate 4 is the honest form of uniqueness for this family. "Exactly one winning
configuration" would be the wrong test: a decoy has a free state, so a board with
decoys has many winning configurations and only one winning *route*.

## 6. Difficulty

Every tier gets a full configuration — this family is not gated to a debut tier.
Where it appears is authored per node (`encounter: "lightbeam"`), and the tag
allocator may also draw it anywhere from starter up.

That matters more than it looks: **a starter corridor can sit behind a ward gate
deep inside a wizard pyramid**, so a starter board is not only ever seen by a
beginner. Starter must therefore be *gentle*, not *empty* — a board with a real
route to find, just a short one with few pieces and a low technique cap.

| Tier    | Grid | Movable pieces | Cap | Vocabulary                     |
| ------- | ---- | -------------- | --- | ------------------------------ |
| starter | 5×5  | 2–3            | T2  | Turn mirrors, walls            |
| junior  | 5×5  | 3–4            | T3  | + sliding mirrors              |
| expert  | 6×6  | 4–6            | T4  | + sliding walls, first decoys  |
| master  | 6×6  | 6–7            | T5  | Decoy density up               |
| wizard  | 7×7  | 7–9            | T5  | Longer chains, more decoys     |

Knobs, in order of how much they actually move difficulty:

- **Technique cap** — what a board may _demand_. The honest dial, as everywhere.
- **Turn count on the route** — how many mirrors the beam must bounce off.
- **Decoy count** — pieces the player must reason are irrelevant.
- **Set-vs-movable mirror ratio** — set mirrors are scaffolding, like givens.
- **Grid size** — footprint, and how long each run is.

7×7 is the ceiling for the same reason the other grid families cap there: inside
the encounter modal a 360px screen leaves the board about 320px, and 44px tap
targets do not survive an eighth column. There are no gutters to reclaim here, so
a cell is simply `board / N`.

## 7. Controls

One gesture: **tap a piece to cycle it**. Turn mirrors cycle orientation, sliding
pieces cycle to their next stop. Fixed pieces ignore taps. No drag, matching the
rest of the game.

A sliding piece draws its track faintly, so where it *can* go is visible before it
is tapped rather than discovered by tapping.

**No undo.** A cycle is its own inverse — tap round again and the piece is back —
so the Futoshiki argument for undo (a placement destroying work elsewhere) does
not apply. Nothing a tap does here is unrecoverable.

**Hints stay**, and cost almost nothing: the solver is mandatory for gate 5, so a
hint is the same `nextStep` call the generator already makes. Dropping them would
save two locale blocks and forfeit the only thing that teaches a player who cannot
yet see the deduction — leaving them to flip pieces at random, which is the failure
mode this family has to avoid. A hint lights the piece it names **and the beam
segment its reason is about**; "the light dies here" means nothing without showing
where.

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
