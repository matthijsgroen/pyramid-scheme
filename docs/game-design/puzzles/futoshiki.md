# Futoshiki

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.19; the screen bar every family must
clear lives in `docs/instructions/puzzle-screens.md`. This doc holds what is
specific to Futoshiki: its generation rules, its deduction techniques, how notes
and undo work, and how hints are phrased.

## 1. Rules

An `N×N` grid. Every row and every column shows each number `1…N` exactly once.
Between some pairs of neighbouring squares sits a sign; it always opens toward
the bigger of the two. A few squares may already be filled in. That is the entire
rule — a board is readable without any text.

Vocabulary used throughout: a square's **candidates** are the numbers it could
still hold; a **chain** is a run of signs all pointing the same way.

## 2. Why this family, next to the ones we have

Sumplete is arithmetic plus elimination; Futoshiki is elimination with **no
arithmetic at all**, which is what makes it the natural companion. It also
introduces the one thing the catalogue's grid families had no place for: an
**ordering** constraint. Comparing two numbers is the skill the crocodile
capstone tests directly, so Futoshiki is where a player practises it inside a
grid before meeting it as a gate.

It is the catalogue's Latin-square slot (§4.8) entered from its cheap side: the
signs do the work regions do in Sudoku, so a 4×4 is already a real puzzle and no
region shapes have to be authored.

## 3. Generation

Build the answer first, then take away everything the board turns out not to
need:

1. Draw a random Latin square (seeded backtracking fill).
2. Write down **every** sign the square implies — one per neighbouring pair.
3. If the technique solver stalls, fill in one of the squares it could not reach
   and try again. More than `N` pre-filled squares means the board is more answer
   than puzzle: abandon the attempt and draw a fresh square.
4. Take the **pre-filled squares** away one at a time, in seeded random order,
   keeping each removal while the solver still reaches the end.
5. Then take the **signs** away the same way, repeating full sweeps until one
   removes nothing.

### 3.1 Why that order, and why to a fixpoint

Signs and pre-filled numbers substitute for each other, so **whichever is thinned
first is the one that survives**. Thinning signs first produced 4×4 boards
carrying a single sign and three given numbers — a Latin square with a
decoration, teaching nothing about what a sign means. The signs are the family;
the givens are scaffolding, so the scaffolding goes first.

Sweeping the signs to a **fixpoint** matters because removing one sign can make
another removable. A single pass left most signs standing: measured on starter
boards, 13–16 of the 16 signs shown could each still have been taken away. A sign
the player cannot spend is worse than no sign — it hides which ones the deduction
actually turns on. Every shipped board now has **zero** removable signs.

**Gate: the technique solver settles every square** (§4), within the tier's
technique cap, at every step above. A board that stalls needs a guess and is
discarded.

That gate subsumes uniqueness: if propagation alone decides every square, no
other solution exists — each step was forced. There is no separate exponential
solution counter, which is what lets the family scale past 4×4.

## 4. The technique ladder

Candidates start as "every number this square's row and column do not already
show". The solver then applies techniques to the whole board, cheapest first, and
repeats until nothing changes. Rows feed columns feed signs and back — that
cross-constraint propagation is where the puzzle lives.

| #       | Technique       | Fires when                                              | Decides                                            |
| ------- | --------------- | ------------------------------------------------------- | -------------------------------------------------- |
| **T0**  | Naked single    | A square has one candidate left                         | Write it in                                        |
| **T1**  | Hidden single   | A number fits only one square of a row or column        | Write it in there                                  |
| **T2**  | Sign bound      | One sign points away from a square                      | Rule out `N` (or `1` the other way)                |
| **T3**  | Sign vs. number | The square across a sign already holds a number         | Rule out everything on the wrong side of it        |
| **T4**  | Sign chain      | `k ≥ 2` squares rise (or fall) away in a run            | Cap the square at `N - k` (or floor it at `1 + k`) |
| **T5**  | Sign pair       | Neither side of a sign is settled                       | Cap each side by what the other can still hold     |
| **T6**  | Naked pair      | Two squares in a line hold the same two candidates      | Rule that pair out of the rest of the line         |
| **T7**  | Hidden pair     | Two numbers fit only the same two squares of a line     | Rule everything else out of those two squares      |
| **T8**  | Naked triple    | Three squares in a line hold three numbers between them | Rule those three out of the rest of the line       |
| **T9**  | Hidden triple   | Three numbers fit only the same three squares of a line | Rule everything else out of those squares          |
| **T10** | X-wing          | A number fits only the same two lanes in two lines      | Rule it out of the rest of both lanes              |

### 4.1 The ordering is about explainability, not power

T5 subsumes T2, T3 and T4 outright — a solver could be T0/T1/T5 alone. It is
ranked below them anyway, because its reason is "I propagated bounds", which
teaches nothing, while T2's is a sentence a child repeats back: _"something has
to be bigger than this square, so it can't be the biggest number."_ Hints are the
product; the cheap techniques exist to produce good ones.

Placements rank above eliminations for the same reason they do in Sumplete:
writing a number in moves the board on, while ruling one out is the bookkeeping
that gets you there.

### 4.2 A technique we can explain is a technique we use

The bar for admitting a rung is that its reason can be said in one checkable
sentence, not that a board is currently stuck without it. Holding an explainable
technique back only means the hint engine has to reach for a worse reason when
that position comes up.

The bar for _keeping_ one is that it fires. A rung no board ever reaches is not a
technique, it is dead code claiming to be one, so the reachability sweep asserts
every rung fires on a real board and would fail the moment one stopped.

### 4.3 The top of the ladder is where wizard lives

T6–T10 are the rungs a 7×7 actually reaches for; below that size none of them
fire, because the board settles before it needs them. That is what separates
wizard from master: at the T5 cap both tiers produced boards whose hardest step
was the same, and wizard's higher ceiling was decorative.

How often each is the hardest step of a wizard solve, and how rare they get:
counted over thirty 7×7 boards, x-wing fired 14 times, naked pair 24, hidden pair
22, naked triple 4, and hidden triple twice — the last first appearing at seed 14.
Rarity is why the reachability sweep runs deeper on the top tier than on the rest.

### 4.4 Still absent

Swordfish, XY-wing and colouring. Not on the "not needed yet" grounds §4.2
rejects — they are candidates under exactly the same bar, and go in when someone
can write the one-sentence reason and show it firing.

## 5. Difficulty knobs

- **Technique cap** — the highest technique the solver may use while accepting a
  board. This is what a board may _demand_ of the player.
- **Grid size** — footprint, and how much bookkeeping a solve carries.

Sign count is **not** a dial. It falls out of the cap: a weak ladder cannot spare
many signs, a strong one strips the board bare. Setting it by hand only put back
the redundancy §3.1 exists to remove.

| Tier    | Grid | Cap                | Signs shown |
| ------- | ---- | ------------------ | ----------- |
| starter | 4×4  | T3 sign vs. number | 3–6 of 24   |
| junior  | 5×5  | T4 sign chain      | 8–12 of 40  |
| expert  | 6×6  | T4 sign chain      | 11–20 of 60 |
| master  | 6×6  | T5 sign pair       | 13–19 of 60 |
| wizard  | 7×7  | T10 x-wing         | ~23 of 84   |

The cap is inclusive: a tier permits every technique up to it, so wizard boards
may use the whole ladder.

7×7 is the ceiling, the same as Puzzle Express. Inside the encounter modal a
360px screen leaves the board about 320px, so seven squares measure ~44px across
— exactly the tap-target floor — and an eighth would not fit. That ceiling is
bought by the sign layout (§8): giving the signs grid tracks of their own would
spend a quarter of the width on them and cap the board at 5×5 instead.

## 6. Notes and undo

The player's **notes are the solver's candidates** — the same vocabulary, so a
technique's elimination drops straight onto the board the player is looking at.
That is not decoration; three consequences follow:

- **Hints read the notes.** Candidates are seeded from the notes wherever the
  player wrote some, so a hint that says "rule this number out" only fires while
  they still hold it. Acting on the advice is what moves the hint on. Notes that
  would leave a square with nothing are ignored rather than trusted — a slip of
  the pencil must not make a board undecidable.
- **A wrong note is a mistake worth naming.** Every technique reasons from what
  the player wrote down, so notes that rule out the number that belongs in a
  square send the deductions toward a dead end. That outranks the whole ladder,
  the same way a wrong number does (§7).
- **A placement never destroys a note.** Writing a number used to sweep it out of
  the pencilled options across its row and column — the bookkeeping a player does
  on paper. But paper is not the right model here: the number written may itself
  be wrong, and correcting it the ordinary way (writing a different one over the
  top) left the swept notes gone for good, with undo the only route back and only
  if you noticed in time. Notes a placement rules out are **struck through in
  red** instead, and a correction simply re-marks them.

**Undo takes back one move, whole.** Each action snapshots the board it replaced,
so one press puts everything back rather than the one square that was tapped.
Actions that change nothing — tapping a pre-filled square, erasing an empty one —
record nothing, so undo never appears to do nothing.

Undo is no longer the only way back from a placement, which is the point of the
rule above: it is there for taking a move back, not for repairing damage the move
should never have done.

## 7. Hints

Every technique is a hint, phrased in player language and rendered from
`{ techniqueId, cells, params }` through a numeric-slot template — never a
composed sentence (`docs/instructions/puzzle-screens.md` §4).

- **First duty** — a number or a note that contradicts the answer outranks the
  whole ladder. Past a wrong one, the deductions are advice toward a dead end.
- **Which hint** — the cheapest technique that fires on the current board, read
  through the player's own notes (§6).
- **Which board** — the board's own technique cap, so a starter board never
  explains itself with reasoning it was never built to need.
- The hint highlights the squares it names **and the sign it reasons about**, so
  "the sign says this one is smaller" has something to point at. It never moves
  anything; the player still makes the move.

## 8. Board requirements

Beyond the shared screen bar:

- **Live conflict feedback.** A repeated number and a sign read the wrong way
  round both show themselves the moment they are written — the same wordless
  feedback a satisfied line gives in Sumplete.
- **Notes visible at a glance**, each number keeping a fixed spot inside its
  square so a note does not move when its neighbour is rubbed out.
- **The signs are laid over the gutters, not given tracks of their own.** Each
  one spans the two squares it separates and centres itself, which lands it on
  the boundary whatever the grid measures. Tracks would spend a quarter of the
  board's width on signs and cost two tiers of grid size (§5).
- Pre-filled numbers read as part of the puzzle, not of the answer.
- A number pad, a pencil toggle, an eraser and undo — all at least a thumb wide,
  wrapping rather than shrinking.

## 9. Theming

The board is numbers and signs on squares, so the skin carries the theme: square
material, what a pre-filled number is carved into, what a sign is drawn as. The
family emits `given | filled | empty | conflicted` plus the numbers and the sign
directions; nothing about a theme reaches the puzzle logic.

## 10. Value output

Side family — the answer is an arrangement, not a number, so it does not feed
carry-forward (`PUZZLE_FAMILIES.md` P3).

## 11. Generation cost, and where it should go

A wizard board is the dear one: seven squares wide, eleven techniques, and a
prune loop that re-solves the board once per sign it tries to remove. That lands
at roughly 225ms today, paid on the main thread the moment a puzzle room opens.

Two things keep it there. The ladder **short-circuits** — only the cheapest
technique that fires is spent on a pass, so the dear rungs at the end are rarely
reached (mapping the whole ladder and taking the first non-empty result cost 6×
that, since `map` is eager). And difficulty is never bought by rejecting boards
until one demands the top rung, which measured at ~1050ms per accepted board.

**The direction out is to stop generating at play time at all**: run generation
offline, verify the boards, and ship a table of known-good seeds per family and
tier with the build. Play time then costs one lookup plus one deterministic
replay of the seed — and the offline pass is free to be as thorough as we like,
including gates that are too slow to run in front of a player (every board
demanding its cap, duration sampling, difficulty grading). Generation is already
seeded and deterministic, which is the whole precondition. Prior art: the same
mechanic in Block Sort.

## 12. Open questions

1. **Auto-pencilling.** Filling every square's notes with its row/column
   candidates at a tap is standard in Sudoku apps and would suit the higher
   tiers, but it hands over the first technique of the ladder for free. Worth
   playtesting as a wizard-only affordance before it ships anywhere.
2. **Is dimming a spent number on the pad a hint in disguise?** It says nothing
   the board does not already show, but it says it without the player counting.
   Watch whether it removes a step worth taking.
