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

- The board is a **track of ticks** — dawn at the left edge, dusk at the right, **numbered every other
  tick** so a gap of two is counted rather than eyeballed — and a stack of **rows**.
- **One row is one thing that happens**, drawn as a glyph beside its own row: a fire lit, water carried,
  grain ground. A bar's **length is fixed and visible**: a three-tick bar takes three hours and keeps
  taking three hours.
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

**Every mark is a line under the board: the chip, then the sentence.** The chip is the relation in
miniature — the two rows' glyphs on their own colours, a numeral where there is one — and the sentence says
the same thing in words: _the grinding starts 1 hour after the fire is done_. The line turns red while the
mark is broken, and tapping it rings the rows it is about.

**Both halves, and the division of labour between them is the point.** The chip is load-bearing: a player
who reads nothing solves the board from chips, glyphs and the numbered track alone, which is what P2 of the
catalogue asks for — **that rule is about the player never PRODUCING language, not about the board staying
mute**. The sentence is what makes a row a doing rather than a rectangle, which is what the first playtest
asked for after solving a board of anonymous bars and feeling it had shuffled furniture.

The names live in the locale files and the glyphs in the skin, aligned by row index: a name is language and
a glyph is not, so they cannot share a home. What they share is the face. A sentence opens with its own
name, so the capital is applied in CSS and each name is written once, with its article.

**A pin has no chip** — it is drawn as a notch on the track under the row it pins, because it is about one
row and one tick and a chip would make the player go and find the tick again. It still gets its sentence. **The pin is drawn on the track instead**, because it is about one row and one tick — a chip would
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

**Nothing ships at the bottom rung, which is the second thing playtesting changed.** A board settled by
`chain` alone is a board where every bar is fixed by a pin or by a link off one — the player is told it, one
sentence at a time, and told is not solved. That was survivable while the marks were wordless chips and
became dictation the moment each mark said itself in words (§2.1). So the family enters at **squeeze**: even
a three-bar starter board asks what is left of the day once the pinned bar and the gaps are spoken for.
`chain` stays in the ladder because propagation has to start somewhere and the hint wording keys on it; a
spec holds it to a hand-built board so the rung cannot rot.

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

Rolled over 2000 seeds a tier, one attempt each — the search the offline pass runs. `steps` is what the
ladder reported, and it is the closest thing to a bookkeeping measure this family has.

| Tier    | Bars | Ticks | Marks in play             | Rung    | Splits | Seeds clean | Marks on the board | steps |
| ------- | ---- | ----- | ------------------------- | ------- | ------ | ----------- | ------------------ | ----- |
| starter | 3    | 8     | pin, link, before, span   | squeeze | —      | 7.1%        | 2–3                | 15–18 |
| junior  | 4    | 10    | + apart, together         | apart   | —      | 13.3%       | 4–5                | 28–32 |
| expert  | 5    | 12    | all                       | split   | 1–3    | 3.4%        | ~7                 | 43–49 |
| master  | 5    | 14    | all                       | split   | 4–8    | 1.4%        | ~7                 | 52–58 |
| wizard  | 6    | 16    | all                       | split   | 9–20   | 2.4%        | ~8                 | 73–83 |

**The top three tiers are the same rung, and the splits column is what tells them apart** — how many
candidates only fall to a supposition. The ceiling matters as much as the floor: past twenty, a board stops
being hard and starts being long, which is the shape §3.2 of the catalogue rules out.

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
- **Tap a mark's line** to ring the rows it is about, so a board with nine marks stays navigable.
- **Reset, and no undo.** Rush hour needs an undo because a shove there is a commitment three moves deep;
  here a bar is dragged straight back, and a second way to do that is furniture.

## 7. Hints

**The player's board is always a complete arrangement**, which makes a hint different here than in a grid
family: there is no empty cell to fill, only a bar in the wrong place. So the ladder is run from nothing
known, in its own order, and the hint is the earliest thing it settles that the board disagrees with. The
board hatches the ticks that bar belongs on and rings it; the sentence names the rung that reaches it —
the chain it hangs off, the arithmetic that leaves it nowhere else, the order that does not fit, the
supposition that breaks — and the second line says to drag the ringed bar onto the hatching.

## 8. Theming — a face is a cast, not a coat of paint

Duration is the most themable thing in the catalogue, because every place in this game keeps a schedule.
**And dressing this board as somewhere costs six signs and six names**: the ruled track, the chips, the
colours and every rule stay exactly as they are, because what makes a room a burial rather than a night sky
is which doings fill the rows. The visual half is written once (`GROUND` in `skins.ts`) and a face adds a
row of hieroglyphs; the names sit beside them in the locale files, aligned by index, because a name is
language and a sign is not.

Five casts ship, and four of them carry a role tag outright:

| Face       | Role       | The doings                                                                     |
| ---------- | ---------- | ------------------------------------------------------------------------------ |
| default    | —          | the fire, the water carrying, the baking, the boat trip, the ox driving, the night watch |
| `funerary` | `funerary` | the opening of the mouth, the wrapping, the anointing, the walk to the tomb, the offering, the sealing |
| `cosmos`   | `cosmos`   | the sun's crossing, the star's rising, the moon's watch, the open sky, the dawn, the turning year |
| `water`    | `water`    | the flood, the channel digging, the basin filling, the field watering, the ferrying, the reaping |
| `trade`    | `trade`    | the goods sorting, the bread selling, the beer selling, the ferrying, the hauling, the tally |

**What that buys, measured over the registered families**: `trade` goes from three members to **four**, which
is the floor a journey must clear before it may restrict to a role (§11.0) — the pool §11.0 names first is
closed by this family. `funerary` reaches six and `water` six. **`cosmos` gets its first member ever**: the
role `wizard_4` wants and nothing served, now at one of the four it needs.

**The signs are hieroglyphs rather than emoji.** They take the row's own colour (an emoji is painted and
cannot), they come from the subset this game already ships so no device is trusted to own a face, and the
vocabulary reaches things emoji has never heard of — a coffin, an offering table, an irrigation basin.
Anything used has to be a literal in a `.ts` file, because that is what `yarn generate-font` scans.

**A sign identifies; it does not explain.** Some of these are legible to anyone (the eye, the star, water)
and some are a shape you learn on your second board (the offering table, the folded cloth). That is
acceptable here and would not be in a family where the glyph carries the rule: identity is triple-coded —
sign, colour, row position — and the doing's NAME is written out in every sentence the mark makes. A player
who cannot read the sign reads the sentence; a player who reads neither still solves the board from the
chips. **Worth reviewing with fresh eyes anyway**, since a sign that reads as nothing is a missed chance
rather than a bug.

**The doings are a day and not a plot, deliberately.** The board says everything it knows in words — each
mark is a sentence — but the SET of doings implies no order of its own. The generator decides what happens
when, so a set that carried its own narrative (dressing, then the crowning, then the parade) would be
telling a lie on every board whose answer ran the other way. The names identify; the sentences state only
what the marks state. A fixed story would have to constrain the generator, and that is a different family.

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
- **Do the signs read?** Some are a shape rather than a picture on a first board, and the names carry the
  meaning until they are learned. Worth watching in play: a face whose signs never resolve into doings is a
  face that should swap them.
- **Thirteen chips is the worst case at wizard**, and nothing caps it today. If play says a board that wide
  reads as clutter, the cap is one line in the gate — and it costs seeds, not design.
- **Is `span` legible?** Stacked swatches with a total is the most abstract chip here.
- **Where does it land on the clock?** Unmeasured, like every family the owner has not played to a finish.
