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
something to take a long time. With it, the player must know _before pouring_ which canister to fill
first — and that is real arithmetic, because the two directions are not close (§3).

## 3. Generation — pick the pair, then the target the wrong way ruins

Draw-and-measure, not carve-and-hide. A board is a capacity pair `(a, b)` with `a < b`, a target `t`, and
a budget.

**Reachability is decided, not searched.** A volume is reachable exactly when it is a multiple of
`gcd(a, b)` and no greater than `b`. So the generator never gambles on solvability: it enumerates the
reachable targets for a pair and picks among them.

**Both directions are walked, and the gap is the difficulty.** There are only two strategies — repeatedly
fill `a` and pour it into `b`, or the mirror — so the generator walks both and takes the shorter as the
budget. Measured over eight pairs and their 68 reachable targets:

|                                                 |                                                     |
| ----------------------------------------------- | --------------------------------------------------- |
| shortest line                                   | 1 to 20 moves, average 7.6                          |
| targets where the direction matters by ≥4 moves | 52 of 68 (**76%**)                                  |
| targets where it makes no difference            | 1 of 68                                             |
| widest measured                                 | `[9,13] → 4`: **2** moves one way, **38** the other |

So the generator's real gate is **the gap**: reject a target whose two directions cost about the same,
because there the opening choice is a coin flip and the board teaches nothing. Everything else follows
from the pair.

## 4. The technique ladder

Three rungs, and the third is what makes the board forced.

1. **Reach** — is the target a multiple of `gcd(a, b)`? At the tiers that ask it, some boards are
   unreachable and the answer is to say so rather than to pour. This is the rung that teaches why
   `[4, 8]` can never measure 3.
2. **Direction** — which canister to fill first. The only branch in the puzzle, and the one the budget
   punishes. A hint here names the reason (_"filling the small one first can only ever leave you
   multiples of 3 in the big one"_), never the direction.
3. **The forced move** — after the opening, exactly one move is worth making, and two local rules are
   enough to see it, with no lookahead:
   - never pour back into a state already seen (which includes undoing the last move),
   - never empty a canister that is not full, and never top up one that is not empty — a partial measure
     is the thing you are carrying, and both moves throw it away.

   **Measured: under those two rules alone, every step after the opening has exactly one legal move**, on
   every pair tested and from mid-sequence states as well as from empty. That is what lets a hint name the
   move without handing over the answer: the reason is local and the player can check it.

## 5. Tiers

Two knobs, and neither is board size — there is no board to grow.

- **Legs.** How many volumes are asked for in turn. Each leg is a fresh opening decision measured from
  wherever the last left the canisters, so `n` legs is `n` decisions rather than a longer one. Forcing
  survives a non-empty start, which is what makes this safe.
- **How hard the opening is to see**, which is the direction gap and the size of the capacities.

| Tier    | Legs | Capacities | Notes                                                     |
| ------- | ---- | ---------- | --------------------------------------------------------- |
| starter | 1    | ≤ 8        | budget generous by a move; the point is learning the pour |
| junior  | 1    | ≤ 10       | budget exact                                              |
| expert  | 2    | ≤ 12       | second leg starts from the first's leftovers              |
| master  | 2–3  | ≤ 13       | one unreachable target offered per board, to be refused   |
| wizard  | 3    | ≤ 15       | tightest gaps                                             |

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
- **Duration is unmeasured.** The optimal lines are short (average 7.6 moves) but a player who picks the
  wrong direction walks a 20-to-38-move line before the budget stops them. §7's rule that duration is
  measured rather than assumed applies here more than anywhere.
