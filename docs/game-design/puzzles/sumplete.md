# Sumplete

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.11; the screen bar every family must
clear lives in `docs/instructions/puzzle-screens.md`. This doc holds what is
specific to Sumplete: its generation rules, its deduction techniques, and how
hints are phrased.

## 1. Rules

A grid of numbers with a target beside every row and column. Strike out cells so
that in every row and column, the numbers **left standing** sum to that line's
target. That is the entire rule — a board is readable without any text.

Vocabulary used throughout: for one line, `T` = target, `K` = sum of cells
already kept, `U` = the cells not yet decided, and **`D = T - K`** = the deficit,
what the kept cells still need. `strikeDeficit = sum(line) - T - struckSum` is
its mirror.

## 2. Why we define generation ourselves

The rules are official (Daniel Tait, 2023); **generation is not**. The original
generator draws a random grid, picks a random keep-mask, and reads the targets
off the kept cells. That construction produces the defects seen in play:

- a line whose answer is one lone number rather than a sum,
- a zero target (keep nothing),
- boards that need trial-and-error because nothing guarantees deduction reaches
  the end.

Solving Sumplete is NP-complete in general, so "generate then verify by brute
force" does not scale past small grids either. We therefore define both the
acceptance gates (§3) and the deduction system (§4) ourselves, and lean on the
second to satisfy the first.

## 3. Generation gates

Draw a candidate the naive way, then **reject and redraw** unless all hold:

1. **Every row and column keeps ≥2 cells.** Kills the lone-number answer, and
   with positive cell values it kills the zero target as a side effect.
2. **Every row and column strikes ≥1 cell.** A line with nothing to strike is a
   free line; fine as a foothold, not as the whole board.
3. **The technique solver settles every cell** (§4) within the tier's technique
   cap. A board that stalls needs a guess and is discarded.

Gate 3 subsumes uniqueness: if propagation alone decides every cell, no other
solution exists — each step was forced. There is no separate exponential
uniqueness verifier, which is what lets the family scale past 4×4.

## 4. The technique ladder

The solver applies techniques to each row and column, cheapest first, and
repeats over the whole grid until nothing changes (a fixpoint). Rows feed
columns and back — that cross-line propagation is where the puzzle actually
lives.

| #        | Technique                 | Fires when                                      | Decides                                         |
| -------- | ------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| **T0**   | Too big to fit            | An unknown cell's value > `D`                   | Strike that cell                                |
| **T1**   | Everything stays          | `K + sum(U) == T`                               | Keep all of `U`                                 |
| **T2**   | Target already met        | `K == T`                                        | Strike all of `U`                               |
| **T2.5** | Parity                    | Exactly one odd value in `U`                    | Keep it if `D` is odd, strike it if `D` is even |
| **T3**   | Only one combination      | Exactly one subset of `U` sums to `D`           | Keep that subset, strike the rest               |
| **T4**   | In every / no combination | A cell appears in all valid subsets, or in none | Keep / strike that cell                         |

### 4.1 The ordering is about explainability, not power

T4 is exact and subsumes T0, T2.5 and T3 outright — a solver could be T4 alone.
It is ranked last anyway, because its reason is "I enumerated every subset,"
which teaches the player nothing. T2.5's reason is a sentence a child repeats
back: _"the target is odd and there's only one odd number here, so it has to
stay."_ Hints are the product; the cheap techniques exist to produce good ones.

Consequence: **a board that needs T4 anywhere is mechanically decidable but not
humanly logical.** So the ladder is capped per tier (§5) rather than run to its
full strength everywhere.

### 4.2 Duplicate values

Two equal values in one line are genuinely interchangeable within that line; T3
must not claim a forced subset when swapping them gives another. T4's
all-subsets intersection handles this correctly and leaves the pair undecided
until a crossing line separates them.

### 4.3 Deliberately absent

Modular reasoning beyond parity (e.g. "every value but one is divisible by 3").
Parity is the one humans actually run at the table; higher moduli get added if a
real board needs one, not before.

## 5. Difficulty knobs

Grid size is the weakest of the three — a large board that falls to T1/T2 is an
easy board. The honest dials:

- **Technique cap** — the highest technique the solver may use while accepting a
  board. This is what a board may _demand_ of the player.
- **Grid size and value range** — footprint and arithmetic load.

Difficulty is authored per site from these; the seed only picks a board inside
them (`PUZZLE_FAMILIES.md` §3.4).

| Tier    | Grid | Cap                       |
| ------- | ---- | ------------------------- |
| starter | 4×4  | T2.5 parity               |
| junior  | 5×5  | T2.5 parity               |
| expert  | 6×6  | T3 only-combination       |
| master  | 7×7  | T3 only-combination       |
| wizard  | 7×7  | T4 candidate-intersection |

Two things fix that table. **Below, the cap runs out of boards**: parity-capped
boards get rare fast as the grid grows (roughly two in five 4×4 draws, one in
eight at 5×5, one in sixty at 6×6), so a parity tier above 5×5 would be
draw-and-reject forever. **Above, the phone runs out of width**: eight columns
plus the target column at a thumb-sized tap target is already the whole width of
a 360px screen, so 7×7 is the ceiling and the top tier takes its difficulty from
the ladder instead of from more cells.

## 6. Hints

Every technique is a hint, phrased in player language and rendered from
`{ techniqueId, cells, params }` through a numeric-slot template — never a
composed sentence (`docs/instructions/puzzle-screens.md` §4).

- **First duty** — a mark that contradicts the answer outranks the whole ladder.
  Every technique reasons from the marks the player made, so past a wrong one the
  deductions are advice toward a dead end; "one of these can't be right" is the
  only useful thing to say there.
- **Which hint** — the cheapest technique that fires on the current board.
- **Tie-break** — the line with the smallest deficit. Small clues are where the
  official strategy guide tells players to look, so hints arrive in the order a
  player is being taught to search.
- The hint highlights the cells it names and does not move them.

Mapping from the official strategy tips, which are heuristics rather than a
solver: "check for zeros" is T2; "cross out numbers that exceed the target" is
T0; "remember your addition tables" is T3; "start with the smallest sum clues"
is the tie-break above; "avoid clearing rows early" is advice against
trial-and-error, made unnecessary by gate 3.

## 7. Board requirements

Beyond the shared screen bar:

- **Live per-line running total and deficit.** Two of the techniques (T0, T2)
  are unusable without seeing `D`, and the hint's reason must be checkable at a
  glance.
- Three cell states — untouched, kept, struck — as logical states for the skin
  to dress (§8).
- A satisfied line reads as satisfied without the player summing it again.

## 8. Theming

The board is numbers on cells, so the skin carries the theme: cell material,
what a strike looks like (sand poured over it, a scribe's erasure), what the
target beside a line is drawn on. The family emits `untouched | kept | struck`
plus the numbers; nothing about a theme reaches the puzzle logic.

## 9. Value output

Side family — the answer is a mask, not a number, so it does not feed
carry-forward (`PUZZLE_FAMILIES.md` P3). Whether a derived value (count of kept
cells) should make it spine-capable is an open catalogue question, not settled
here.

## 10. Open questions

1. **Negative values.** The catalogue wants Sumplete to carry subtraction at
   higher tiers, but negatives break gate 1's side effect (a zero target becomes
   reachable with cells kept) and weaken T0. Needs its own gate set before it
   ships.
2. **Is the hint's first duty right?** A mark that contradicts the answer
   interrupts the ladder with "undo this one". That is the most useful thing to
   say, but it is the one hint sourced from the answer rather than from a
   technique — worth watching in playtesting for whether it reads as helpful or
   as scolding.
