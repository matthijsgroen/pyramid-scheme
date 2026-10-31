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
| master | 8    | 0.17    | lineBlock   | claimed or lineBlock x2 | 1               |
| wizard | 9    | 0.17    | wouldStrand | wouldStrand x3          | none            |

Below master the table points at master's settings: unreachable, but total. No board is above 9×9.

Measured over seeds 1 to 24:

| tier   | pieces | steps    | first piece at step    | time a board |
| ------ | ------ | -------- | ---------------------- | ------------ |
| master | 11     | 18 to 25 | 1 to 7 (mostly 2 to 4) | about 20ms   |
| wizard | 14     | 25 to 34 | 1 to 7 (mostly 2 to 3) | about 40ms   |

**Master gates the first piece at step 1**, so the entry tier never opens with a piece: a deduction comes
before the first placement. Every measured board already meets it, so the gate rejects no seed of the table
above. A gate of 2 would refuse the 3 of 24 master boards that place their first piece at step 1 for little
gain. Wizard carries no gate; its measured boards open with an elimination all the same.

**Every rung fires on generated boards.** Across the master and wizard seeds of the verify file, each of the
nine techniques turns on at least one board.

**Long `lineBlock` runs do not appear.** Over 24 seeds each, master fires `lineBlock` 34 times (32 with a
block of one line, 2 with two lines) and wizard 27 times (22 with one, 5 with two); no block of three.

## 6. Controls

Tap cycles empty, `empty`, `piece`; an anchor is a plain element with no button, so a tap or a drag starting on
it does nothing. A drag sweeps `empty` over open squares (`sweepPairCells`), passing over anchors without
taking them, one undo step per drag. The eight squares around a piece are drawn spent (`ruledOutByPieces`).
The counts sit above the columns and right of the rows and are coloured by `lineStatus`: open, met (green) and
broken (red: a line that holds too many or has too few squares left). Squares that break a rule are ringed
after the same quiet beat star battle waits.

**Hit-testing on 9×9 at 360px.** Checked in the lab at wizard: taps on the first and last squares mark the
square under the finger, and a drag along the bottom row and down the right column marks exactly the squares
crossed, anchors skipped, and one undo takes a whole drag back. The drag reads the cell grid's own box, so the
count gutters do not shift it.

## 7. Hints

The hint engine reads the ladder: a step names its technique, its `variant`, the squares it argues from
(`cells`) and the squares it decides (`decisions`). `buildPairHint` says a wrong mark first, then the cheapest
rung on the board's own ladder (`techniqueCap`), as star battle does. The sentence is the reason, a second line
is the move ("Rule out the hatched squares", "Lay a mummy on each hatched square"), and the decided squares
are hatched. A step never decides an anchor, so the hatch lands on open squares only; the squares a reason
argues from may include anchors and are ringed. `lineFull`, `lineTight` and `lineBlock` read in the singular
and plural by their count; `lineBlock`'s `rowsToCols` and `colsToRows` read as "the marked rows" and "the
marked columns". `noAnchor` and `claimed` decide many squares in one step. Following hints alone solved a
master and a wizard board in the lab.

## 8. Theming

Tags `puzzle`, `funerary` and `cosmos`; faces `funerary: ["default"]` and `cosmos: ["beetles"]`; themes `default` and
`beetles` (the lab picks a skin by theme). The icon is a coffin on stone. Two skins, resolved by `pairSkinFor` through
`faceFor` like every family:

| skin | role | anchor (printed) | piece | solve animation |
| --- | --- | --- | --- | --- |
| `mummies` (default; "Mummy Rest" / "Mummierust") | `funerary` | sarcophagus | mummy | the mummy walks into its sarcophagus, which flares |
| `beetles` ("Dung Beetles" / "Mestkevers") | `cosmos` | dung ball | dung beetle | the beetle walks up to its ball and the ball turns once |

`mummies` is a pyramid burial room in sandstone: sarcophagi drawn as an outlined lidded case, mummies as a wrapped
figure with the bands cut out of the silhouette. `beetles` is dark desert earth: a muted brown ball with pits on a
darker tile, and a pale teal beetle with a split wing-case and three legs a side, so ball and beetle differ in
outline and hue. Glyphs are inline SVG in `app/pairPuzzle/glyphs.tsx`; every colour lives in `skins.ts`, including the
three count colours. The copy lives under `pairPuzzle.*`, keyed by skin name.
The screen is registered in `app/pairPuzzle/plugin.tsx` and reachable in the puzzle lab only: the family stays
out of the mod's family list until a site is meant to deal it.
