# Star Battle

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.24; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to
Star Battle: what the player is deducing, its technique ladder, and how generation
proves a board needs the reasoning its tier claims.

> **Nothing here has been played.** Every number below was measured with a throwaway
> generator and technique solver written to settle the two questions the catalogue left
> open — whether a region map alone can carry a board (§4.1) and whether the region
> rungs carry a ladder (§3.4). Both answers changed the design, so they are recorded
> here rather than discovered during the build. Solve times are still targets, and the
> lab (`src/app/dev/PuzzleLab.tsx`) is what settles them.

## 1. Rules

Stars go in a square grid carved into as many regions as the grid has rows:

- **One star to a row, a column and a region** — every row, every column and every
  region holds the same fixed number of stars, and at the tiers below wizard that
  number is one.
- **No two stars touch**, diagonals included.
- **Blocked squares** — some squares are hatched and hold nothing. They are part of the
  board, not part of the answer, and they refuse a tap.

This is Star Battle's rule set with one addition, and §4 is why the addition exists.

Nothing else. The board carries no language: a region is a drawn boundary, a star is a
shape, and the answer is entered by tapping.

## 2. Why this family

**It is the first family whose clue is a shape rather than a number.** Sumplete,
futoshiki, balance scale and constellation all count; eclipse compares marks along a
line. Here the constraint the player reasons from is **where a boundary runs** — a
region is a group that is not a line, which is a kind of grouping nothing else in the
catalogue owns.

**It is sparse where eclipse is full.** Eclipse fills every square with one of two
marks and each line owes half of each. Star Battle places a handful of stars in a field
of empty squares, so the player's move is mostly _ruling out_ — the cross-hatch around
a placed star, and the squares a region can no longer use. That is a different feeling
at the fingertips even where the arithmetic rhymes.

**The distinctness question the catalogue asked, answered honestly.** §4.24 asked
whether regions and the no-touching rule carry a ladder of their own or whether this
plays as eclipse with a jigsaw drawn on it. Measured: the regions carry **mechanism**
but not much **ladder**. Capping the solver below every region rung still produces
boards, and they carry only about two more blocked squares than boards built to the full
ladder (§3.4). So this family's claim to a slot rests on the board _playing_ differently
— sparse placement, cross-hatching, a boundary as the clue — and not on reaching a
deduction eclipse cannot. That is a weaker claim than constellation's, and it is the
thing to re-examine first if the built family disappoints.

## 3. The deduction ladder

Ordered by how well each reason **explains itself**, not by how much it decides — the
same rule eclipse's and futoshiki's ladders follow, and for the same reason: a hint that
always says "I counted the whole board" teaches nothing.

| #      | Technique    | Fires when                                                      | The sentence                                             |
| ------ | ------------ | --------------------------------------------------------------- | -------------------------------------------------------- |
| **T0** | `touch`      | A star is placed                                                | "A star here, so nothing touching it"                    |
| **T1** | `groupFull`  | A row, column or region already holds its stars                 | "This region has its ⭐, so the rest is dark"            |
| **T2** | `groupTight` | A group owes as many stars as it has squares left               | "One ⭐ owed and one square left"                        |
| **T3** | `regionLine` | A region's free squares all sit in one row or column            | "This region's ⭐ has to come from that row"             |
| **T4** | `lineRegion` | A row or column's free squares all sit inside one region        | "That row's ⭐ is this region's, so the region is spent" |
| **T5** | `spanning`   | Two regions whose free squares fit in two rows (or two columns) | "These two regions fill those two rows between them"     |

**T0 is propagation, not a step.** Placing a star darkens its eight neighbours, and no
board asks the player to work that out — it is the rule made visible. It is a rung only
so a hint has something to say on the first move of a board, and so the screen can dim
the neighbourhood as the star lands.

**T1 and T2 are the same count read two ways** — what a group has, and what it has room
for. They are the bulk of every board (§3.4), and they are what makes the family teach
itself: a starter board is nothing but these two.

**T3 and T4 are the family's own reasoning**, and the only rungs that need the region
boundary to mean anything. Both are one reading of the board: point at a region, point at
a line, say which owes the other. The pair is not symmetric in practice — a region
squeezed into one line is common, a line squeezed into one region needs the rest of the
line already dark, so T4 arrives later in a solve.

### 3.1 T5 is the rung that may not survive its own sentence

`spanning` generalises T3 and T4 to two groups at once, and two is where it stops:
three-group spans were not implemented because the sentence stops fitting a
phone-width banner, which is the constraint §3 of every family doc holds a rung to.
Even at two, "these two regions fill those two rows between them" asks the player to hold
four things at once, and it is the one rung here whose reason may be truer than it is
checkable. **Build it, then read its hint on a real board before letting a tier require
it** — if the sentence does not survive, wizard is more board and a bigger `regionLine`
quota, the way eclipse's top tier is more board rather than a deeper rung.

### 3.2 The adjacency-capacity rung was cut

An obvious sixth rung: inside a group owing _m_ stars, count the largest set of free
squares that could hold stars without touching, and if that count is exactly _m_, every
square whose removal drops it below _m_ must hold a star. It is sound, it is a real
Star Battle technique, and it **never fired** — not on one board, at any size from 5×5 to
8×8, at any cap. Boards that would need it are settled several rungs earlier by T1 and
T2. It is not in the ladder, and it should not be added without a board that demonstrates
it.

### 3.3 Soundness needs a guard from the first commit

Eclipse learned this the expensive way (its §7.1): generation solves each board once
along one path, so a rung that is wrong from states that path never visits ships a board
that cannot be finished. Star Battle's exposure is worse than eclipse's, because two of
its rungs reason about _sets of groups_ rather than one line, and the blind spot is a
cover that mixes rows with columns — the throwaway probe had exactly that bug, and it
silently settled boards to answers that broke the no-touching rule. **`spanning` sweeps
rows and columns separately, never together**, and a soundness spec of the shape eclipse
ships (fill a random subset of the true answer, walk the ladder, check every decision
against it) is part of the first commit rather than a follow-up.

### 3.4 What the ladder is actually worth

Measured over eight boards a size, `k = 1`, thinning included:

| Size | Blocked squares at cap `groupTight` | at cap `spanning` |
| ---- | ----------------------------------- | ----------------- |
| 6×6  | 8.9                                 | 7.9               |
| 7×7  | 11.8                                | 9.6               |
| 8×8  | 16.5                                | 14.6              |

Four rungs of ladder buy **two blocked squares out of sixty-four**. And the step mix at
8×8 with the whole ladder available is 156 `groupFull`, 64 `groupTight`, 47 `regionLine`,
27 `lineRegion` and 22 `spanning` — seventy per cent of a solve is the two rungs a player
learns in the first minute.

This is §3.2 of the catalogue — bookkeeping rather than difficulty — and it is the same
objection standing against Circuit (§4.23). It does not sink the family, because Star
Battle's steps are **cheap**: darkening the squares around a star is a reflex, where
eclipse's counting step is a thought. But it does decide the sizing (§5) and it is the
reason the top tier is a measurement rather than a plan.

## 4. Generation

Build then thin, the same shape as eclipse and futoshiki — but the thing being thinned is
not what the catalogue expected.

1. **Place the stars first.** For `k = 1` that is a permutation of columns with no two
   adjacent rows within one column of each other — backtracking, no rejection loop.
2. **Draw the regions around them.** Seed one region per star and grow them
   orthogonally, feeding the smallest region each step, until every square is claimed.
   Contiguity is free this way, and every region holds exactly its quota by construction.
3. **Block every square that is not a star**, which is the answer stated in full.
4. **Unblock squares one at a time**, keeping each removal only while the technique
   solver still reaches the answer unaided.
5. Keep the board only if its solve actually **used** the rung its tier introduces.

**Step 1 before step 2, and that ordering is the whole family.** Draw the regions first
and the star set has to be found inside them, which is a rejection loop that mostly fails;
draw them around a set already placed and every region holds its quota by construction.

### 4.1 Why blocked squares exist at all

The catalogue's plan was "draw regions, place a legal star set, then check a technique
solver reaches it unaided" — a region map as the only clue, with nothing to thin. **That
does not work**, and the margin is not close. Region maps grown around a star set admit
several answers each:

| Size | Unique answers, balanced region sizes | with sizes deliberately skewed |
| ---- | ------------------------------------- | ------------------------------ |
| 5×5  | 0 / 200                               | 36 / 200                       |
| 6×6  | 0 / 200                               | 4 / 200                        |
| 7×7  | 0 / 200                               | 0 / 200                        |
| 8×8  | 0 / 200                               | 0 / 200                        |

Skewing region sizes — a two-square region beside a twelve-square one, which is what
hand-made Star Battle grids look like — rescues 5×5 and does nothing above it. Published
Star Battle grids are _hand-carved_ to be unique; that is a search over region shapes, and
it is not a rejection loop that terminates.

So the family gets a **second clue layer that can be thinned**, and blocked squares are
the cheapest one that adds no vocabulary: a hatched square is wordless, it is the same
device Circuit would use (§4.23), and it turns generation back into the build-then-thin
loop every other family here already runs. Uniqueness comes out of the same gate as
everywhere else — every intermediate board was solved by forced steps, so the board that
ships has one answer and no solution counter runs.

**The trade is real and worth naming**: a board with a fifth of its squares hatched is
not the puzzle a Star Battle player would recognise, and the hatching does some of the
work the region map was supposed to do. The alternative was a generator that carves
regions to fit a deduction, which is a different and much larger machine.

### 4.2 Cost

Drawing and thinning a board is **1–6ms** from 5×5 to 8×8 — three orders of magnitude
under eclipse's wizard draw, because thinning is one pass over the squares and the
technique solver is linear in the board. Whatever this family's problems are, generation
cost is not among them, and there is room to spend it: the tier's required-rung quota can
throw away most draws and still be free.

## 5. Difficulty knobs

- **Technique cap** — how far up the ladder a board's solve may reach. Weak here, by
  measurement (§3.4), and the honest reason to keep it is the ramp: a starter board that
  cannot need T3 is a board that teaches T1 and T2 alone.
- **Required rung and its quota** — which technique the solve must spend, and how often.
  **One is not a tier**, the same rule eclipse's config states.
- **Grid size** — the knob that actually moves this family, and the one the catalogue
  warns about. Here it moves the right thing for once: a wider grid is more regions, and
  a region is a clue rather than bookkeeping.
- **Stars per line** — one everywhere below wizard. Two is the classic hard Star Battle
  and it is **untested** (§10).

| Tier    | Size | Stars | Cap          | Requires        |
| ------- | ---- | ----- | ------------ | --------------- |
| starter | 5×5  | 1     | `groupTight` | —               |
| junior  | 6×6  | 1     | `regionLine` | `regionLine` ×1 |
| expert  | 7×7  | 1     | `lineRegion` | `lineRegion` ×2 |
| master  | 8×8  | 1     | `spanning`   | `lineRegion` ×4 |
| wizard  | 8×8  | 1     | `spanning`   | `spanning` ×3   |

**7×7 is the size this family is really about.** It thins to 6–13 blocked squares and
about twenty non-trivial steps, which is a board with something to think about that is not
a sweep. 6×6 comes out at roughly thirteen — thin enough that it reads as a junior board,
which is where it sits. 8×8 is a hundred and sixty non-trivial steps, three times
eclipse's wizard, and the two top tiers share it because the alternative was 9×9 and the
step count is already the risk.

**The top two tiers share a size and differ only in the rung they must spend**, which is
the weakest tier separation in the catalogue. It is written down as the starting point for
the lab, not as a claim: if `spanning`'s hint does not survive §3.1, wizard becomes 8×8
with a `lineRegion` quota of six and master drops to 7×7.

## 6. Controls

**One tap per square, cycling empty → star → dark → empty.** Three states, and unlike
eclipse the middle one is the only part of the answer — `dark` is the player's own
bookkeeping, and the win condition ignores it entirely. That matters here in a way it
does not in eclipse: this family's reasoning IS elimination, so the mark that says "not
here" is the one the player uses most, and a board that could not record it would make
them hold the cross-hatch in their head.

**Blocked squares are not a fourth state.** They belong to the board, they refuse a tap,
and they are drawn to look like part of the grid rather than part of anyone's answer.

**One button: undo**, in the place and the shape futoshiki and eclipse put it. A tap
already takes one square back, so undo is for stepping off a run of squares darkened on a
wrong reading — which, given §3.4's step mix, is the mistake this family will actually
produce.

## 7. Hints

One per rung, keyed by technique, rendered from a template
(`puzzle-screens.md` §4). The hint **names the move, never the answer**, and it points at
the squares, the region boundary and the line it reasons from.

**Two orders, because two jobs.** The ladder (§3) is ordered by strength and decides what
a tier may be built to need. A hint is ordered by **what a player spots first**: a star
whose neighbours are still open, then a group with its stars already in, then a group down
to its last square, then the region-against-line readings, and `spanning` last.

**A region hint has to point at the region, not describe it.** "This region's star has to
come from that row" is checkable only if the boundary lights up while the row does — a
hint that names a region in words has already failed, because the board carries no names.

**A hint is only derived once asked for**, the same rule eclipse states: the top rung
sweeps pairs of groups, and putting that on every tap buys a string nobody asked to read.

**A wrong star is reported before anything else.** Every rung reasons from what the player
put down, so once one star is misplaced the advice after it leads nowhere.

## 8. Board requirements

Beyond the shared screen bar:

- **A region boundary is a drawn edge, not a fill.** Colour alone cannot carry the
  clue — with as many regions as rows, a palette that separates them all is a palette
  nobody can tell apart at arm's length, and a colour-blind player reads none of it. Thick
  strokes on the shared edges carry the shape; a low-alpha tint may sit under them, and it
  is decoration.
- **A star is a shape, and the dark mark is visibly the player's.** Smaller, lighter, and
  never the same weight as a star — the board must never look as though it answered itself.
- **A blocked square is hatched**, reads as grid rather than as answer, and refuses a tap.
- **Conflicts show as they happen, but not before the player has finished the square.**
  A tap cycles through `star` on the way to `dark`, so calling that star a mistake is
  feedback about a state nobody chose. `useDelayedConflicts` already does this for eclipse
  and is what this reuses.
- **A touching pair reds the pair, not the neighbourhood.** The broken rule is about two
  squares; lighting nine says something else.

## 9. Theming

The family emits logical state only — `cell(star | dark | empty | blocked) | region(id) |
quota(n)` — and the skin decides what any of it looks like.

**One skin: stars in a night sky.** It is the `sky` pool's plainest possible face, and the
name is the theme. Eclipse is the precedent for a family with no roles and one ambience
(`puzzle-screens.md` §2), and unlike constellation this mechanic does not read as several
places — counting stars per district is not a haul road or a waterworks. §10 records the
one reading that might earn a second skin if a site ever asks.

## 10. Open questions

1. **Does `spanning`'s hint survive a real board?** §3.1. This is the first thing to look
   at in the lab, because the tier table's top two rows depend on the answer.
2. **Is 8×8 inside the solve-time budget?** A hundred and sixty steps is three times
   eclipse's wizard, and the defence is that Star Battle steps are reflexes rather than
   thoughts (§3.4). That is a claim about the fingertips, and only play settles it. If it
   loses, the ladder is 5×5–7×7 and wizard is 7×7 with a quota.
3. **Two stars to a line.** Untested, and the classic form of the hard puzzle. It changes
   `groupTight` from "one square left" to a capacity argument, which may be what revives
   the rung §3.2 cut. Worth probing before it is worth building.
4. **How few blocked squares can a board ship with?** Thinning is greedy over a random
   order, which finds a local floor rather than the real one. A second pass in a different
   order was what eclipse measured and dropped; here the numbers are small enough that
   fewer blocked squares would visibly change the board, so it is worth measuring properly.
5. **Would a guard reading earn a second skin?** Post one watchman to a district, none
   within sight of another — the same rules, worn as a tomb or a city rather than a sky.
   The catalogue says this mechanic is `sky` and nothing else; this is the counter-example
   to test that with, if a site ever asks.
