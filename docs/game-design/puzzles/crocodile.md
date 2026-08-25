# Crocodile — the pit crossing

Family doc. The screen bar every family must clear lives in
`docs/instructions/puzzle-screens.md`; the catalogue entry lives in
`docs/game-design/PUZZLE_FAMILIES.md`. This doc holds what is specific to the
crocodile: its rules, why the crossing is shaped the way it is, how a board is
generated, and what a wrong step costs.

The crocodile is the **capstone** of a tomb floor — the last room on the main
path, standing between the player and the floor's treasure
(`pyramid-interior-design.md` §8). Its role is authored per floor with
`nodes: [{ where: "last", encounter: "capstone" }]`.

## 1. Rules

A pit of water, spanned by **rows of stones**, each stone carrying a sum. The player starts on the near
bank and crosses to the far one.

- In front of every row sits a **crocodile**, and it wants exactly one of the answers in that row:
  the **biggest**, or the **smallest**. Which one it wants is written beside it (§5).
- Give it what it wants and the player lands on that stone.
- Step on any other stone and it **bites**: the player loses health (`takeTrapDamage()`) and is back on
  the near bank. The board does not change and the room is not left.
- Landing on the last row reaches the far bank. That is a solved board.

**Every crocodile asks about the row in front of it and nothing else.** It is a superlative, not a
comparison with the stone underfoot: the player never has to remember what they were standing on, and
never has to read a direction off a symbol. Working out the sums in one row answers it completely.

Health is therefore the price of **bad arithmetic only**. A player who works the sums out never bleeds —
the same contract the trap families have, which is why this family lives in the trap mod (§6).

## 2. Why the crossing, and why the crocodiles disagree

The old crocodile showed two sums side by side and asked which was larger, then asked which digit had
always been eaten. It failed on both halves:

- The comparison could not be got wrong — the smaller side was simply not clickable, so tapping both
  sides always worked and no arithmetic was needed.
- The digit question was **recall, not reasoning**, and it was not answerable from the board, which by
  then no longer showed the eaten sums. It could also have more than one correct answer while accepting
  only one, so a player could be right, be told they were wrong, and lose the whole board for it.

A crossing fixes the first: every step is a commitment with a cost, so the sums have to be worked out
before the finger moves. A row of three or four stones also asks for more arithmetic per decision than a
pair did — the answer is the biggest of four, not the larger of two.

**Not every crocodile wants the same thing.** A pit where all of them eat the biggest is answered by one
habit picked up in the first row and never revisited; mixing in crocodiles that want the smallest means
the mark beside each one has to be read before the sums are, which is the second thing this board
teaches. The all-biggest pit is kept as the family's **debut** (P4, and the wordless first encounter of
P5): junior tombs get it, and the mixing starts at expert.

## 3. Generation — one gate, and it is not solvability

A board is `columns × stonesPerColumn` sums plus one crocodile per row. **Every row has exactly one
answer and every board is crossable**, so there is no route to search for, no dead end to avoid, and no
uniqueness pass to run — the things the deduction families spend their generators on do not arise here.

What generation does have to work at is that the answer cannot be picked out **by eye**. A row where the
biggest answer is 30 and the rest are single digits is read off the size of the numbers written on the
stones, and nobody works a sum out to pick it.

1. Draw what each crocodile wants. Junior: all biggest. Expert and up: drawn per row, redrawing an
   all-same pattern (that is the junior board wearing a harder sum).
2. Draw each row's stones with `createVerifiedFormula`, which already owns the operator mix and the
   `maxMultiplyOperandResult` cap, keeping every value in the row distinct — two stones worth the same
   is one choice offered twice, and a tie for the answer.
3. Keep the row only if its answer stands no more than `MAX_WINNING_MARGIN` clear of its nearest rival.
   Retried per row rather than per board, so one awkward row never throws away three good ones; a row
   that never clears it keeps its nearest miss, because a board a little too easy still plays while a
   room with no board at all is a dead end in a tomb.

The family ships **no seed list** (`puzzle-screens.md` §6.1). Those exist for generators too expensive
to run on a phone; this one draws a handful of formulas per row, so it builds live on every open and
costs no build step.

## 4. Tiers

| Tier   | Rows × stones | Numbers a sum | Crocodiles       | Operators | Range | `maxMultiplyOperandResult` |
| ------ | ------------- | ------------- | ---------------- | --------- | ----- | --------------------------- |
| Junior | 3 × 2         | 3             | all biggest      | `+ -`     | 1–10  | —                           |
| Expert | 4 × 3         | 3             | biggest/smallest | `+ - *`   | 1–10  | 5                           |
| Master | 4 × 3         | 3             | biggest/smallest | `+ - *`   | 1–12  | 8                           |
| Wizard | 5 × 3         | 3             | biggest/smallest | `+ - *`   | 1–15  | 10                          |

One row is one decision, and one decision is `stonesPerColumn` sums to work out — so a junior pit asks for
six sums across three choices and a wizard pit for fifteen across five. Division is excluded at every tier.

**Three stones a row is the ceiling, and three numbers a sum with it.** The nearest row is never scaled
down, so it has to fit a 360px phone drawn flat; a fourth stone, or a fourth number in a sum, puts it over
(`puzzle-screens.md` §1 — a board too wide means a smaller authored board, never a scroll container). What
depth buys is room for more ROWS, and that is where the top tiers spend it.

**Starter tombs have no crocodile.** `minTier: "junior"`, and no starter tomb authors a capstone — the
old `compareAmount: 0` board, which showed a bare chest and no puzzle at all, is gone with it.

## 5. Drawing the pit — depth, and a mark that means size

The crossing runs **away from the camera**: the near bank at the bottom of the screen, the far bank at the
top, and each row of stones drawn one step further into the pit.

**The pit slides forward a row at a time, and the row being answered is always at the front.** Depth is
measured from that row rather than from the bank: it stands full size against the bottom of the stage,
the rows still to come converge toward a vanishing point behind it (each step back covering half the
remaining distance), and a row already crossed slides down past the camera, blurred, and out of the way.

That is what makes the sums readable. A board that had to show five rows at once could only do it by
drawing all five small; a board that moves shows one row at the size a child can read, and spends the
depth on the rest. It is also why the tiers grow downwards into the pit rather than sideways across it
(§4) — another row costs almost nothing on screen, another stone costs width there is none of.

Each crocodile is drawn on the near side of the row it guards, with its mark beside it: **three bars, and
the one it eats is lit** — tall bar for the biggest answer, short bar for the smallest. The crocodile
whose turn it is sits at full strength and the rest are dimmed, so the one being answered is never in
doubt.

**An arrow was the first attempt at that mark, and it was wrong**: a triangle reads as a direction to
walk in, which is the one thing it does not mean here. The rule is about size, so the mark shows size.
No words, the same in every locale (P2).

The board sits in `PuzzleFamilyShell` like every other family: name over the board, goal and rules under
it, back and reset in the chrome.

## 6. Why it lives in the trap mod

Health is trap-owned (`healthCurrency.ts`, `useTrapProgress`), and a bite spends
it. A puzzle-mod family reaching into trap state would couple two mods that are
meant to toggle independently, so the crocodile moved to `src/mods/trap/` instead
— `ownerMod: "trap"`.

**It is not tagged `"trap"`, and must not be.** `placeEncounters.ts` turns any
trap-tagged encounter into `section.sealed = true`, a structural field: tagging
this family would reshape the corridors of every tomb floor that authors a
capstone, which is exactly what the encounter-authoring stability tenet
(`world-spec-stability.md`) forbids. Its tag stays `"capstone"`; the mod it
belongs to is what gives it health, not the tag.

It also does **not** use `TrapFamilyShell`. That shell owns the trap lifecycle —
a risk warning, one attempt, and a `trapTool` that disables the encounter and
walks past it. On a tomb capstone that consumable would buy the floor's treasure.
The crocodile is a puzzle that bites, not a trap: no warning screen, no disable,
and a bite returns the player to the near bank rather than ejecting them from the
room.

With the trap mod off there is no crocodile family, so a capstone node resolves
through the ordinary family-absence pass-through and the floor stays walkable.

## 7. Open questions

- **Bottoming out.** Health floors at 0 and nothing happens there yet, so a player at 0 crosses by trial
  and error for free. That is a gap in the health system rather than in this family, and it wants
  answering wherever the answer for traps is given.
- **The crocodile sprite is a side view**, so it sits beside its mark rather than being the mark. A
  facing or top-down croc would let the open mouth do the job the three bars do now, which is the
  stronger teaching image.
