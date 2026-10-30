# Regionless Battle

Family doc. Star battle's rules with the region map swapped for wall cells: one star to every row and column,
no two touching, and some squares are walls that hold no star. Everything shared with star battle (the board,
the three marks, the drag, the hint engine) lives in `star-battle.md`; this doc holds what differs. The screen
bar is `docs/instructions/puzzle-screens.md`.

> **Built and measured, lab-only.** The generator, ladder and tiers exist; the family is not registered in
> `src/mods/puzzle/index.ts`, so no site is dealt it and there is no seed list yet. Every number below comes
> from the shipped generator.

## 1. Rules

- **One star to a row and a column.** One at every tier.
- **No two stars touch**, diagonals included.
- **Walls hold no star.** A wall is drawn, not marked: tapping or sweeping over it changes nothing, and a star
  never shades it.

There are no regions, so the board's only clue is where the walls stand. The board opens with nothing written
but the walls.

**Why there is no two-per-line variant.** 7×7 and smaller admit no placement of two non-touching stars to a
line, and 8×8 admits only two (mirror images). 9×9 is the smallest grid with variety, and at 9×9 to 10×10 the
squares sit at 32 to 37px on a 360 to 375px phone, under the touch minimum on a board whose main gesture is a
drag. See the design spec's non-goals.

## 2. Literature

UKPA "Battle Star" and Logic Masters "Star Battle (Regionless)": the same rules with the groups being rows
and columns alone.

## 3. The deduction ladder

`REGIONLESS_TECHNIQUES`: `touch`, `groupFull`, `groupTight`, `onlyWay`, `everyWay`, `lineBlock`, `wouldStrand`.

Star battle's `regionLine`, `lineRegion` and `spanning` read a region boundary, so they have no input here.
`lineBlock` takes their place and counts rows against columns directly: when k rows (k = 2 or 3) owe their
stars only inside k columns, those columns' other squares are out, and the same with columns against rows. A
block is never mixed rows and columns, for the double-counting reason `spanning` records. Walls count as
spent squares, so a heavily walled line is exactly what lets a block form.

`wouldStrand` is unchanged: assume a star, see a line left unable to hold its star, rule the square out.

The ladder is chosen by the board (`ladderOf`: a board with `walls` takes this one), so grading, the solver and
the hint engine cannot disagree about it.

## 4. Generation

1. Draw a legal star set with star battle's `starSet`, so the answer exists before any wall.
2. Wall random non-answer squares one at a time until the tier's ladder settles the board. A quarter of the
   squares go in before the first solve, since no board settled under that.
3. **Thin the walls**: take each wall away again, in random order, if the ladder still settles without it.
4. Keep the board if its wall count is within `maxWallShare` and it meets the tier's shape (`requires` /
   `requiresCount` / `firstStarAfter`, with star battle's meaning). Otherwise draw another star set; the nearest
   miss, ranked by how often the required rung fired, is the fallback.

**The thinning is what makes the wall count a knob at all.** Walls that arrive at random settle a 7×7 at 22 to
41 of 49 squares; most are redundant, and the thinning leaves about a third. Uniqueness is the forward solve
itself: every step was forced, so no solution counter runs.

## 5. Difficulty knobs

| tier   | size | maxWallShare | cap         | requires       | firstStarAfter |
| ------ | ---- | ------------ | ----------- | -------------- | -------------- |
| expert | 7    | 0.36         | lineBlock   | lineBlock x1   | none           |
| master | 8    | 0.36         | wouldStrand | wouldStrand x2 | 3              |
| wizard | 9    | 0.40         | wouldStrand | wouldStrand x4 | 5              |

Below expert the table points at the expert settings: unreachable, but total, as in `TWIN_STARS_CONFIG`.

**The planned shares (0.30, 0.22, 0.16) were unreachable and are gone.** Even thinned, a board needs about a
third of its squares walled, so a share that falls with the grid refuses every draw. Measured thinned wall
counts: 7×7 at 13 to 18 (27 to 37 percent), 8×8 at 19 to 27, 9×9 at 26 to 33. The tiers are separated by size
and by what the board demands of the ladder, not by a falling wall share. The cap only trims the long tail.

Measured over seeds 1 to 8 of the shipped settings:

| tier   | walls    | steps    | first star at step | lineBlock | wouldStrand | time a board |
| ------ | -------- | -------- | ------------------ | --------- | ----------- | ------------ |
| expert | 14 to 17 | 16 to 17 | 0 to 1             | 1         | 0           | about 0.15s  |
| master | 20 to 23 | 21 to 25 | 3 to 4             | 0 to 1    | 2 to 7      | about 0.4s   |
| wizard | 28 to 32 | 24 to 31 | 5 to 8             | 0 to 2    | 4 to 11     | about 3s     |

Expert's first star lands on step 0 or 1: a 7×7 with `lineBlock` required has no room for an opening, and a
`firstStarAfter` there would be a different tier. Wizard's long draw is the rejection loop against four
`wouldStrand` steps and a late first star.

## 6. Controls

As star battle (§6 there): tap cycles empty, dark, star; a drag sweeps darks. Walls ignore both.

## 7. Hints

The hint engine reads the board's ladder, so `lineBlock` explains itself with the blocked rows and the columns
that cover them.

## 8. Theming

Tags `puzzle`, `funerary`, `cosmos`, each with the `default` face, and one theme, `default`. The icon is a
beetle on amber. Walls need a drawn reading in each face before a site is dealt this board.
