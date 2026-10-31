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
| expert | 7    | 0.36         | lineBlock   | lineBlock x1   | 1              |
| master | 8    | 0.36         | wouldStrand | wouldStrand x2 | 3              |
| wizard | 9    | 0.40         | wouldStrand | wouldStrand x4 | 5              |

Below expert the table points at the expert settings: unreachable, but total, as in `TWIN_STARS_CONFIG`.

**A board needs about a third of its squares walled, at every size.** Even thinned, the measured wall counts
are 7×7 at 13 to 18 (27 to 37 percent), 8×8 at 19 to 27, 9×9 at 26 to 33, so a share that fell with the grid
would refuse every draw. The tiers are separated by size and by what the board demands of the ladder, not by
the wall share; `maxWallShare` only trims the long tail.

Measured over seeds 1 to 8 of the shipped settings:

| tier   | walls    | steps    | first star at step | lineBlock | wouldStrand | time a board |
| ------ | -------- | -------- | ------------------ | --------- | ----------- | ------------ |
| expert | 16 to 17 | 16 to 17 | 1                  | 1         | 0           | about 0.33s  |
| master | 20 to 23 | 21 to 25 | 3 to 4             | 0 to 1    | 2 to 7      | about 0.4s   |
| wizard | 28 to 32 | 24 to 31 | 5 to 8             | 0 to 2    | 4 to 11     | about 3s     |

Expert asks `firstStarAfter: 1`, so no board opens with a star on step 0. Measured at 7×7: 1 settles 8 of 8
seeds, while 2 and 3 settle 0 of 8 within the attempt budget, so 1 is the most this grid gives.

Wizard's long draw is the rejection loop against four `wouldStrand` steps and a late first star.

## 6. Controls

As star battle (§6 there): tap cycles empty, dark, star; a drag sweeps darks. A wall is not a button: a tap on it does
nothing, and a drag passes over it without taking it, so only the open squares either side are ruled out. Checked on the
9×9 board at 360px wide (squares about 35px): a tap 35% off-centre in every open square hits that square, and a
diagonal drag rules out only squares on its path.

The rim is drawn, the inside has no region strokes, so the walls are the only thing that divides the floor.

## 7. Hints

The hint engine reads the board's ladder, so `lineBlock` explains itself with the blocked rows and the columns
that cover them.

## 8. Theming

Tags `puzzle`, `light`, `trade`, `water`, `funerary`. A room's role picks the skin through `REGIONLESS_BATTLE_META.faces`
(`REGIONLESS_SKINS` in `skins.ts`); a room with no role of its own wears the default or, about one in three, a spare face. Walls are raised blocks
(`skin.stone`, lit from the top left) that nothing can stand on, and the no-touching rule has a reason in each place.

| skin (theme) | role | piece | walls | why pieces never touch | title |
| --- | --- | --- | --- | --- | --- |
| lamps (`default`) | `light`, fallback | oil lamp (`OilLamp`) | stone blocks | their pools of light would overlap | Oil Lamps |
| market (`market`) | `trade` | stall (`MarketStall`) | houses | rivals never set up side by side | Market Stalls |
| lotus (`lotus`) | `water` | lotus (`Lotus`) | rocks | each flower needs open water | Lotus Pond |
| cats (`cats`) | `funerary` | sleeping cat (`Cat`) | pillars | each cat keeps its own patch of sun | Temple Cats |

Lamps and cats on dark and sunlit flagstones; market in daylight on dust; lotus on dark water. The solve celebration
is the lamp's and the market's flare, the lotus's bloom, and the cat's flare. Copy is keyed by the skin's `name`
under `starBattle.*`. The icon is an oil lamp on amber. The family is registered in `plugin.tsx` and reachable in
the puzzle lab only; it stays out of the mod's family list until a site is meant to deal it.
