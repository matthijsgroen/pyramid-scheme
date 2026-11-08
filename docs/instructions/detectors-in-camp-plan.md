# Detectors in camp — plan

Approved sketch: https://claude.ai/artifact/UGrZyakcoW6ThD17R1Y5G9 (4 boards: camp, compass, corridor finder, part found).

## Decisions

- **Two detectors, two items on the camp map table.** Compass and corridor finder each open their own sheet. The map itself stays the way into Alle reizen.
- **A detector's level is the number of parts found.** Every compass or detection treasure is one part, in any order. Compass has 3 parts (starter, junior, master B), corridor finder 4 (master A, wizard A/B/C). Out-of-order finds are never wasted.
- **The compass is aimed only from the camp sheet.** The HuntBar in Verzameling › Hiërogliefen goes away.
- **The two detectors run in opposite directions.** The compass goes from far to near: L1 shows the pyramid, L2 the floor too, L3 the cell ("op de kaart" in camp). The corridor finder goes from near to far: L1 nearby, L2 this floor, L3 another floor, L4 other journeys. The lock and eye marks stay on the compass.
- **Corridor finder in camp.** Other journeys are the farthest scope, so they appear only at L4: which journeys (visited only), the pyramid, and the count. At L1–3 the camp sheet only says what the finder does inside a pyramid. The Alle reizen dot stays at L4.
- **No arm button in camp.** The on/off switch stays in the pyramid readout; the camp sheet's bottom button just closes it.

## Changes

1. **Level by count.**
   - `src/game/perkTotals.ts`: compass and detection read `perkStacks`. `perkLevel` loses its last callers and goes.
   - Callers: `src/mods/core/app/index.ts` and `src/mods/hieroglyph/app/useHieroglyphProgress.ts`.
   - `treasurePerks.ts`: `compass` and `detection` drop `level`.
   - No save migration, because perks are derived on every read.
2. **Solver.** In `reachabilitySupport.ts`, every detection treasure harvests `detector:corridor:1`. That is the only fact a hidden section needs. `detectorFactsFor` loses its level loop.
   - Expected bake result: `generatedWorld.ts` stays byte-identical. Verify with a baseline diff.
3. **Camp items.**
   - `CampScene` entrances get `compass` and `corridorFinder` next to `mapTable`. Each one shows only once its first part is held.
   - Art: two props on the table via `yarn repaint` (designer). Until then, the entrance button draws a plain glyph.
4. **Compass sheet** (new organism):
   - Grid of incomplete hieroglyphs.
   - Hit list per journey, at the precision of the current level.
   - "Volg dit teken" sets the existing `compassTarget`.
   - Delete the HuntBar and `HieroglyphCollectionSection.huntbar.spec.tsx`.
5. **Corridor finder sheet** (new organism): at L1–3 its in-pyramid scope; at L4 the journey rows. `AllJourneysPage.tsx` keeps its `>= 4` dot.
6. **Part-found copy.** The treasure claim names "Kompasonderdeel · n van 3" / "Gangenzoekeronderdeel · n van 4" (nl and en).

## What the tests freeze

- Detection held only from `wizard_c` reads as level 1; any two compass treasures read as level 2.
- Every detection treasure harvests exactly `detector:corridor:1`.
- Compass sheet (made-up glyphs and journeys): incomplete glyphs only; the precision text per level; picking a glyph and following it sets the target.
- Corridor finder sheet: L1–3 name no journey; L4 shows journey, pyramid and count; unvisited journeys never show.
- Camp: no detector entrance before its first part.

## Slices

1. Steps 1 + 2 + 6: count model. No UI moves; bake diff empty.
2. Steps 3 + 4: compass in camp, HuntBar out.
3. Step 5: corridor finder in camp.
