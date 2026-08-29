# Procession — the ordered hours

Family id `procession`, owned by the puzzle mod. Catalogue entry: `PUZZLE_FAMILIES.md` §4.29. The quality
bar every puzzle screen clears is `docs/instructions/puzzle-screens.md`.

Built. What is measured here is generation; **no tier has been timed against a human clock**, so §5's
solve-time expectation is an argument rather than a measurement.

## 1. Why this family

**Nothing else in the catalogue trains duration.** Eleven other families and every one of them reasons
about what belongs in a cell: a value, a mark, a line, a piece. Elapsed time — this lasts three hours, that
one begins when this ends, both together must fit between dawn and dusk — is the one arithmetic a child
meets outside a maths book, and the game taught it nowhere.

It was supposed to be the water clock (§4.4 of the catalogue), and the water clock died with the sundial for
a reason worth repeating: **a drawn level is a reading, not a deduction**. Looking at a mark and saying what
hour it is trains lookup. So the duration family cannot be a clock face. It has to make the times themselves
the hidden state.

That is what this one does. Every bar's length is given; **no bar's start is**.

## 2. The rules

- The board is a **track of ticks** — dawn at the left edge, dusk at the right — and a stack of **rows**.
- **One bar to a row.** A bar's **length is fixed and visible**: a three-tick bar is three hours long and
  stays three hours long.
- The player **slides a bar along its row**, and it may sit anywhere the day has room for it.
- Between the bars sit **marks** (§2.1). The board is done when every mark holds.
- A board has **exactly one arrangement** that satisfies every mark, verified at generation.

**There is no illegal placement.** A mark whose condition is broken draws broken, in place, from the first
frame. So there is no fail state, nothing to undo — a bar is dragged back to where it was — and the board
teaches itself: move something, watch a mark go red, learn what the mark meant.

### 2.1 The six marks

| Mark          | Drawn as                                             | What it constrains                              |
| ------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **pin**       | a notch on the track under one bar                   | that bar starts on that tick                     |
| **link (n)**  | two swatches with a numeral between them             | exactly `n` ticks between A's end and B's start  |
| **before**    | two swatches, one arrow                              | A ends no later than B starts                    |
| **apart**     | two swatches, arrows both ways                       | the two never overlap — **in either order**     |
| **together**  | two swatches drawn across each other                 | the two share at least one tick                  |
| **span (T)**  | the rows stacked, with a numeral                     | first start to last end is exactly `T` ticks     |

Two of them carry a number and those two are the arithmetic: **link** is a gap counted hour by hour,
**span** is a sum over the whole day. **apart** is the only mark that does not say which way round, and the
top half of the ladder is made of it.

`link (0)` is a handoff — the same mark with a zero on it rather than a seventh kind.

**Every mark except the pin is a chip under the board**, and a chip is a miniature of the relation it
states: swatches in the rows' own colours, a numeral where there is one, and a red border while it is
broken. **The pin is drawn on the track instead**, because it is about one row and one tick — a chip would
make the player go and find the tick again.

## 3. The ladder — four rungs, and the tier is the weakest one that settles the board

A bar's knowledge is the SET of ticks it could still start on, and solving is that set narrowing.
**Which marks a rung may read is the whole of what separates one rung from the next**, so a rung is a
filter over the marks rather than a routine of its own (`solveProcession.ts`).

**R1 — chain.** Pins and links only. A pin fixes a bar outright, a link fixes the next one off it, repeat.

**R2 — squeeze.** Adds `before` and `span`: a chain of them between the two edges leaves only so many ticks
to go round, and every bar's window shrinks by that arithmetic. **This is the elapsed-time rung** — it is
subtraction against the width of the day.

**R3 — apart.** Adds `apart` and `together`, read as a support check: a start survives only if the other bar
has somewhere to stand alongside it. Where one order of a pair does not fit on lengths alone, the
disjunction collapses without a guess.

**R4 — split.** Take one order, follow it until it breaks, and the other order is the answer. **A shave
rather than a guess that sticks**: the value is struck off and the board is never left standing on an
assumption, which is what makes it a technique a player can follow.

**There is no fifth rung, and that is a finding rather than a decision.** A supposition *inside* a
supposition was designed as the top rung and does not occur: across 900 boards rolled at the widest days and
bar counts this family ships, not one needed a second level. What separates the top two tiers instead is
**how much of the board only yields to a supposition**, counted as candidates struck that way — a number,
not a depth.

## 4. Generation — roll a day, read the marks off it, thin

1. **Roll the truth.** Random lengths, random legal starts. A day that leaves both ends empty is rolled
   again: it is a smaller day than the one authored, and it makes `span` a statement about nothing.
2. **Read every true mark off it** — every pin, link, before, apart, together, and the span. The set is
   enormously over-determined and the kinds overlap on purpose (a link implies a before implies an apart),
   so what survives thinning is a CHOICE between ways of saying the same thing.
3. **Thin.** Shuffle and drop marks one at a time, keeping a drop while exactly one arrangement still
   satisfies what is left. **The order is the difficulty knob nobody has to set**: pins and links are
   offered first, so the survivors are relations, which is the only way a tier above `chain` is reached.
4. **Scramble, then judge.** The bars are put down anywhere, and `gradeProcession` asks the four questions
   that matter: does the board open unsolved, is the arrangement unique, does the ladder reach it, and is
   the rung it needs the one this tier is for.

Uniqueness is **verified, never assumed** — depth-first over start assignments with propagation between
choices, aborting at the second solution. **It is also what keeps the board anchored**: drop every pin and
the whole day slides along the track as a block, which is exactly a second arrangement, so the degenerate
case fails the same test rather than needing a rule of its own.

**The gate is separable from the construction** (`puzzle-screens.md` §6.1), which is why a listed seed
costs nothing at play time: the construction cannot fail — any day yields marks that describe it — and all
the judging happens after a whole candidate exists.

## 5. Tiers, as measured

Rolled over 4000 seeds a tier, one attempt each — the search the offline pass runs. `steps` is what the
ladder reported, and it is the closest thing to a bookkeeping measure this family has.

| Tier    | Bars | Ticks | Marks in play              | Rung    | Splits | Seeds clean | Marks on the board | steps |
| ------- | ---- | ----- | -------------------------- | ------- | ------ | ----------- | ------------------ | ----- |
| starter | 3    | 8     | pin, link                  | chain   | —      | 41%         | 2–3                | 15–18 |
| junior  | 4    | 10    | + before                   | squeeze | —      | 13%         | 3–6                | 29–32 |
| expert  | 5    | 12    | + apart, together          | apart   | —      | 19%         | 4–9                | 41–48 |
| master  | 5    | 14    | + span                     | split   | 1–4    | 3.5%        | 5–10               | 51–58 |
| wizard  | 6    | 16    | all                        | split   | 5–20   | 3.4%        | 6–13               | 73–83 |

**A seed costs one to two milliseconds**, so the deep tiers being rare costs the build machine seconds
rather than minutes, and a room with no listed seed can still search live without the player waiting.

**Sixteen ticks is the ceiling and it is a mobile number.** At 390px a sixteen-tick track is 24px a tick —
too small to tap, which does not matter, because **the touch target is the bar**: the shortest bar is two
ticks, so the smallest thing a finger grabs is ~48px wide, and it drags along one axis with the snap doing
the precision. A wider day is a tablet question, if it is ever a question.

**Solve time is expected at one to three minutes at the top and has not been measured.** The argument is
§6 of the catalogue's: this is coupled bookkeeping like futoshiki rather than local bookkeeping like
sumplete, so the size is held down deliberately — six bars, not ten.

## 6. Controls

- **Drag a bar along its row**, snapping to the nearest tick, committed as the drag goes rather than on
  release. A drag past the edge leaves the bar against it rather than being refused.
- **Tap a chip** to ring the rows it joins, so a board with nine marks is readable without reading.
- **Reset, and no undo.** Rush hour needs an undo because a shove there is a commitment three moves deep;
  here a bar is dragged straight back, and a second way to do that is furniture.

## 7. Hints

**The player's board is always a complete arrangement**, which makes a hint different here than in a grid
family: there is no empty cell to fill, only a bar in the wrong place. So the ladder is run from nothing
known, in its own order, and the hint is the earliest thing it settles that the board disagrees with. The
board hatches the ticks that bar belongs on and rings it; the sentence names the rung that reaches it —
the chain it hangs off, the arithmetic that leaves it nowhere else, the order that does not fit, the
supposition that breaks — and the second line says to drag the ringed bar onto the hatching.

## 8. Theming

Duration is the most themable thing in the catalogue, because every place in this game keeps a schedule.
**One face ships, and it is deliberately no place at all**: bars on a ruled track, told apart by their row
and their colour. The tag list is `puzzle` and nothing else, for the reason rush hour's is
(`rush-hour.md` §5) — a face is a claim that the board can dress as somewhere, and that claim lands with
the painted art rather than before it.

What the art would be, in the order it is worth painting:

- **`funerary`** — a funeral procession: bearers, the opening of the mouth, the mourners' walk, the
  sealing. The role exists, is authored across six journeys, and is the largest pool in the game.
- **`cosmos`** — decans crossing the night sky, each visible for its own stretch. The journey with no pool
  at all is `wizard_4` (`journeys.md` §9); **carrying the tag is not the same as the role existing**.
- **`water`** — sluice gates on a flood channel, each open for its own count of hours.
- **`trade`** — legs of a caravan, or a quay's loading slots. That pool sits one member below the floor.

## 9. What this is not

- **Not canisters.** Both are arithmetic, and they are opposite shapes: canisters searches a state space
  for a sequence of pours; here the state is a set of unknown positions narrowed by constraints.
- **Not rush hour.** Same gesture, opposite epistemics. There nothing is unknown and the question is move
  order; here every start is unknown and there is no move order at all.
- **Not futoshiki.** Inequalities in both, but futoshiki's live over a permutation and these live over a
  number line with lengths. `before` is subtraction, not ordering.
- **Rejected: stretchable bars.** The first sketch let the player set durations too, which puts a stretch
  handle on a 24px tick and asks a thumb to hit the difference between a three-tick and a four-tick bar.
- **Rejected: two bars to a row.** Designed as the top tiers' extra knob — bars in one row blocking each
  other — and cut before it was built: the rung bands hold without it, and it is the only rule that would
  have made a row behave differently from every other row.

## 10. Open questions

- **Does `apart` read wordlessly?** It is the only chip that means "one of two things", and the whole upper
  ladder is built on it. If the badge does not teach itself in one board, the family tops out at R3.
- **Thirteen chips is the worst case at wizard**, and nothing caps it today. If play says a board that wide
  reads as clutter, the cap is one line in the gate — and it costs seeds, not design.
- **Is `span` legible?** Stacked swatches with a total is the most abstract chip here.
- **Where does it land on the clock?** Unmeasured, like every family the owner has not played to a finish.
