# Canisters — measuring a volume by pouring

Two canisters of known size, the Nile to fill from and the ground to pour onto. Measure out an exact
volume. The classic "water jug" problem, cut to the shape this catalogue asks of a family: every move
after the first is forced, so the puzzle is a deduction rather than a search.

## 1. Rules

- Two canisters, each with its capacity written on it. Both start empty.
- Four moves: **fill** a canister from the river, **empty** one onto the ground, or **pour** one into the
  other until the source is empty or the destination is full.
- **Each vessel says what is in it against what it takes** — `3/8` under the shape, at every tier, with the
  level drawn to scale above it. The arithmetic this family is for is choosing the pours, not remembering
  the totals; see §7 for why the amount stopped being hidden.
- Reaching the volume is not enough: the player **claims** a vessel, saying it holds what was asked. A
  wrong claim costs a move like any other, so guessing is not free.
- **A move budget**, and it is the whole puzzle — see §2.
- Higher tiers ask for several volumes in turn, each measured from wherever the last one left the
  canisters (§5).

## 2. Why this family

**It is the only family here whose arithmetic is constructive.** Every other numeric family asks the
player to work out a value that is already fixed: what a glyph weighs, which figure fits a cell. This one
asks them to _make_ a quantity that is not in front of them, out of two that are. That is a different act,
and it is the one Egyptian arithmetic is actually about — a hekat measured by doubling and halving into
vessels that do not divide evenly.

**And it is the first board here that is not a grid.** Sudoku, futoshiki, sumplete and star battle are
squares; hidato is a comb and constellation a lattice; balance scale is rows. Two vessels and a river is a
different shape of screen and a different shape of thought — nothing is scanned along a line, and there is
no cell whose neighbours are the argument. That is worth a slot on its own.

**Against balance scale**, which is the near neighbour: that one is algebra on unknowns — the weights
exist and the player deduces them. Here the capacities are known and the player constructs. Neither
substitutes for the other, and the pair covers arithmetic from both ends.

**The budget is what makes it a puzzle rather than a procedure.** Without it the player can flail: any
sequence of legal pours eventually reaches any reachable volume, so there is nothing to get wrong, only
something to take a long time. With it the player has to know _before pouring_ which
way to open — and the budget has to be EXACT, because opening wrong costs only two moves (§3). The
penalty is small; the budget is what turns a small penalty into a failed board.

## 3. Generation — pick the pair, then the target the wrong way ruins

Draw-and-measure, not carve-and-hide. A board is a capacity pair `(a, b)` with `a < b`, a target `t`, and
a budget.

**Reachability is decided, not searched.** A volume is reachable exactly when it is a multiple of
`gcd(a, b)` and no greater than `b`. So the generator never gambles on solvability: it enumerates the
reachable targets for a pair and picks among them.

**The wrong opening costs two moves, and never more.** Measured over every reachable target of every
capacity pair up to 16:

| opening gap | share |
| ----------- | ----- |
| 2 moves     | 79%   |
| 1 move      | 20%   |
| nothing     | 1%    |

A player who opens the wrong way _recovers_ — they do not walk a ruined line — so the penalty is two moves
whatever the capacities. **The difficulty is therefore the length of the line, not the size of the
penalty**: what makes a board hard is how much arithmetic it takes to SEE which opening is shorter, and
that is what the generator's `minLine` gate buys. `minGap` only drops the 1% of targets where the two
openings tie, since those are a coin flip that teaches nothing.

The budget is the optimal line's length, exact above starter — which is what makes a two-move penalty the
difference between finishing and not.

## 4. The hint, and what it is allowed to say

**A hint names the pour and says why** — the bar every family here is held to (`puzzle-screens.md` §5): a
hint names the move, never the answer. Three things it may say, and one it may not.

1. **Reach** — whether the volume can be measured at all from where the canisters stand, within the moves
   that are left. A position that cannot be finished is the one thing a player cannot work out for
   themselves without playing it twice, so the hint says it outright and suggests taking a pour back.
2. **The pour, with the reason it does something** — and the reason is always visible on the board, because
   a pour can only end two ways: _"pour the 14 into the 10 — it takes all the 10 can hold, and what stays
   in the 14 is what you want to be working with"_, or _"the 14 runs dry, and an empty canister is what you
   need next"_. Which of the two happened is exactly the reading a pour leaves behind (§7).
3. **The last pour** says the volume will be standing afterwards — and stops there. **Which canister holds
   it is not part of the hint**, because that is the claim, and the claim is the puzzle's last question.

**What a hint never contains is the vessel to claim.** The board writes how much is in each canister, so a
hint naming an amount gives away nothing; naming where the volume ends up would give away the leg. Only
the canisters’ own sizes and the volume asked for
ever appear in a sentence, and a spec holds it to that.

### Where the move comes from, and the cost of it

**The pour a hint names is the first step of a search, not the output of a technique ladder** — and that is
a departure from how every other family here sources a hint, written down rather than hidden.

It is the price of the decanting rules (§11). With no river to fill from and no ground to empty onto, the
two local rules that made the tap-and-sink version nearly forced have nothing left to prune: measured over
every board this family generates, a line forks two ways at most steps. There is no ladder of named
deductions that reaches the next move, because from most positions two moves are equally defensible until
you look further ahead than a rule can see.

So the hint's REASON is honest and local — the player can check it against the canisters — while the CHOICE
behind it is not reproducible from the board alone. Worth revisiting if a real technique for this shape
turns up; until then, this is the seam.

## 5. Tiers

Two knobs, and neither is board size — there is no board to grow.

- **Legs.** How many volumes are asked for in turn. Each leg is a fresh opening decision measured from
  wherever the last left the canisters, so `n` legs is `n` decisions rather than a longer one. Forcing
  survives a non-empty start, which is what makes this safe.
- **How hard the opening is to see**, which is the direction gap and the size of the capacities.

| Tier    | Legs | Capacities | Shortest leg | Notes                                                     |
| ------- | ---- | ---------- | ------------ | --------------------------------------------------------- |
| starter | 1    | ≤ 8        | 3            | budget generous by a move; the point is learning the pour |
| junior  | 1    | ≤ 10       | 5            | budget exact, so the opening starts to cost               |
| expert  | 2    | ≤ 12       | 5            | second leg starts from the first's leftovers              |
| master  | 2    | ≤ 13       | 7            | the level stops being drawn to scale (§7)                 |
| wizard  | 3    | ≤ 15       | 7            | three legs, so up to six decisions                        |

The unreachable-target rung (§4.1) is designed and **not built**: refusing a board is a screen affordance
no other family has.

**Three canisters is not the wizard tier, and this is measured.** Adding a third takes the branching
factor from 3.6 legal moves per state to 8.4, the state space from ~20 to ~400, and the shortest solution
stops being unique. That is a search, and a search cannot be hinted — so depth comes from legs, never
from vessels.

## 6. Interaction

- **Fill and empty are a button each under the vessel; pouring is tapping one vessel then the other.**
  The held vessel wears a ring, so which of the two meanings a tap has is always visible.
- **A third button claims it**, and claiming is the only way to finish a leg. The board never confirms an
  amount on its own — it cannot, or the puzzle would be to pour at random and watch for the confirmation.
- The budget is shown as remaining moves. **Undo takes back a pour** and gives the move back — the
  arithmetic is the puzzle, and making the player re-tap a line they already reasoned out is not.
- Reset empties both.

## 7. Drawing

A canister is drawn as a vessel with its level filled, and under it what it holds against what it takes —
`3/8`. The numbers matter as much as the level: a player comparing 5 against 8 is doing the puzzle, and
comparing two heights is not the same act.

**The amount is written because this board is hard enough at the two things it is about.** The arithmetic
is one: which volumes these vessels can reach at all, and by what pours. The logistics are the other:
getting there inside a budget that is the optimal line exactly, where a wasted pour and a wrong claim cost
the same (§2). Both are the puzzle and both stay.

Remembering the running totals was a third demand on top, and it was hidden at first on the argument that
it WAS the difficulty. It is not: carrying four or five amounts across a fifteen-pour line makes no board
harder to solve, only cheaper to lose. So the vessels say what they hold, and the reasoning above is left
entirely to the player.

**A pour animates**, because which canister ran out is the information: the source emptying before the
destination fills is what tells the player the pour was limited by what they had, not by what fits.

**The level is drawn to scale**, and it carries the one thing a pour has to leave behind at a glance:
which canister ran out, and so whether the pour was limited by what the player had or by what fits. The
figure under the vessel says the same thing exactly; the level says it without being read.

**With one floor under it.** A single measure in a 14 is a twentieth of the vessel and vanishes into the
foot, which made a canister holding something look exactly like one that had run dry — the one reading the
level exists to give, lost. Anything above empty is drawn at least a small sliver.

## 8. Theming — six places, because measuring happens in all of them

Measuring an exact amount out of vessels that do not divide evenly is not one place's act, and this family
wears more faces than any other in the catalogue. None of them is a repaint: the vessel changes shape, the
ground changes, and what is in it behaves differently.

| Role          | Place                      | Vessel               | Contents       | Settles      |
| ------------- | -------------------------- | -------------------- | -------------- | ------------ |
| `water`       | the river                  | amphora              | water          | yes          |
| `agriculture` | the granary, or the fields | korenmaat or amphora | grain or water | **no** / yes |
| `light`       | the lamp room              | amphora              | oil            | yes          |
| `trade`       | the merchant cellar        | amphora              | wine           | yes          |
| `funerary`    | the embalming table        | canopic jar          | natron         | **no**       |
| `scribe`      | the scriptorium            | inkpot               | ink            | yes          |

**`water` and `agriculture` stop being the same word here, and they are nowhere else.** Every other family
in that pool — constellation, hidato, star battle — answers both with one face.

They are not opposites, though: **`agriculture` is the wider of the two.** A farm measures grain out of the
granary and water onto the fields, so it names both and a room is one of them; `water` on its own is only
ever the river. That is the honest shape — irrigation is farming, but a granary is not a river.

### What does not settle behaves differently, and it is one flag

Grain and natron heap rather than levelling, and they ride round with the vessel when it is tipped instead
of holding flat. Both fall out of `settles: false` on the face: the surface is drawn as a shallow cone, and
the counter-rotation that keeps a liquid level during a pour is simply not applied. A material that behaves
like water while being called grain is the thing this avoids.

### The ink face turns the board over

Ink is black, and black on the dark ground every other place uses is not a colour, it is an absence. The
scriptorium is the one face drawn on light — papyrus — with its outline and its numbers dark to match. A
face is allowed to change the ground it stands on; that is what makes it a place rather than a palette.

### A role maps to a set, and the room picks

Some places are wider than others. A market moves oil, wine and grain, so `trade` names all three and a
trade room is one of them; `funerary` is natron for the drying or oil for the anointing; `agriculture` is
the granary or the water that goes on the fields. The narrow roles name exactly one.

**Which one a room wears comes from the board's own shape** — its capacities, its starting amounts and the
volumes it asks for, hashed. That is already seeded per room at world-gen, so the face is steady every time
the room is opened and differs from the room next door, with nothing stored in the world file to say so. A
face is pixels (§2), so nothing about the puzzle moves with it.

**The hour is a separate axis, and it comes later.** `night` is the only ambience that exists and no face
here answers to it — which is a decision rather than a hole. An ambience layers on a place (§2), and not
every place has anything to say about the time of day: a granary at night is a granary, and a scriptorium
lit by the lamp it is measuring oil for was never lit by anything else. If sand or dusk arrive and one of
these six wants to answer, the overlay goes on that face alone.

## 9. Open questions

- **Does the budget read as a threat or as a hint?** A player who sees "6 moves" may count backwards to
  the direction instead of reasoning forwards to it, which would be a different and easier puzzle. Worth
  playtesting against a version that shows the budget only after the first pour.
- **Is refusing an unreachable board satisfying or annoying?** Rung 1 is real arithmetic, but a puzzle
  whose answer is "this cannot be done" has to be signalled well or it reads as a bug.
- **Duration is measured and is not the problem, which took a wrong turn to establish.** Boards run 7
  moves at starter and average 34 at wizard, longest 51 — and an earlier reading of this called that
  "six decisions buried in thirty forced pours". That conflated what the SOLVER can prove with what the
  player sees. Measured on the same boards, a player faces **3.5 to 3.9 legal moves at every step** and has
  to work out which one keeps the measure; that only one is useful is the answer, not the question. At
  roughly three seconds a move a wizard board is under two minutes, well inside §7's soft six-minute
  target, so there is nothing here to act on.

  Playing the forced runs out automatically was considered and **rejected** for the same reason: it would
  hand the player the very step they are there to find.

- **Freshness is measured and holds.** Over 150 boards a tier draws 12 distinct capacity pairs at starter
  and 30 at wizard, against 7 and 14 distinct targets. Two boards in a row are unlikely to rhyme. What is
  NOT guaranteed is that two rooms near each other on the same floor draw different pairs — that is the
  allocator's business rather than this family's, and worth a look once the family is authored into the
  world.

## 10. What is known about the two-jug case

Two results from the literature, both checked against this family's own engine rather than taken on trust.

- **Solvability is exactly Bézout**: a volume is reachable when the vessels' `gcd` divides it and it fits
  the larger vessel. Verified against the search over every target of every pair up to 12.
- **The two mechanical strategies are always optimal.** Keep filling one vessel and pouring it into the
  other, emptying and refilling as they run out; do the same the other way round. Over every reachable
  target of every pair up to 16 — 915 cases — **the better of those two is the true optimum, and no mixed
  line ever beats both**. That is why the opening is the whole decision, and it is now a spec: the search
  is checked against a completely differently written oracle.

And a negative result worth having: **there is no closed form for the minimum number of steps.** It has to
be simulated. Which is the best news in this document — a player cannot memorise a formula in place of
working the board out, so the reasoning is the only way through.

## 11. Prior art, and where this deliberately parts from it

The puzzle has two classical forms, and this family is the second of them.

- **Decanting** (Tartaglia, Poisson) is the famous one: a fixed total, pours between vessels only, no tap
  and no drain. Three vessels of 8, 5 and 3 with the 8 full, split into two 4s. It has exactly **two**
  solutions of **seven** steps each, and the state space is a triangular lattice of barycentric
  coordinates on which a solution is a **billiard path** reflecting off the capacity walls — Tweedie's
  trilinear coordinates, read as billiards by Perelman.
- **Tap and sink**, which is what this family is: an unlimited river to fill from and ground to pour onto.

**Decanting is shorter and is not hintable, which is why it was not chosen.** Measured against this
family's own engine, decanting lines run 7 to 15 pours against a wizard board's 34 — but only **19% of
their steps are forced**, against **77%** here, because two or three pours are live at nearly every state.
The billiard trajectory is determined once a direction is committed to, but that direction is a global
property of the path rather than something readable from the vessels in front of you, and no local rule
tried here reproduces it. A board whose next move can only be justified by a search is a board whose hint
has to read out the answer, which is the one thing `puzzle-screens.md` §5 does not allow.

**The shipping mobile versions of this puzzle take the other road, and can afford to.** They use the same
three moves and the same live move counter against a BFS-computed best, which is this family's budget by
another name — and then they find depth by adding a third jug. That is exactly the change measured here to
take branching from 3.6 legal moves per state to 8.4 and to cost the shortest line its uniqueness. They can
carry it because they never explain a move. This catalogue has to, so depth comes from legs instead.
