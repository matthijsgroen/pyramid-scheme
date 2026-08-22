# Tableau (the tomb's reward calculation)

Family doc. The catalogue entry (tier debut, weight, theme fit) lives in
`docs/game-design/PUZZLE_FAMILIES.md` §4.1; the screen bar every family must clear lives in
`docs/instructions/puzzle-screens.md`. This doc holds what is specific to the tableau: what the player
is deducing, how a board is built, and why this family alone gates on what the player owns.

Its place in the tomb — which rooms carry one, how they gate a descent, what a solved one pays out —
is `docs/game-design/pyramid-interior-design.md`, the authoritative interior reference. This doc does
not restate it.

---

## 1. Rules

A wall of arithmetic with hieroglyphs where the numbers should be.

- Every hieroglyph stands for a whole number, the same number everywhere it appears on the wall.
- A run of **hint formulas** is written out above the main one. Each is a complete, true equation.
- The **main formula** is the one being decrypted, and its blanks are the puzzle.
- Fill every blank with the hieroglyph that belongs there. All blanks filled, the tableau is read.

**A hieroglyph can only be placed if the player has completed it.** That is the rule no other family
has, and §2 is about why it is a rule rather than an accident.

## 2. Why this family

Two jobs no other family does.

**It is the tomb's own puzzle, and the only one that reaches outside its room.** Every other family is
sealed: a board is generated, solved and forgotten, and nothing carries between rooms (that is
`PUZZLE_FAMILIES.md` §2's P3, and it is what lets any family be dropped anywhere). The tableau is the
deliberate exception, and the exception is the mechanic — a tomb stalls until the player has hunted
enough fragments in the pyramids to complete the hieroglyphs its next wall is written in. The fragment
hunt and the tomb gate each other, and the tableau is where the two meet.

**It is where arithmetic stays.** The catalogue drifted toward deduction families deliberately, and the
maths did not have to go with it. A tableau is substitution and evaluation — the skill a player brings
from the pyramid exteriors — dressed as decryption rather than as a sum.

Because it gates on possession, **it is the one family that is allowed to be unsolvable when entered**.
Gating is soft: the room opens, the wall is legible, and the player can see exactly which hieroglyph
they are missing. That is a signpost back to the pyramids, not a locked door.

## 3. The deduction ladder

One rung, applied over and over: **a hint formula that contains exactly one unknown pins that unknown.**

The chain is built rather than hoped for. Hint _i_ is written over the first _i_ symbols — the first
_i−1_ of which the earlier hints have already pinned — so every hint introduces exactly one new value
and every value is forced. The first hint carries one symbol alone, and is restricted to `+` and `*` so
it reads directly rather than needing a rearrangement.

So a tableau never needs a guess, and it never needs simultaneous equations. It needs the player to
work down the wall in order, and to hold what they have learned. What scales is not the reasoning but
**how much is being held at once**, which is the honest thing to say about this family's difficulty and
the reason the Scribe's Eye perk exists — it buys annotation slots, so the memory load comes down while
the arithmetic does not.

## 4. Generation

`src/mods/hieroglyph/game/generateRewardCalculation.ts`. Construction, not search:

1. Draw `amountSymbols` distinct numbers from the tier's range, one per hieroglyph.
2. Build the chain of hint formulas — for each _i_, an equation over the first _i_ numbers, with the
   first _i−1_ shuffled among the known values and the _i_-th appearing as the new one.
3. Build the main formula over the same numbers.
4. Map each number to one of the tomb's hieroglyph ids and count how many slots each fills.

`createVerifiedFormula` (`src/game/formulas/formulas.ts`) is what keeps a drawn equation legal: every
operand and result has to come out a positive whole number, and it redraws until they do. There is no
technique solver and no uniqueness gate, because there is nothing to prove — the answer is the mapping
the generator started from, and the chain is forced by construction.

**That is also why this family is not on a seed list** (`docs/instructions/puzzle-screens.md` §6.1). It
does not search, so there are no retries to skip.

## 5. Difficulty knobs

Two tables set them, which is worth knowing before turning either. `TABLEAU_CONFIG`
(`src/mods/hieroglyph/app/plugin.tsx`) holds a per-tier default; a tomb's own `levelSettings`
(`src/data/journeys.ts`) authors it directly. The dials themselves:

- **`amountSymbols`** — how many hieroglyphs a wall is written in, so how long the chain is and how
  much is held at once. The dominant dial.
- **`numberRange`** — how big the values are, so how heavy each evaluation is.
- **`operations`** — which of `+ - * /` the tomb writes with.
- **`maxMultiplyOperandResult`** — a ceiling on what a multiplication may produce, so a legal formula
  cannot also be an unreasonable one.
- **The tomb's symbol pool** (`TOMB_SYMBOLS`) — which hieroglyphs its walls use, and so what the player
  must have hunted before the tomb will open up.

**Escalation runs across a descent, not just across tombs.** `buildTombCalculationSettings` takes a
room's position in the tomb's whole tableau sequence and ramps between them: the first room uses one
operator and the base range, the last uses every operator the tomb authored and a range widened by its
own span. Keyed by room rather than by floor, so two rooms on one floor still differ. Without it every
wall in a tomb asks the same shape of sum.

## 6. Controls

Tap a blank to place the currently chosen hieroglyph; tap a filled slot to clear it. A hieroglyph the
player has not completed cannot be placed at all, and a hieroglyph can only fill as many slots as the
wall has for it.

**Completing a hieroglyph is a reusable key, not a consumable.** Owning it fills every slot it belongs
in, here and in every other tableau, and nothing is spent. `tableauPuzzleState.ts` gates placement on
ownership rather than on a dwindling stock, and that is deliberate: a fragment hunt that could be
wasted by spending it in the wrong room would make exploration punishing.

## 7. Hints

The hint formulas **are** the hint system, and they are on the wall from the start rather than behind a
button. That is the one structural difference from every other family, where a hint is derived from a
technique solver on request (`puzzle-screens.md` §4).

There is consequently no technique-solver hint to give. What the shell's hint button should say here is
an open question — §10.

## 8. Board requirements

- Every symbol on the main formula appears in the hint chain, or it cannot be deduced.
- Every operand and every result is a positive whole number, at every level of every formula.
- Distinct symbols take distinct numbers, so two hieroglyphs are never interchangeable.
- The wall fits a 360px screen. `amountSymbols` is bounded by the room the formulas need, not only by
  the difficulty wanted.

## 9. Theming

The family is already in its fiction and has no skins. A tomb wall of hieroglyphs standing for
quantities is what the puzzle literally is, which is why it carries `tomb-puzzle` rather than a theme
tag and why the allocator never draws it for a themed pool.

Its name and story come from the tomb's `TableauLevel` entry, so a wall reads as part of that tomb's
story rather than as a generic sum.

## 10. Open questions

1. **What does the hint button do here?** Every other family derives a hint from its technique solver;
   this one has no solver and shows its reasoning up front. The honest options are to hide the control,
   to point at the next unsolved hint formula, or to name the missing hieroglyph when the wall is
   gated rather than unsolved.
2. **Is the ladder measured?** No family doc here quotes solve times or a per-board grade, because
   nothing measures them for a family that does not solve. `PUZZLE_FAMILIES.md` §3.2's solve-time
   budget is therefore unverified for the tableau — and the long chains at the deep tombs are where it
   would bite.
3. **How large should the symbol pool be?** `pyramid-interior-design.md` §13 wants `TOMB_SYMBOLS` cut
   from 7–15 to 3–6 to fit the permanent-discovery model. That is authoring work in `tableaus.ts` and
   it changes how hard a tomb is to unlock, not how hard a wall is to read.
4. **Does the difficulty scale the right thing?** The dials grow the chain and the numbers. Neither
   makes the reasoning harder — only longer — so a wizard tableau may be a starter tableau that takes
   more patience. Whether that is a problem is a design question this doc cannot answer alone.
5. **What should the wall look like once the interior redesign settles?** The screen predates the move
   to the interior model, where a tableau became an ordinary encounter room dispatched through the
   family registry rather than a tomb-specific view. So the questions the other families answered in
   `puzzle-screens.md` §1 and §3 — how the wall fits a phone as the chain grows, where the hieroglyph
   picker lives, how a gated wall says which symbol is missing — are still open here, and the answers
   are the ones most likely to change what this doc says about §6 and §7.
