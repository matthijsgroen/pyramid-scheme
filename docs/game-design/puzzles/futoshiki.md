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
4. Take signs away one at a time, in seeded random order, keeping each removal
   only while the solver still reaches the end. The `pruneFraction` knob decides
   how many removals are even attempted.
5. Do the same to the pre-filled squares — thinning the signs usually makes an
   earlier concession redundant, and a board should show only what it still
   needs.

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

| #      | Technique       | Fires when                                         | Decides                                            |
| ------ | --------------- | -------------------------------------------------- | -------------------------------------------------- |
| **T0** | Naked single    | A square has one candidate left                    | Write it in                                        |
| **T1** | Hidden single   | A number fits only one square of a row or column   | Write it in there                                  |
| **T2** | Sign bound      | One sign points away from a square                 | Rule out `N` (or `1` the other way)                |
| **T3** | Sign vs. number | The square across a sign already holds a number    | Rule out everything on the wrong side of it        |
| **T4** | Sign chain      | `k ≥ 2` squares rise (or fall) away in a run       | Cap the square at `N - k` (or floor it at `1 + k`) |
| **T5** | Sign pair       | Neither side of a sign is settled                  | Cap each side by what the other can still hold     |
| **T6** | Naked pair      | Two squares in a line hold the same two candidates | Rule that pair out of the rest of the line         |

### 4.1 The ordering is about explainability, not power

T5 subsumes T2, T3 and T4 outright — a solver could be T0/T1/T5 alone. It is
ranked below them anyway, because its reason is "I propagated bounds", which
teaches nothing, while T2's is a sentence a child repeats back: _"something has
to be bigger than this square, so it can't be the biggest number."_ Hints are the
product; the cheap techniques exist to produce good ones.

Placements rank above eliminations for the same reason they do in Sumplete:
writing a number in moves the board on, while ruling one out is the bookkeeping
that gets you there.

### 4.2 Deliberately absent

Hidden pairs, X-wings, and the rest of the Sudoku ladder. They are real
techniques, but nothing in the tier table needs them yet — they get added when a
board demands one, not before.

## 5. Difficulty knobs

- **Technique cap** — the highest technique the solver may use while accepting a
  board. This is what a board may _demand_ of the player.
- **Prune fraction** — how hard generation tries to take signs away. Fewer signs
  left is a thinner board with more to work out, and it is the same dial seen
  from the board's side rather than the solver's.
- **Grid size** — footprint, and how much bookkeeping a solve carries.

| Tier    | Grid | Cap                | Prune |
| ------- | ---- | ------------------ | ----- |
| starter | 4×4  | T3 sign vs. number | 0.35  |
| junior  | 5×5  | T4 sign chain      | 0.7   |
| expert  | 6×6  | T4 sign chain      | 0.8   |
| master  | 6×6  | T5 sign pair       | 1     |
| wizard  | 7×7  | T6 naked pair      | 1     |

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
- **Writing a number prunes the notes it invalidates**, across its row and
  column. That is the bookkeeping a player does by hand on paper.

**Undo takes back one move, whole.** Because a single placement can sweep notes
out of a dozen squares, an undo that only restored the square that was tapped
would be a trap. Each action snapshots the board it replaced, so one press puts
everything back. Actions that change nothing — tapping a pre-filled square,
erasing an empty one — record nothing, so undo never appears to do nothing.

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

## 11. Open questions

1. **Auto-pencilling.** Filling every square's notes with its row/column
   candidates at a tap is standard in Sudoku apps and would suit the higher
   tiers, but it hands over the first technique of the ladder for free. Worth
   playtesting as a wizard-only affordance before it ships anywhere.
2. **Is dimming a spent number on the pad a hint in disguise?** It says nothing
   the board does not already show, but it says it without the player counting.
   Watch whether it removes a step worth taking.
