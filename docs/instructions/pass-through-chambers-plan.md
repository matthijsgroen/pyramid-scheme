# Pass-through chambers — plan

A corridor widens into a room that serves an activity (a banquet, a bedroom) and runs on out the other side. It
gives a floor more dressed rooms without making any puzzle a room: puzzles stay markers in a 1-wide corridor.

Decided 2026-10-27 with the designer. It comes before the release, so changing the carve is allowed. Starter ships
in this release and stays byte-identical. Builds on [themed-rooms.md](../game-design/themed-rooms.md).

## Why

Measured on the baked world, pyramid floors:

| tier    | floor cells (mean) | dressed rooms (mean) | of which an activity |
| ------- | ------------------ | -------------------- | -------------------- |
| starter | 48                 | 3.4                  | 2.9                  |
| junior  | 69                 | 2.4                  | 1.1                  |
| expert  | 104                | 3.6                  | 2.7                  |
| master  | 133                | 4.0                  | 1.0                  |
| wizard  | 119                | 3.2                  | 1.6                  |

The floors grow, but the rooms do not: the space goes into corridor. A junior floor shows about one activity.

## The room is already there

Nodes sit on even/even cells, two apart (`src/game/carve/grid.ts:10-16`), so every node's 3×3 is free apart from
its own corridor. A chamber claims its free neighbours (`roomClaims.ts`):

- a horizontal straight or a turn claims 6 cells with a free north row, so a 2×1 prop fits;
- a vertical straight claims 6 too, but its corridor runs through the north row, so a 2×1 prop falls back to a
  single-cell one (`decorationFallback`, `render.ts`).

The maze needs no space set aside. What is missing is a room on the path that is not a puzzle.

## Authoring: two levels, as everywhere in the DSL

- **Where, exactly:** `chamberAfter` on a node selector (`NodeSelector`, `src/worldGen/dsl.ts:67`). The chamber
  sits in the gap after that node; `true` leaves the activity to the carve, as at a fork.
  - `.floor(1, { nodes: [{ where: 2, chamberAfter: "banquet" }] })`
  - `sidePath({ puzzles: 3, nodes: [{ where: { every: 2 }, chamberAfter: true }] })`
- **How many:** `chambers: n` on `.pyramid()` or a floor's settings; the carve spreads them over the gaps between
  puzzles.

## The carve

A new pass, `seatChambers`, after `reserveJunctions` (`carve/passes.ts`). For each declared chamber it promotes one
free padding node between content k and k+1 to a bare room carrying `authoredActivity`.

- **Free:** no gate, control, lever, laid lock door, stair or fork; exactly two directions.
- **Order:** turns and horizontals before verticals; no chamber two cells from another chamber or a fork, which
  would contest a diagonal. Ties break by hash, never by `rand()`, so no other draw moves.
- **None free:** the floor refuses with a shortfall, and the bake raises that floor's `packing`.
- **The cell:** a new `RoomType` `"chamber"` (`siteTypes.ts`), not a bare fork: the fork's bland check
  (`siteValidator.ts:290`) and its `exits` must not apply.

## Saves and the world

- Puzzles keep their path index, reward index and family ordinal (`cellSlot.ts`): no puzzle node is added or moved.
- A chamber has no slot: `cellSlot` returns null for it, as for a bare fork. Otherwise two chambers in one section
  collide on the duplicate-slot check.
- No wall moves while a free node exists at the pinned seed and packing. A floor that refuses has its pin searched
  again.
- The lock walk treats rooms and corridors alike (`floorLockWalk.ts`); laid doors are never free nodes.
- `yarn generate-world` rewrites only floors that declare chambers, plus those tiers' `tierFingerprints.json`.
  Starter declares none: its fingerprint and its entries in `generatedWorld.ts` stay the same. `chambers: n` is set
  in the junior-and-up specs, never defaulted in the carve.

## Slices

1. **Domain.** `RoomType "chamber"`, `isChamber`, `cellSlot` null, the validator walking through chambers; specs.
2. **Carve.** `seatChambers`, fed the content gaps by `mainRooms` and `chainRooms`; `render` dresses it (it already
   reads `authoredActivity`). A fixture floor in `carveFixtures.ts`.
3. **App.** Standing in a chamber records it as a junction does (`useSiteNavigation.ts`); its shape (`nodeKinds.ts`);
   the map claim follows `isChamber`. Grep `roomType` across `src/app/SiteMap` for fork-only logic.
4. **DSL.** `chamberAfter` and `chambers`, wired through `buildSite` and `sideSections`, and the serializer.
5. **Junior.** Chambers in the junior specs, re-bake, the junior fingerprint, a row in
   `worldFloorAssembly.verify.ts` that a chamber moves no wall at the pinned layout, and a line in
   `world-spec-stability.md`: a chamber moves walls only where the floor has no free node.

## Free nodes, measured

Free padding nodes per pyramid floor (good: a turn or a horizontal; weak: a vertical), counting only nodes with no
fork, dead end or portal two cells away diagonally. Mean / median / minimum:

| tier    | good         | weak         | floors with no good one |
| ------- | ------------ | ------------ | ----------------------- |
| starter | 2.3 / 2 / 0  | 1.1 / 1 / 0  | 1 of 15                 |
| junior  | 4.2 / 3 / 1  | 1.8 / 1 / 0  | 0 of 20                 |
| expert  | 8.2 / 7 / 1  | 3.0 / 2 / 0  | 0 of 25                 |
| master  | 21.2 / 5 / 1 | 9.7 / 3 / 0  | 0 of 42                 |
| wizard  | 20.9 / 5 / 1 | 10.1 / 2 / 0 | 0 of 66                 |

Junior tombs: 3.7 / 4 / 2. Every junior floor takes at least one chamber with a 2×1 prop, most take three, without a
re-pin. A laid lock door on a corridor node is not seen by this count, so the true number can be a little lower.
