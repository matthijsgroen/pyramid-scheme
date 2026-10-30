# Pair Puzzle

Family doc for the lab-only `pair-puzzle` (the Tents genre). The screen bar is
`docs/instructions/puzzle-screens.md`; the doc outline follows `star-battle.md`.

> **Built and measured, lab-only.** The generator, ladder and tiers exist; the family is not registered in
> `src/mods/puzzle/index.ts`, so no site is dealt it and there is no seed list yet. Every number below comes
> from the shipped generator.

## 1. Rules

- **Every anchor owns exactly one piece**, on an orthogonally adjacent square.
- **A row or column holds exactly its printed count of pieces.**
- **No two pieces touch**, diagonals included.
- A piece never stands on an anchor; anchors are printed, never marked.

**Uniqueness is over piece positions only.** Which piece belongs to which anchor is never shown, only checked
(`hasPerfectPairing`), so two pairings of the same pieces are one answer. Asking the player to name the
pairing would add a second thing to write for no deduction. The generator accepts a board because the forward
solve reaches the pieces, which settles position uniqueness: every step was forced.

## 2. Literature

Tents (pzzl.com, UKPA guide): the same rules with trees as anchors and tents as pieces.

## 3. The deduction ladder

`PAIR_TECHNIQUES`, cheapest first: `touch`, `zeroLine`, `noAnchor`, `lineFull`, `lineTight`, `onlyWay`,
`claimed`, `lineBlock`, `wouldStrand`.

`claimed` and `lineBlock` reason that a pairing exists, never which one. `noAnchor` and `claimed` emit batched
steps. `lineBlock` runs rows against columns and columns against rows; `wouldStrand` has row, column and
anchor readings.

## 4. Generation

1. Place a random non-touching piece set at `density`.
2. Give each piece a distinct orthogonal anchor on a non-piece square, and read the counts off the layout.
3. Keep the board when the tier's ladder settles it from blank marks to exactly the pieces and it meets the
   tier's shape (`requires` / `requiresCount` / `firstPieceAfter`). Otherwise draw another layout; the
   nearest miss, ranked by how often the required rungs fired, is the fallback.

The board's whole clue is its anchors and counts, so a failed draw is redrawn, never repaired. No solution
counter runs.

## 5. Difficulty knobs

| tier   | size | density | cap         | requires                | firstPieceAfter |
| ------ | ---- | ------- | ----------- | ----------------------- | --------------- |
| master | 8    | 0.17    | lineBlock   | claimed or lineBlock x2 | none            |
| wizard | 9    | 0.17    | wouldStrand | wouldStrand x3          | none            |

Below master the table points at master's settings: unreachable, but total. No board is above 9×9.

Measured over seeds 1 to 24:

| tier   | pieces | steps    | first piece at step    | time a board |
| ------ | ------ | -------- | ---------------------- | ------------ |
| master | 11     | 18 to 25 | 1 to 7 (mostly 2 to 4) | about 20ms   |
| wizard | 14     | 25 to 34 | 1 to 7 (mostly 2 to 3) | about 40ms   |

**No first-piece gate.** The entry tier never opens with a piece: the first step is an elimination on every
measured board, and 3 of 24 master boards place their first piece at step 1 (the second step), so a gate of 2 would only trim a
few draws. The anti-goal (a deduction before the first placement) holds without one.

**Every rung fires on generated boards.** Across the master and wizard seeds of the verify file, each of the
nine techniques turns on at least one board.

**Long `lineBlock` runs do not appear.** Over 24 seeds each, master fires `lineBlock` 34 times (32 with a
block of one line, 2 with two lines) and wizard 27 times (22 with one, 5 with two); no block of three.

## 6. Controls

Tap cycles empty, `empty`, `piece`; anchors do not respond. A drag sweeps `empty` over open squares
(`sweepPairCells`), one undo step per drag. The eight squares around a piece are drawn spent
(`ruledOutByPieces`).

## 7. Hints

The hint engine reads the ladder: a step names its technique, its `variant`, the squares it argues from
(`cells`) and the squares it decides (`decisions`).

## 8. Theming

Tags `puzzle` and `funerary`, the `default` face, one theme, `default`. The icon is a coffin on stone. No skin
exists yet; the family stays out of the mod's family list until a site is meant to deal it.
