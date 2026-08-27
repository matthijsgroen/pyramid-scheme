# Canisters — measuring a volume by pouring

Two canisters of known size, the Nile to fill from and the ground to pour onto. Measure out an exact
volume. The classic "water jug" problem, cut to the shape this catalogue asks of a family: every move
after the first is forced, so the puzzle is a deduction rather than a search.

## 1. Rules

- Two canisters, each with its capacity written on it. Both start empty.
- Four moves: **fill** a canister from the river, **empty** one onto the ground, or **pour** one into the
  other until the source is empty or the destination is full.
- Reach the target volume in any canister.
- **A move budget**, and it is the whole puzzle — see §2.
- Higher tiers ask for several volumes in turn, each measured from wherever the last one left the
  canisters (§5).

## 2. Why this family

**It is the only family here whose arithmetic is constructive.** Every other numeric family asks the
player to work out a value that is already fixed: what a glyph weighs, which figure fits a cell. This one
asks them to _make_ a quantity that is not in front of them, out of two that are. That is a different act,
and it is the one Egyptian arithmetic is actually about — a hekat measured by doubling and halving into
vessels that do not divide evenly.

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

## 4. The technique ladder

Three rungs, and the third is what makes the board forced.

1. **Reach** — is the target a multiple of `gcd(a, b)`? At the tiers that ask it, some boards are
   unreachable and the answer is to say so rather than to pour. This is the rung that teaches why
   `[4, 8]` can never measure 3.
2. **Direction** — which canister to fill first, and the one further choice a line reaches later. These
   are the branches, and the budget is what punishes them. A hint here names the reason (_"filling the
   small one first can only ever leave you multiples of 3 in the big one"_), never the direction.
3. **The forced move** — after the opening, exactly one move is worth making, and two local rules are
   enough to see it, with no lookahead:
   - never pour back into a state already seen (which includes undoing the last move),
   - never empty a canister that is not full, and never top up one that is not empty — a partial measure
     is the thing you are carrying, and both moves throw it away.

   **Measured over 783 lines: a line has at most TWO choice points and never more** — 80% have two, 20%
   have one — and **77% of all steps are forced**, with exactly one move worth making. So a leg reads:
   choose, pour a while, choose again, pour to the end.

   That is what lets a hint name a move without handing over the answer. On a forced step the reason is
   local and the player can check it; on a choice step there is nothing to hint, because the choice is the
   puzzle.

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
| master  | 2    | ≤ 13       | 7            | longer lines to read the opening off                      |
| wizard  | 3    | ≤ 15       | 7            | three legs, so up to six decisions                        |

The unreachable-target rung (§4.1) is designed and **not built**: refusing a board is a screen affordance
no other family has.

**Three canisters is not the wizard tier, and this is measured.** Adding a third takes the branching
factor from 3.6 legal moves per state to 8.4, the state space from ~20 to ~400, and the shortest solution
stops being unique. That is a search, and a search cannot be hinted — so depth comes from legs, never
from vessels.

## 6. Interaction

- **Tap a canister to fill it, tap the ground under it to empty it, drag one onto the other to pour.**
  Three gestures, no menu.
- The budget is shown as remaining moves. **Undo takes back a pour** and gives the move back — the
  arithmetic is the puzzle, and making the player re-tap a line they already reasoned out is not.
- Reset empties both.

## 7. Drawing

The water level is the whole readout, so a canister is drawn as a vessel with its level filled and its
capacity written on it. The number matters as much as the level — a player comparing 5 against 8 is doing
the puzzle, and comparing two heights is not the same act.

**A pour animates**, because which canister ran out is the information: the source emptying before the
destination fills is what tells the player the pour was limited by what they had, not by what fits.

## 8. Theming

The role is `water` — the pool this family joins, and the one journeys.md §6 records the Nile Delta
waiting on. Its default face is the river: reed-green vessels, silt-brown ground.

Faces it could take later, once a role asks: `funerary`, where the vessels are canopic jars and what is
measured out is oil for the rites.

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

## 10. Prior art, and where this deliberately parts from it

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
