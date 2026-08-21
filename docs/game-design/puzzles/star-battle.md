# Star Battle

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.24; the screen bar every family must clear
lives in `docs/instructions/puzzle-screens.md`. This doc holds what is specific to
Star Battle: what the player is deducing, its technique ladder, and how generation
proves a board needs the reasoning its tier claims.

> **Built and measured, not yet played.** Every number below comes from the shipped
> generator and technique solver. Solve times are still targets: the lab
> (`src/app/dev/PuzzleLab.tsx`) plays the real screen and its banner reports the solve
> time, so timing a tier needs nothing of its own.
>
> **One earlier claim in this doc was wrong, and §4.1 is the record of it.** A first draft
> concluded that a region map alone cannot carry a board and gave the family a second clue
> layer — hatched squares — to lean on. It cannot, the way that draft drew its regions. It
> can easily once they are drawn to the right shape, so the clue layer is gone and every
> square on every board is the player's to fill.

## 1. Rules

Stars go in a square grid carved into as many regions as the grid has rows:

- **One star to a row, a column and a region** — every row, every column and every
  region holds the same fixed number of stars, and at the tiers below wizard that
  number is one.
- **No two stars touch**, diagonals included.

That is Star Battle's rule set, whole and unmodified. **The board opens completely empty**:
where the region boundaries run is the entire clue, and nothing is hatched, given or
withheld.

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

**The distinctness question the catalogue asked, answered by measurement.** §4.24 asked
whether regions and the no-touching rule carry a ladder of their own or whether this plays
as eclipse with a jigsaw drawn on it. They carry one, and the evidence is generation rather
than play: on an 8×8, allowing the region readings makes **nine times as many region maps
solvable** as counting alone does (§3.4). A rung that decides whether a board can exist at
all is not decoration. What the family does NOT have is depth — the counting rungs are
still most of any solve — so the honest claim is a distinct mechanism with a shallow
ladder, and §10 is where the doubts about that live.

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

**T0 is propagation, not a step.** Placing a star rules out its eight neighbours, and no board asks the
player to work that out — it is the rule made visible. It is a rung so that a hint has something to say on
the first move of a board, and because the SCREEN spends it rather than the player: a star's neighbourhood
recedes as it lands (§6), which is this rung rendered instead of tapped.

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

Eclipse learned this the expensive way (its §7.1): generation solves each board once along one path, so a
rung that is wrong from states that path never visits ships a board that cannot be finished and a hint that
lies. `soundness.spec.ts` is the guard here, and it has two halves:

- **Every rung agrees with the answer** from a few thousand states a player could actually be in — a random
  subset of the answer's stars, and a random scatter of correct dark marks.
- **Every rung was FORCED**, on the two sizes small enough to enumerate: its decision has to hold in _every_
  legal completion of the state it fired from, not merely in the answer the board shipped with. Agreeing with
  one answer is what a lucky guess also does.

**The guard was checked for teeth, which is the part worth copying.** A test that has never failed is a
claim, not a guard, so three plausible bugs were introduced on purpose. An off-by-one in `groupFull` —
emptying a group that still owes a star — fails all seven cases, so the oracle works. The other two did
**not** fail, and that is informative rather than reassuring: at one star to a line, dropping `regionLine`'s
quota check still reaches sound conclusions, and `groupTight`'s adjacency guard cannot fire at all, because
a group owing one star is never down to two squares. Both guards stay — they are what the rungs need at a
wider quota (§10.3) — but neither is load-bearing today, and a future change to either is unprotected.

**Rows and columns are swept separately in `spanning`, never together.** A cover built from both counts
every star twice, so its quota arithmetic agrees on boards it has no business deciding. Under the current
cover condition a mixed sweep turns out to be unreachable rather than wrong, which the teeth check
demonstrated — but the separation is what keeps it that way, and the condition is the kind of thing a later
rung loosens.

The probe's own unsoundness, for the record, was neither of those: it placed stars in touching squares because
its counting rung had no adjacency guard at all, and it settled boards to answers that broke the rules.

### 3.4 What the ladder is actually worth

A board is only as good as the region map behind it, so the ladder's worth is measured in
**how many maps it can solve**. Eight thousand draws a row, fully open, region sizes spread
as squares:

| Size | Solvable with counting alone (`groupTight`) | with the region readings | with the whole ladder |
| ---- | ------------------------------------------- | ------------------------ | --------------------- |
| 5×5  | 32.3%                                       | 49.7%                    | 51.2%                 |
| 6×6  | 4.9%                                        | 12.2%                    | 14.1%                 |
| 7×7  | 0.8%                                        | 3.2%                     | 3.6%                  |
| 8×8  | 0.08%                                       | 0.83%                    | 0.87%                 |

**At 8×8 the region readings make ten times as many maps solvable, and `spanning` adds
about five per cent on top of that.** So the ladder is load-bearing in a way the first
draft of this doc could not see: with hatched squares available, a weak rung could always
be papered over by leaving a square hatched, and the whole ladder looked worth two and a
half hatched squares. With nothing to paper over, a board either yields to the reasoning
allowed or it does not exist.

**Depth is still the thing this family lacks.** Counted over solvable 8×8 boards, a solve
spends about 2.4 `regionLine` and 0.4 `spanning` steps against roughly twenty counting
ones — so the region readings decide whether the board can be built, and the counting does
most of the walking once it is. Eighteen to twenty-six steps settles a board at every size.

**Only `groupTight` ever places a star.** Every other rung takes squares away; the star
lands when a group is down to its last one. That is the family in a sentence.

**A board is SHORT rather than long**, which is the opposite of what the catalogue
predicted for it: an 8×8 settles in about twenty-five steps against eclipse's wizard 55–62.
The earlier ~160 figure came from a probe counting rung firings rather than solver steps and
is retracted. Whether twenty-five reflex steps is a wizard board is §10's first question.

## 4. Generation

Draw a board, test it, keep it if the ladder settles it unaided:

1. **Place the stars first.** For one star to a line that is a permutation of columns with
   no two adjacent rows within one column of each other — backtracking, no rejection loop.
2. **Draw the regions around them.** Seed one region per star and grow them orthogonally,
   feeding whichever region is furthest behind its target size, until every square is
   claimed. Contiguity is free this way, and every region holds its star by construction.
3. **Solve it with the tier's own ladder.** A map the reasoning cannot finish is thrown
   away, and so is one that never spends the tier's required rung.

**Step 1 before step 2, and that ordering is the whole family.** Draw the regions first and
the star set has to be found inside them, which is a rejection loop on top of a rejection
loop; draw them around a set already placed and every region holds its quota for free.

**Nothing is thinned, because there is nothing to thin.** The only clue is where the
boundaries run, and a boundary cannot be taken away without redrawing the region — so a
miss is a redraw, which is the shape constellation's generation has (§4.21 of the
catalogue). Uniqueness comes out of the same gate as everywhere else: every step of the
solve was forced, so the board that ships has exactly one answer and no solution counter
runs.

### 4.1 The region-size distribution is the whole trick, and the first draft missed it

**A region map alone is a perfectly good clue. Grown to equal sizes it is a useless one**,
and the difference is dramatic enough that it sent an earlier draft of this family down a
blind alley.

Grow every region to the same size and each one sprawls across most of the grid, so no
region is ever confined to a line, no line is ever confined to a region, and the reasoning
has nowhere to start. Measured: **zero solvable maps out of six thousand, at every size**,
and zero unique answers out of two hundred. That is what the first draft measured, and from
it concluded that the family needed a second clue layer — hatched squares — to be generable
at all. It shipped that layer, with about a fifth of every grid drawn as holes.

Spread the sizes instead and the same search succeeds immediately:

| Region sizes go as    | 7×7 maps solvable | 8×8 maps solvable | Region readings a board spends   |
| --------------------- | ----------------- | ----------------- | -------------------------------- |
| flat                  | 0%                | 0%                | —                                |
| `n`                   | 0.02%             | 0%                | —                                |
| `n²`                  | 3.6%              | 1.0%              | 2.4 `regionLine`, 0.4 `spanning` |
| `n³`                  | 14.7%             | 6.3%              | 1.4 `regionLine`, 0              |
| mostly single squares | 60.5%             | 53.7%             | none at all                      |

It is also what hand-made grids look like: a one-square region beside a fifteen-square one,
and the little ones are where a solve begins.

**And the dial runs the other way from intuition, which is what makes it the difficulty
knob** (§5): a steeper spread makes boards EASIER and cheaper to find, because a one-square
region hands the player a star outright. Push it far enough and the region boundaries stop
being reasoned about at all — 54% of maps solvable at 8×8, and not one region reading spent
on any of them.

### 4.2 Cost

Measured over six boards a tier, drawing until a board meets the tier's rung quota:

| Tier    | Grid | Draw cost |
| ------- | ---- | --------- |
| starter | 5×5  | 2–7ms     |
| junior  | 6×6  | 2–15ms    |
| expert  | 7×7  | 3–135ms   |
| master  | 8×8  | 5–489ms   |
| wizard  | 8×8  | 44ms–1.5s |

Wizard is the outlier because it is the one tier whose required rung is scarce: `spanning`
fires on about two boards in five, so most draws are discarded for that reason alone. It
sits beside what eclipse's top tier already spends (0.34–0.84s), and the ceiling on draws is
what keeps a bad seed from spinning — a tier that cannot meet its quota ships its nearest
miss rather than nothing.

## 5. Difficulty knobs

- **Region-size spread** — the exponent the region target sizes follow, and **the knob this
  family actually turns on**. It runs the opposite way to intuition: a STEEPER spread makes
  an EASIER board, because a one-square region hands over a star outright (§4.1). It is also
  what decides whether a board can be found at all, so it doubles as the generation budget.
- **Grid size** — more regions, and a region is a clue rather than bookkeeping, so this is
  the one family where the catalogue's usual warning about grid size does not apply.
- **Technique cap** — how far up the ladder a board's solve may reach. Not decoration here:
  at 8×8 it decides whether one map in a thousand is usable or one in a hundred (§3.4).
- **Required rung and its quota** — which technique the solve must spend, and how often.
  **One is not a tier**, the same rule eclipse's config states — except at the very top,
  where `spanning` is scarce enough that one firing is what a tier can ask for.
- **Stars per line** — one at every tier. Two is the classic hard Star Battle and it is
  **untested** (§10).

| Tier    | Grid | Spread | Cap          | Requires        |
| ------- | ---- | ------ | ------------ | --------------- |
| starter | 5×5  | n³     | `groupTight` | —               |
| junior  | 6×6  | n³     | `regionLine` | `regionLine` ×1 |
| expert  | 7×7  | n²     | `lineRegion` | `regionLine` ×2 |
| master  | 8×8  | n²     | `lineRegion` | `regionLine` ×3 |
| wizard  | 8×8  | n²     | `spanning`   | `spanning` ×1   |

**The ramp is spread first, then size, then the rung.** The two bottom tiers are drawn with
a steep spread, so their boards open on a tiny region and settle by counting — the
self-teaching first encounter, and the region boundary is a group rather than an argument.
From expert up the spread tightens, which is what makes the region readings the board rather
than a moment in it: those boards spend two to five of them.

**The top two tiers share a grid and differ in the rung they must spend**, which is the
weakest tier separation in the catalogue and is written down as the lab's starting point
rather than a claim. If `spanning`'s sentence does not survive being read on a real board
(§3.1), wizard becomes 9×9 with a `regionLine` quota — size is the knob that buys regions,
and the ladder has nothing deeper to give.

## 6. Controls

**One tap per square, cycling empty → dark → star → empty. The elimination comes first.**

That order is the whole control design, and it is not the obvious one — the star is the answer, so the star
looks like it belongs on the opening tap. Count the moves instead: an 8×8 board is **eight stars and
fifty-six squares ruled out**. Star-first charges two taps for the move a player makes fifty-six times and
one for the move they make eight times, which is about forty per cent more tapping over a board. Only one
rung on the whole ladder ever places a star (§3.4); the controls should read the same way round as the
reasoning does.

Three states, and unlike eclipse only ONE of them is part of the answer — `dark` is the player's own
bookkeeping and the win condition ignores it entirely, so a board solved without a single dark mark is
solved. A board that could not record "not here" would make them hold the whole cross-hatch in their head.

**Every square takes a tap.** There are no givens and nothing hatched, so the board never
refuses the player anywhere — which is worth stating because the first draft of this family
had a fourth, untappable state, and §4.1 is why it is gone.

**A drag rules out a run of squares.** Elimination does not arrive one square at a time — it arrives as the
rest of a row, or the far end of a region — so the gesture matches the thought: press, sweep across, release.
The marks appear under the finger as it goes and the whole run lands as **one move**, so undo takes it back
in one press, which is exactly the button's stated job (below).

Three properties make the gesture safe to aim broadly rather than carefully:

- **It only ever rules out.** A drag never places a star and never clears a mark, so nothing can be lost to a
  clumsy sweep.
- **It steps around what is already marked.** Squares that carry a mark are left exactly as they are.
- **A tap is still a tap.** Reaching a different square is what turns one into the other, which puts the
  threshold a whole square wide — a wobbly tap stays a tap. The tap stays a real `click` underneath, so a
  keyboard and a screen reader keep working without this board reimplementing either; a sweep just swallows
  the click that follows it.

The board claims its own gestures for this, so it cannot also scroll the page — the same trade constellation
made, and the page is scrolled from the chrome around the board.

**A star shows what it rules out, and the player never taps it.** Eight neighbours a star is sixty-four
squares of pure bookkeeping over an 8×8 board, and not one of them is reasoning — the rule says it and the
star on the board says it. So those squares recede, and the tapping left over is the part that took thought.

It is drawn as absence rather than as a mark, which is the line this stays on the right side of: nothing is
written, so the marks on the board are still only the player's, and taking the star away hands its
neighbourhood straight back. A receded square still takes a tap, because a player who wants their own mark
there is entitled to it. That is the difference between rendering a rule and doing someone's puzzle for them
— the same line balance scale drew when it switched off cancelling below the tier that teaches it.

**One button: undo**, in the place and the shape futoshiki and eclipse put it. A tap already takes one
square back, so undo is for the thing a tap cannot give back: a whole run swept out on a wrong reading,
which is now a single gesture and so a single press.

## 7. Hints

One per rung, keyed by technique, rendered from a template
(`puzzle-screens.md` §4). The hint **names the move, never the answer**, and it points at
the squares, the region boundary and the line it reasons from.

**Two orders, because two jobs.** The ladder (§3) is ordered by strength and decides what
a tier may be built to need. A hint is ordered by **what a player spots first**: a star
whose neighbours are still open, then a group with its stars already in, then a group down
to its last square, then the region-against-line readings, and `spanning` last.

**A sentence that says "this row" has to have a row to point at.** So the evidence a hint
carries is the whole group being counted or the whole region being squeezed — not merely the
interesting squares inside it. This was got wrong once and is worth stating as a rule: the
first build lit only a region's free squares while saying "this region", and lit nothing at
all behind "one square left in this row", which is a hint asking the player to take its word
for the reason.

**A hint shows every square it settles, not just one.** These rungs decide a whole row at a
time and their sentences say so ("the rest is empty"); one mark under that sentence leaves the
player working out what "the rest" was. Those squares are **lit rather than ringed**, and that
is not a stylistic choice: the region walls are amber and are the board's only clue, so a
second amber line beside them reads as another wall. A lighter square cannot. Rings are kept
for the three things that are not the board — a broken rule in red, the one square the hint is
about in amber, the squares it argues from in blue.

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
- **A star is a shape, and the dark mark is visibly the player's.** Smaller, lighter, and never the same
  weight as a star — the board must never look as though it answered itself.
- **A square a star rules out recedes; it never gains a mark.** Darker than its neighbours and nothing else,
  because anything added there would read as somebody's answer (§6).
- **Conflicts show as they happen, but not before the player has finished the square.**
  `useDelayedConflicts`, shared with eclipse. It matters less here than it does there, and for a reason worth
  keeping: a broken rule needs a star, and with the elimination on the opening tap (§6) a star is somewhere
  the player LANDS rather than somewhere they pass through. What is left is the rarer case of clearing a star
  straight after making it, and the delay covers that without anyone having to think about it.
- **A touching pair reds the pair, not the neighbourhood.** The broken rule is about two
  squares; lighting nine says something else.

## 9. Theming

The family emits logical state only — `cell(star | dark | empty) | region(id) | quota(n)` —
and the skin decides what any of it looks like.

**One skin: stars in a night sky.** It is the `sky` pool's plainest possible face, and the
name is the theme. Eclipse is the precedent for a family with no roles and one ambience
(`puzzle-screens.md` §2), and unlike constellation this mechanic does not read as several
places — counting stars per district is not a haul road or a waterworks. §10 records the
one reading that might earn a second skin if a site ever asks.

## 10. Open questions

1. **Does `spanning`'s hint survive a real board?** §3.1. First thing to look at in the lab,
   because the tier table's top row depends on the answer.
2. **Does the top tier play as a top tier?** An 8×8 settles in about twenty-five steps
   against eclipse's wizard 55–62, and the counting rungs are most of them (§3.4). The board
   may well come in UNDER its tier rather than over it, which is the opposite of the risk the
   catalogue recorded. If it loses, wizard grows to 9×9.
3. **Two stars to a line.** Untested, and the classic form of the hard puzzle. It changes
   `groupTight` from "one square left" to a capacity argument, which may be what revives the
   rung §3.2 cut — and it would make `allApart` and `regionLine`'s quota check load-bearing,
   which §3.3 records they currently are not. Worth probing before it is worth building.
4. **Is the spread the right shape, or only a working one?** Sizes follow `(n + 1) ** spread`
   because two exponents were measured and one worked; nothing says a hand-picked set of
   target sizes would not do better, and "better" here means harder boards found at the same
   cost. The measurement is cheap and nobody has done it.
5. **Would a guard reading earn a second skin?** Post one watchman to a district, none
   within sight of another — the same rules, worn as a tomb or a city rather than a sky.
   The catalogue says this mechanic is `sky` and nothing else; this is the counter-example
   to test that with, if a site ever asks.
