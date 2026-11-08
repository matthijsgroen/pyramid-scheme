# Detectors in camp

Approved sketch: https://claude.ai/artifact/UGrZyakcoW6ThD17R1Y5G9 (4 boards: camp, compass, corridor finder, part found).

## Decisions

- **A detector's level is the number of parts found.** Every compass or detection treasure is one part, in any order. Compass has 3 parts (starter, junior, master B), corridor finder 4 (master A, wizard A/B/C). A part found out of order is never wasted, so nothing depends on which detector comes first.
- **Two detectors, two tap targets, one screen.** The compass and the corridor finder each stand at the camp map table with their own tap target, from their first part. Either one opens the same Detectors screen, with a tab per detector held, on the tab of the one tapped. The map keeps the rest of the table and opens Alle reizen.
- **Where they stand.**
  - The compass is the old table compass picture. It lies by the map on the sand until the table stands, then on the table.
  - The corridor finder is a listening horn on the sand by the table's left front leg. It stands with or without the table, in any chapter.
  - A tap target stands even while its art is owed.
- **The compass is aimed only at the map table.** The hunt bar in Verzameling › Hiërogliefen is gone.
- **The two detectors run in opposite directions.**
  - The compass goes from far to near: L1 the pyramid, L2 the floor, L3 the cell. Camp stops at the floor: a cell means nothing away from the map, and finding one assembles every floor.
  - The corridor finder goes from near to far: L1 nearby, L2 this floor, L3 the other floors, L4 other journeys.
- **The compass offers only signs begun.** These are signs with at least one piece found that are not yet complete. The lock and eye marks show what stands in the way.
- **The corridor finder names journeys only at L4.** It lists the journeys been to where a corridor is still closed, with pyramid and count. At L1–3 the camp tab only says what it does inside a pyramid. The Alle reizen dot stays at L4.
- **No on/off switch in camp.** It stays in the pyramid readout. "Volg dit teken" sets the target and switches the compass on.

## Where it lives

- **Level by count:** `perkStacks` (`src/game/perkTotals.ts`). For the solver, every detection treasure harvests `detector:corridor:1` (`reachabilitySupport.ts`).
- **Camp pieces:** `campCatalogue.ts` (`compassOnMap`, `compass`, `corridorFinder`, with `art` and `hit`). The piece entrances are in `entranceAreas` (`campLayout.ts`).
- **Screen:**
  - core owns the registry and tabs: `src/app/home/detectorScreens.ts`, `DetectorsScreen.tsx`;
  - hieroglyph owns the compass tab: `CompassPanel.tsx`, `CompassSheet`;
  - core owns the corridor tab: `src/mods/core/app/CorridorPanel.tsx`, `CorridorSheet`.
- **Shared hit scanning:** `useCompassHits` and `compassPrecision.ts`. These are the same rules as the pyramid readout.
- **Part count on the claim popup:** `detectorPartProgress` (`treasurePerks.ts`).

## Still owed

- **Listening horn art:** `yarn repaint camp/corridorFinder`, then `yarn camp-layers`. After that, measure `CORRIDOR_FINDER` again in `campCatalogue.ts`.
