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
  region holds the same fixed number of stars, and in this family that number is one at
  every tier. Two is the same rules and a second family (§11).
- **No two stars touch**, diagonals included.

That is Star Battle's rule set, whole and unmodified. **The board opens completely empty**:
where the region boundaries run is the entire clue, and nothing is hatched, given or
withheld.

Nothing else. The board carries no language: a region is a drawn boundary, a star is a
shape, and the answer is entered by tapping.

## 2. Why this family

**What ships is LinkedIn's Queens, not Star Battle**, and the two are the same puzzle at different quotas:
Queens is one crown to a row, a column and a colour region with none touching, which is exactly the one-star
case. Every tier here draws quota 1 (§5), so these are Queens boards — the drawer only draws that case, though
the rules and the technique solver are written for any quota.

The catalogue named the family "two not touch" after the published form, which is usually **two** stars a
line. That form is built, as its own family rather than a variant of this one (§11), because a rule change is
not a difficulty setting. It is where `groupTight` becomes a capacity argument and where the T3 rung this
ladder gained does all of its work — this family cannot climb T3 at all.

Two smaller differences from Queens, both choices rather than accidents:

- **Regions are drawn, not filled.** Queens colours its regions; this outlines them, and §8 is why — with as
  many regions as rows, a palette that separates them all is a palette nobody can read at arm's length.
- **The interaction matches Queens' own convention, arrived at independently.** First tap rules a square out,
  second places the star (§6). That came from counting moves on an 8×8 — eight stars against fifty-six
  eliminations — and landing on what Queens already does is a fair sign the count was right.

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
| **T3** | `onlyWay`    | A group's stars fit in its free squares exactly one way         | "Only one way to fit 2 ⭐ in this region"                |
| **T4** | `regionLine` | A region's free squares all sit in one row or column            | "This region's ⭐ has to come from that row"             |
| **T5** | `lineRegion` | A row or column's free squares all sit inside one region        | "That row's ⭐ is this region's, so the region is spent" |
| **T6** | `spanning`   | Two regions whose free squares fit in two rows (or two columns) | "These two regions fill those two rows between them"     |

**T0 is propagation, not a step.** Placing a star rules out its eight neighbours, and no board asks the
player to work that out — it is the rule made visible. It is a rung so that a hint has something to say on
the first move of a board, and because the SCREEN spends it rather than the player: a star's neighbourhood
recedes as it lands (§6), which is this rung rendered instead of tapped.

**T1 and T2 are the same count read two ways** — what a group has, and what it has room
for. They are the bulk of every board (§3.4), and they are what makes the family teach
itself: a starter board is nothing but these two.

**T3 is the adjacency rule doing the counting, and it exists only because a player can
see it.** Three squares in a line owing two stars have one filling — both ends — and that
is a move made on sight, not worked out. It sits above `groupTight` because "this row is
down to two squares" is a plainer sentence than "these are the only two squares that fit",
and the plainer reason should win when both are available.

**It is inert at one star to a group**, and provably rather than by a check: `touch`
darkens every square beside a star before this rung looks, so one owed star has exactly as
many arrangements as it has free squares, and the case where that is one belongs to T2. So
star battle never climbs it and twin stars spends it three or four times a board.

**It was added after playtesting, and the reason generalises.** Without it the ladder could
not see the easiest move on the board, so it rated boards as hard that were being handed
over — half of an 8×8's regions, at the first tier table twin stars shipped with. **A
difficulty oracle that cannot see a move the player makes on sight is not measuring the
board**, and the gap does not show up in any test that only asks whether a board is
solvable.

**T4 and T5 are the family's own reasoning**, and the only rungs that need the region
boundary to mean anything. Both are one reading of the board: point at a region, point at
a line, say which owes the other. The pair is not symmetric in practice — a region
squeezed into one line is common, a line squeezed into one region needs the rest of the
line already dark, so T5 arrives later in a solve.

### 3.1 T6 is the rung that may not survive its own sentence

`spanning` generalises T4 and T5 to two groups at once, and two is where it stops:
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
- **Stars per line** — one at every tier of THIS family. Two is the classic hard Star
  Battle, and it ships as a family of its own rather than as a tier here (§11): a tier may
  ask for harder reasoning, but it may not change what the player is being asked to do.

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

**A hint is two lines: the reason, then the move.** The reason says what the board makes true; the move is
an imperative, and it names the squares by how the board draws them — "rule out the hatched squares". A
reason on its own leaves the player working out what it wants of them, which is a step nobody should have to
take from a hint they asked for. LinkedIn's Queens does exactly this, and it is the clearest part of that
screen.

**The squares a hint is about are hatched, and the hatching is what the words name.** Diagonal lines are the
one treatment on this board that cannot be read as anything else: the walls are amber strokes, a star is a
shape, a dark mark is a dot, and a square a star has spent is a shade. So there is nothing to match up — the
sentence says hatched, and the hatched squares are the answer to it. The evidence keeps its own name too, as
"the marked region" or "the marked rows", drawn in the blue that goes with it.

**The mistake hint asks for nothing.** Every other rung ends in a move, but the way out of a wrong mark is the
player's to find — naming it would be naming the answer.

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
- **Hatching belongs to the hint and to nothing else.** It is the one thing on the board whose meaning is
  carried by words rather than by convention (§7), so a second use of it would make both uses ambiguous.
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

**Two skins, and which family a room is decides whether the second is reachable.** Stars in
a night sky is the `sky` pool's plainest possible face and the name is the theme; farmsteads
on a flood plain is the same board drawn for `agriculture` or `water` (§11.3).

**Star battle itself has one skin, and that is a fact about ONE star rather than about the
mechanic.** A lone star reads as the one and only — the single thing a place is allowed —
which is why counting stars per district is not a waterworks and why this family carries
`sky` and nothing else. A PAIR is what a place can hold two of, so the second face belongs
to twin stars and this family cannot wear it.

## 10. Open questions

1. **Does `spanning`'s hint survive a real board?** §3.1. First thing to look at in the lab,
   because the tier table's top row depends on the answer.
2. **Does the top tier play as a top tier?** An 8×8 settles in about twenty-five steps
   against eclipse's wizard 55–62, and the counting rungs are most of them (§3.4). The board
   may well come in UNDER its tier rather than over it, which is the opposite of the risk the
   catalogue recorded. If it loses, wizard grows to 9×9.
3. **Is the spread the right shape, or only a working one?** Sizes follow `(n + 1) ** spread`
   because two exponents were measured and one worked; nothing says a hand-picked set of
   target sizes would not do better, and "better" here means harder boards found at the same
   cost. The measurement is cheap and nobody has done it.

**Two stars to a line is answered and built** — it is §11, a second family off this engine.
The reading it displaced (one star to a line, two to a region) is answered too, in §11.4,
and the answer is no.

## 11. Twin stars — two to a group

The classic form of the mechanic: **two stars to every row, every column and every region**,
same board, same adjacency rule. It ships as its own family (`twin-stars`), reusing this
one's board, marks, drag, ladder and hints outright — the code that differs is a quota, a
tier table and a name.

**It is a second family because the rule is different, not because the board is bigger.** A
tier is allowed to demand harder reasoning; it is not allowed to change what the player is
being asked to do, and "two" changes the goal line, every counting sentence and the shape of
every deduction. A player who met one star at master and two at wizard would reasonably read
the second board as the first and get nowhere.

### 11.1 What the second star buys

At one star, a group is answered the moment its star is found: `groupFull` and `groupTight`
are bookkeeping around a single square. At two, **a group stays a capacity argument until its
last star lands** — "this row is down to two squares" is a sentence about a set, and the rung
places both.

Over twenty wizard boards of each, on the shipped ladder:

| Rung          | one star (8×8 wizard) | two stars (8×8 wizard) |
| ------------- | --------------------- | ---------------------- |
| steps a board | 24.8                  | 28.6                   |
| `touch`       | 5.0                   | 9.7                    |
| `groupFull`   | 6.2                   | 3.0                    |
| `groupTight`  | 8.0                   | 10.6                   |
| `regionLine`  | 3.8                   | 2.8                    |
| `lineRegion`  | 0.7                   | 0.5                    |
| `spanning`    | 1.1                   | 2.1                    |

**`spanning` doubles and `groupFull` halves**, which is the shape of the difference: the rung
that merely notices a finished group has half as much to notice, and the one that reasons
across two groups at once carries twice as much. A board is four steps longer for eight more
stars, so the extra star is not extra bookkeeping — it is the same work done with more of it
forced by argument.

**`allApart` is still not load-bearing**, and it is worth being exact about that rather than
claiming the second star fixes it. At one star a tight group is a single square and cannot
propose two that touch, so the check is unreachable; at two it becomes reachable in
principle. Measured over ten boards at each tier, at either quota, it refuses **nothing**. It
stays what §3.3 says it is: a guard, not a rung.

### 11.2 Tiers

**8×8 at every tier**, and the size cannot be the knob:

- **Below 8×8 there are no boards at all.** Two to a row and two to a column with nothing
  touching does not fit in 7×7 or 6×6 — the generator finds no legal star set, let alone a
  solvable map. A junior board is therefore an 8×8 that ASKS less, not a smaller one.
- **Above 8×8 the board stops fitting a phone.** A 10×10 lands on 34.8px squares at 390px
  wide (31.8px at 360px) against 43.5px for an 8×8, under both platforms' touch minimum, on
  a board whose main gesture is a drag along a row. Measured on the real screen, not
  computed. 10×10 is a tablet question if it is ever a question.

| Tier   | Spread | Smallest region | Cap          | Requires        | Gift regions | Cost  |
| ------ | ------ | --------------- | ------------ | --------------- | ------------ | ----- |
| junior | n³     | 3               | `onlyWay`    | `onlyWay` ×3    | **2.4 of 8** | 14ms  |
| expert | n³     | 5               | `regionLine` | `regionLine` ×2 | 0.1          | 39ms  |
| master | n²     | 5               | `lineRegion` | `lineRegion` ×2 | 0.0          | 339ms |
| wizard | n²     | 5               | `spanning`   | `spanning` ×2   | 0.0          | 115ms |

**The smallest allowed region is the knob that matters, and playtesting is what found it.** A
region of three squares can only be a straight line — an L cannot hold two stars that do not
touch, so no other shape survives generation — and a straight three owing two stars has ONE
filling. Every one of them is a square handed over before the player thinks. At the
arithmetic floor of 3 an 8×8 opens with **about four of its eight regions already answered**,
which plays as a first-encounter board however hard the solver worked for the rest. Raising
the floor to five removes them.

So junior keeps the gifts deliberately — they are what makes a tier teach itself, the way a
one-square region opens a starter board in §5 — and it is capped below the region readings,
so everything after the gifts is counting. Every tier above it draws no gift at all.

The ramp is the smallest region first, then the spread, then the rung — and unlike star
battle's own top two tiers, no two of these rest on the requirement alone.

**Every board opens on `regionLine`** — measured, all twelve seeds at all three tiers — and
the shape of the opening is worth stating because it is not the one the one-star family has.
A region that fits inside a single row owes two stars, that row owes two stars, so the rest
of the row is empty before a single star is placed. The steep spread at expert is what makes
such a region likely. There is no two-star equivalent of the one-square region that hands a
starter board its first star outright: **three squares in a line owing two stars have exactly
one legal filling, and this ladder cannot see it.** Reading that needs a rung that enumerates
a group's legal placements, which the family does not have (§11.5).

### 11.3 The pair is what a skin can name

This is the family that answers §9's open reading. **A lone star only ever reads as the one
and only** — which is why star battle wears `sky` and nothing else, and why the watchman
reading never had anywhere to go. A PAIR reads as a great many things a place can hold two
of: two watchmen to a district, two torches to a chamber, two royals to a country, two
households to a field.

A theme fits this mechanic when it can name three things: something straight that crosses the
whole world (the rows and columns), something bounded and ragged (the regions), and a reason
two of them repel (the adjacency rule). Sky names the first two and is weakest on the third.
Candidates, none built:

| Skin    | Lines               | Regions   | Why two repel                      |
| ------- | ------------------- | --------- | ---------------------------------- |
| Watch   | streets             | districts | never within sight of each other   |
| Torches | corridors           | chambers  | two flames too close gutter        |
| Fields  | irrigation channels | holdings  | two households cannot share a well |

**Fields is built** (`app/starBattle/skins.ts`): daylight on tilled earth, the channels
between holdings drawn as the water they are, and a bound sheaf standing where a star would.
Every sentence under the board is its own — the goal, both rules and all thirty-odd hint
lines — because a shared template with a noun in a slot breaks on the first locale that
inflects around it (`puzzle-screens.md` §4.3), and `goalWording.spec.ts` holds a farm to
never saying the word star.

Watch and torches are still only a table. They are worth building when a site asks, and the
work is now a skin entry and a block of sentences rather than anything structural.

### 11.4 The reading that failed: one to a line, two to a region

Worth recording, because it is the reading most people reach for first — **one royal per row
and column, two per country** — and it is the one that does not work.

Halving the region count is what kills it. The quota fixes the arithmetic: one star to a row
means `size` stars in total, so two to a region means `size / 2` regions, so a region
averages **twice the squares**. "Two stars somewhere in these eighteen squares" is about a
hundred and fifty legal arrangements — near-zero information — where a region of `size` cells
decides something the moment it is looked at. **Region size is the clue, and the quota is
what sets it.**

Measured over 4000 draws a size, with the region drawing solved (stars paired nearest-first,
the shortest free path between a pair claimed with them):

|                                    | 6×6 | 8×8  | 10×10 |
| ---------------------------------- | --- | ---- | ----- |
| legal maps drawn                   | 97% | 99%  | 99%   |
| maps with a unique answer          | 31% | 3.7% | 1.3%  |
| **squares this ladder decides**    | 0%  | 0%   | 0%    |
| with a packing rung added          | 33% | 27%  | 19%   |
| boards settled, of the unique ones | 11% | 0%   | 0%    |

The boards exist — uniqueness holds at rates comparable to what this family ships. **The
ladder cannot reach them.** Not one rung fires on an empty board: `groupTight` wants
`free === owed`, and a three-square country owing two stars is 3 ≠ 2. Adding the capacity
rung that answers it (enumerate a group's legal placements; a square in all of them is a
star, a square in none is dark) gets a third of the board and then stalls.

The classic form keeps `size` regions and doubles the STARS instead, so a region stays the
size it was and says twice as much. That is why the classic form is the classic form.

### 11.5 The capacity reading, and the half of it that ships

The full capacity rung is: enumerate a group's legal placements; **a square in every one of
them is a star, a square in none of them is dark.** Half of that ships as T3 `onlyWay` — the
placing half, restricted to the case where there is exactly ONE arrangement.

**The restriction is what keeps the sentence honest.** "There is only one way to fit two ⭐ in
this region" is a fact a player can check by trying; "this square is in none of the seventeen
ways" is a claim about an enumeration they have to take on trust. Every rung here is held to
explaining itself in one line (§3, §7), and that is the test the adjacency-capacity rung
failed in §3.2.

The eliminating half is not built, and what it would buy is 10×10: the shipped ladder settles
0.3% of maps at that size against 8.5% with it. Since §11.2 rules 10×10 out on touch targets,
the rung is a consequence of a board size this family has no use for. At 8×8 it is not needed
— one map in five settles already, which is a generous pool to filter a required rung out of.
