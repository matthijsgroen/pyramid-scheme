# Canisters — measuring a volume by pouring

Three or four canisters of known size stand on a bench, one of them full. Measure out an exact volume by
pouring between them, and nothing else — the water in front of the player is all the water there is. The
classical decanting problem (Tartaglia, Poisson), cut to the shape this catalogue asks of a family.

## 1. Rules

- Three or four canisters, each with its capacity written on it. One starts full; the rest are empty.
- **One move: pour** one canister into another, until the source is empty or the destination is full.
  There is nowhere to fill from and nowhere to throw water away, so every amount has to come from
  somewhere and nothing can be discarded to start over. That conservation is the puzzle.
- **Each vessel says what is in it against what it takes** — `3/8` under the shape, at every tier, with the
  level drawn to scale above it. The arithmetic this family is for is choosing the pours, not remembering
  the totals; see §7 for why the amount stopped being hidden.
- Reaching the volume is not enough: the player **claims** a vessel, saying it holds what was asked. A
  wrong claim costs a move like any other, so guessing is not free.
- **A move budget**, and it is the whole puzzle — see §2.

## 2. Why this family

**It is the only family here whose arithmetic is constructive.** Every other numeric family asks the
player to work out a value that is already fixed: what a glyph weighs, which figure fits a cell. This one
asks them to _make_ a quantity that is not in front of them, out of two that are. That is a different act,
and it is the one Egyptian arithmetic is actually about — a hekat measured by doubling and halving into
vessels that do not divide evenly.

**And it is the first board here that is not a grid.** Sudoku, futoshiki, sumplete and star battle are
squares; hidato is a comb and constellation a lattice; balance scale is rows. A bench of vessels is a
different shape of screen and a different shape of thought — nothing is scanned along a line, and there is
no cell whose neighbours are the argument. That is worth a slot on its own.

**Against balance scale**, which is the near neighbour: that one is algebra on unknowns — the weights
exist and the player deduces them. Here the capacities are known and the player constructs. Neither
substitutes for the other, and the pair covers arithmetic from both ends.

**The budget is what makes it a puzzle rather than a procedure.** Without it the player can flail: any
sequence of legal pours eventually reaches any reachable volume, so there is nothing to get wrong, only
something to take a long time. With it the player has to know _before pouring_ which way to open.

**It is the optimal line plus one, and the one buys a slip rather than a second opinion.** A wrong pour
costs two moves or more nearly two thirds of the time (§3), so a single spare leaves the reasoning binding
while forgiving what is not reasoning at all: a mis-tap, a pour that turns out to move nothing, one wrong
tap on a fourteen-pour line. **And the budget is enforced** — pours stop when it is spent (§6).

## 3. Generation — draw a set, then a volume it can reach

Draw-and-measure, not carve-and-hide. A board is a set of capacities with the largest full, a run of
targets, and a budget.

**A set has to be worth pouring between.** The others must hold the biggest one between them, or the water
has nowhere to go and the board is over in a pour. That single condition is what makes a set playable, and
the generator enumerates only sets that meet it.

**Reachability is searched, not decided.** With a fixed total and no way to add or discard water, the
two-vessel Bézout rule does not answer this shape: what is reachable depends on where the water is
standing, and a leg starts from wherever the last one left it. So the generator runs the same breadth-first
search the hint does, and picks among the targets it actually finds. It never gambles on solvability, and
the line it finds is the budget.

**A wrong pour is usually recoverable, and never free.** Measured over 600 boards across the four tiers,
pricing every alternative pour at every step of the line against the optimum from there:

| a wrong pour costs | share |
| ------------------ | ----- |
| one move           | 36%   |
| two moves          | 31%   |
| three or more      | 33%   |
| cannot be undone   | 0%    |

Nothing strands a player — conservation cuts both ways, and any position can still be worked back — but
two thirds of wrong pours cost more than the single spare move. **So the difficulty is how many steps fork
and how wide**, not how long the line is: 87% of steps offer more than one pour worth making, at 4.1 legal
pours a step. That is what `minForks` gates, and what `minLine` and `maxLine` bound (§5).

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

It is the price of pouring being the only move. The one local rule available — never put the water back
where it just came from — prunes almost nothing, because with nowhere to fill from and nowhere to empty
onto there are no wasteful moves for it to catch: 87% of steps still offer more than one pour worth making.
There is no ladder of named deductions that reaches the next move, because from most positions two or three
pours are equally defensible until you look further ahead than a rule can see.

So the hint's REASON is honest and local — the player can check it against the canisters — while the CHOICE
behind it is not reproducible from the board alone. Worth revisiting if a real technique for this shape
turns up; until then, this is the seam.

## 5. Tiers

Two knobs, and neither is board size — there is no board to grow.

- **How long the line is, between a floor and a ceiling.** The ceiling is what makes a tier teach one
  thing: with a floor alone a two-pour measure and a nine-pour chain are the same tier, and a player who
  draws the second one first has met the whole family at once.
- **How many canisters stand on the bench**, which is the branching factor and nothing else.

**The family debuts at junior, not starter.** The world holds three starter canister rooms against
seventeen junior ones, and three rooms cannot teach an arithmetic — a player needs the same idea several
times over before it is theirs. Every role this family carries has two or more other starter families to
dress a starter room with, so nothing goes undressed for it.

| Tier   | Canisters | Capacities | Line | What it teaches                            |
| ------ | --------- | ---------- | ---- | ------------------------------------------ |
| junior | 3         | ≤ 9        | 2–3  | what a pour leaves behind                  |
| expert | 3         | ≤ 12       | 4–6  | parking a leftover and picking it up again |
| master | 3         | ≤ 15       | 6–9  | a line long enough that the two compound   |
| wizard | 4         | ≤ 16       | 5–7  | a fourth canister to lose the measure in   |

Counting the choices that must go right — log2 of the useful moves at each step, summed along the line —
the tiers climb 2.7, 4.7, 6.6, 11.7 over 200 boards a tier. One new idea a tier, and the starter row the
tier list still needs is kept below junior in case a starter room is ever authored.

**One volume a board, at every tier.** Legs are a knob the generator has and nothing turns up: a second
volume measured from the first's leftovers doubles the board and asks the same question twice, and
playtesting says the first one is already the hard part. A player who can measure one can measure two, and
is only being kept at it longer.

The unreachable-target rung (§4.1) is designed and **not built**: refusing a board is a screen affordance
no other family has.

**A fifth canister is not a wizard tier.** The fourth already takes branching from 3.6 legal moves a state
to 5.6; a fifth makes the shortest line stop being unique, and a line that is not unique cannot be hinted.

## 6. Interaction

- **Pouring is tapping one vessel then another**, and it is the only move, so a tap needs no mode. The held
  vessel wears a ring, so which of the two meanings a tap has is always visible.
- **A button under each vessel claims it**, and claiming is the only way to finish the board. It never
  confirms an amount on its own — it cannot, or the puzzle would be to pour at random and watch for the
  confirmation.
- **A tap that cannot pour picks that canister up instead.** Tapping a full vessel while holding another
  has no second meaning, so answering it by putting down what was held is a dead end: nothing moves,
  nothing says why, and the player is two taps from where they were.
- The budget is shown as remaining moves. **Undo takes back a pour** and gives the move back — the
  arithmetic is the puzzle, and making the player re-tap a line they already reasoned out is not.
- Reset puts the water back in the canister it started in.

## 7. Drawing

A canister is drawn as a vessel with its level filled, and under it what it holds against what it takes —
`3/8`. The numbers are what is exact — a vessel's drawn height is indicative, compressed so a small one
stays big enough to tap, so heights are for seeing at a glance rather than for measuring against each
other. A player comparing 5 against 8 is doing the puzzle, and comparing two heights is not the same act.

**The amount is written because this board is hard enough at the two things it is about.** The arithmetic
is one: which volumes these vessels can reach at all, and by what pours. The logistics are the other:
getting there inside a budget that is the optimal line exactly, where a wasted pour and a wrong claim cost
the same (§2). Both are the puzzle and both stay.

Remembering the running totals was a third demand on top, and it was hidden at first on the argument that
it WAS the difficulty. It is not: carrying three or four amounts across a fourteen-pour line makes no board
harder to solve, only cheaper to lose. So the vessels say what they hold, and the reasoning above is left
entirely to the player.

**A pour animates**, because which canister ran out is the information: the source emptying before the
destination fills is what tells the player the pour was limited by what they had, not by what fits.

**The level is drawn indicatively**, near enough to scale to carry the one reading a pour has to leave behind at a glance:
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
- **Duration is not the problem; the reasoning is.** Boards run 2.6 pours at junior and 7.1 at master,
  longest 9 — at roughly three seconds a pour, every tier is under a minute of moving water, well inside
  `puzzle-screens.md`'s soft six-minute target. What the player spends the time on is the 87% of steps that
  fork, at 4.1 legal pours apiece.

  Playing the forced runs out automatically was considered and **rejected**: it would hand the player the
  very step they are there to find.

- **Freshness is measured and holds.** Over 150 boards a tier draws 28 distinct capacity sets at junior
  and 138 at wizard, against 8 and 16 distinct targets. Two boards in a row are unlikely to rhyme. What is
  NOT guaranteed is that two rooms near each other on the same floor draw different sets — that is the
  allocator's business rather than this family's, and worth a look now the family is authored into the
  world.

## 10. What is known about decanting

Results from the literature, checked against this family's own engine rather than taken on trust.

- **The classic board behaves as the literature says.** Three vessels of 8, 5 and 3 with the 8 full, split
  into two 4s: a 4 stands after six pours and the second one pour later, seven in all, which is the known
  optimum. It is a spec.
- **The state space is a triangular lattice**, barycentric coordinates on which a solution is a **billiard
  path** reflecting off the capacity walls — Tweedie's trilinear coordinates, read as billiards by
  Perelman. That is a picture of why a line here cannot be reasoned out one step at a time: the trajectory
  is determined once a direction is committed to, but the direction is a property of the whole path rather
  than something readable off the vessels in front of you. §4 pays for that.
- **Reachability is not Bézout.** The two-vessel rule — the `gcd` divides the volume and it fits the larger
  vessel — needs an unlimited supply to fill from, and there is none here. With a fixed total, what can be
  reached depends on where the water is standing, so this family searches for it (§3).

And a negative result worth having: **there is no closed form for the minimum number of steps.** It has to
be simulated. Which is the best news in this document — a player cannot memorise a formula in place of
working the board out, so the reasoning is the only way through.

## 11. Prior art, and the family this one is not

The puzzle has two classical forms. **This family is decanting** (Tartaglia, Poisson): a fixed total,
pours between vessels only, nothing to fill from and nothing to drain into.

**Tap and sink is the other one, and it is a different puzzle rather than a variant of this.** Two vessels,
an unlimited river to fill from and ground to empty onto, three moves instead of one. Everything that
follows from that is different: two vessels are enough for it where this needs three, its wrong openings
cost a bounded two moves where a wrong pour here costs whatever the position says, and — the part that
matters for this catalogue — **it has local rules that prune.** Never fill what is already full, never
empty what you just filled, and most of its states have one move left worth making. A hint for it could
name a technique and be checked, which is exactly what §4 records this family cannot do.

**So it is a viable family and a genuinely different one**, worth its own slot rather than a knob on this
one. What it would need is its own screen (a river and a ground are two affordances this board does not
have), its own hint sourced from those rules rather than from a search, and its own tiers — length and
capacity size, since it has no legs to lean on and no third vessel. It is not designed and not built.

**The shipping mobile versions are tap-and-sink**, with the same live move counter against a
breadth-first best, and they find depth by adding a third jug. They can carry that because they never
explain a move; a hint that has to say _why_ cannot follow a line whose direction is only visible from
above.
