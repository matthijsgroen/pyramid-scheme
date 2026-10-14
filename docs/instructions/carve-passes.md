# Carve passes — refactor plan

> **For agentic workers:** use superpowers:subagent-driven-development, one step per task. Line numbers are
> `src/game/siteAssembler.ts` at `8bc24c10`.

**Goal:** the carve engine as a fixed list of small passes over a frozen prep and a fresh per-attempt state,
built next to `siteAssembler.ts` and swapped in once it carves every floor. Target form approved by the designer
2026-10-14.

## Where things stand

`assembleFloor` (4583) expands locks, plans them and calls `assembleExpandedFloor` (748–4579) once, or twice when
route stubs are roomless. That one function holds everything:

- **Phase 1 (757–1536):** config-only refusals, handle and control compiling, mark allocation, chain sizing. About
  90 top-level consts; the attempt loop reads 64 of them by closure.
- **Phase 2 (1538–4469):** the `attempt:` loop. About 171 locals in one body. It carries five ladder `let`s
  (`packing`, `targetDistance`, `chainPacking`, `startingN`, `N`) and 14 shortfall `let`s across attempts, and
  leaves through `continue`/`continue attempt` from about 25 places, some deep inside nested loops.
- **Phase 3 (4470–4541):** sequence tiles, plates, degrade, passages, faces, return.

Modules already split out, to follow as the pattern: `laidFloor.ts`, `siteValidator.ts`, `mark.ts`, `routeStubs.ts`.

## Target form

```ts
prepareFloor(siteId, config, addressSeed, resolvers, plan?, answerStubs?) => { ok: false; reasons } | { ok: true; prep: FloorPrep }

type Pass<R extends keyof CarveState, W extends keyof CarveState> = (
  prep: FloorPrep,
  state: Readonly<Pick<Required<CarveState>, R>> & Pick<CarveState, W>
) => Refusal | void

for each attempt: rung = ladder(prep, attempt, rung); state = fresh(rung); for (pass of PASSES) …;
  grid = render(prep, state); refusal = validate(prep, state, grid); return finish(prep, grid)
```

- `FloorPrep` is frozen, built once per floor, holds no seed-derived value.
- `CarveState` is fresh per attempt. Each key is written by exactly one pass and read-only afterwards.
- A pass decides. `render` writes the grid once.
- A pass fails by returning a `Refusal`, never by `continue attempt`.
- One file per pass under `src/game/carve/`, testable with a hand-built state.
- Scratch stays local to its pass. Lookups that follow from state are functions over state (`derive.ts`).

### Refusal and the loop's memory

```ts
type Refusal = { retry: Shortfall | null } | { fatal: AssemblerFailure["reasons"] }
type Shortfall = // one per today's shortfall let (1496–1534)
  | { type: "forksUnsatisfied"; exits; count; carved } | { type: "forkSeamsNotLaid"; fork: ForkIn }
  | { type: "oneWayUnsatisfied"; from; to } | { type: "regionNotSeated"; regions }
  | { type: "obstacleSeamNotCarved"; ids } | { type: "barriersNotSeated"; between; barriers }
  | { type: "regionBarrierNotSeated"; id; region } | { type: "controlNotSeated"; ids }
  | { type: "controlPuzzleUndisplaceable"; ids } | { type: "sequenceTileNotPlaced"; … } | { type: "plateNotPlaced"; plate }
  | { type: "regionWillNotTake"; mismatch } | { type: "carveDisagreement"; faults } | { type: "lockNotLaid"; … }
  | { type: "contentNotLaid"; kinds }
```

`retry: null` is today's bare `continue` that records nothing (content short, `failed` branches, `chainGateCrowdsEnd`,
switch duplicate-free checks). `carve/shortfalls.ts` keeps the first of each type, except `forksUnsatisfied`, which
keeps the one with the most `carved` (3556). It builds the final reasons in today's order (4544–4578).

### The ladder

The ladder is neither prep nor state: it carries across attempts. `carve/ladder.ts` ports 1414–1480 and 1538–1562:
`Rung = { n, packing, targetDistance, chainPacking, recovery }`. `N` compounds (`N += 2`), and the lay pass grows it
(`N = result.laid.n`, 1583), even on a failed attempt. So `layFloor` writes `lay.n`, and the loop folds it into the
next rung.

## FloorPrep

Built by `prepareFloor` from 757–1480, plus everything the loop computes from config alone (hoisted, marked ⬆).

| Group         | Fields (today's name)                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`       | `siteId`, `floorRef`, `seed` (1419), `plan`, `answerStubs`, `maxAttempts`, `onLaid`, resolvers (`resolveEncounter`, `resolveKeyRequirements`, `resolveBoardIndex`, `resolveOneWay`, `resolveRegionBarrier`, `resolvePassage`)                                             |
| `config`      | `config` (handle gates applied, 1115), `authored` (obstacles, controls, barrierOrder are read off it), `addresses.of`                                                                                                                                                     |
| `layout`      | `regionLayout`, `drops`, ⬆`route`, ⬆`onRouteSet`, ⬆`sideChains`, ⬆`chainRegionsBySectionIdx`, ⬆`dropSeams` (1684–1715), ⬆`layoutCorridors`, ⬆`regionDoors`, ⬆`regionSeamDoors` (3002–3029)                                                                                |
| `realisation` | `oneWaysUnrealised`, `regionBarriersUnrealised`, bound one-way and region-barrier ids (today `boundRealisation()`/`boundRegionBarrier()`), `passageKeys`                                                                                                                  |
| `mechanisms`  | `controlRecords`, ⬆`mainPathControls`/`offRouteControls`, `forkSwitches`, `sequences`, `weights`, `leverByAddress`, `handleGateKeyByAddress`, `leverAtPositional`                                                                                                         |
| `obstacles`   | ⬆`gateObstacles`, ⬆`regionBarriers`, ⬆`oneWayObstacles`, ⬆`runs`/`mainPathRuns`/`offRouteRuns`, ⬆agreement `gateKeys` (4396), ⬆`landsOnItsStretch`, ⬆`oneWayDemands` (as data; their matchers become functions of state)                                                  |
| `marks`       | `allocation`, `markByGateKey`                                                                                                                                                                                                                                             |
| `families`    | `treasureChest`, `fezShop`, `keyGate`                                                                                                                                                                                                                                     |
| `forks`       | `forkDemands`, `forkIns`, ⬆`forkGroups`, ⬆`junctionGroups`                                                                                                                                                                                                                |
| `sections`    | `sideSections`, `gatedFloorKeyIdxs`, `ungatedIdxs`, ⬆sub-sections per parent with their key idxs (2426–2429), `contentSections`, `junctionSections`, `absorbedDemands`, `appetiteOfRegion`, ⬆`branchSections`, ⬆`hubGroupSize`, ⬆`gatedTreasureIdxs`/`gatedStaircaseIdxs` |
| `sizing`      | `mainPathCells`, `minCells`, `lockCells`, `expectedFootprintRooms`, `junctionNodes`, `layPlan`, ⬆`contentCount`, ⬆`leverOnMain`, ⬆`straightBias`, initial `packing`                                                                                                       |
| `hashes`      | ⬆`mainIsolated`, ⬆`mainSectionHash`, ⬆`legacyMainSectionHash`                                                                                                                                                                                                             |

Pure functions of prep, in `carve/ids.ts`: `gateKeyOf`, `switchStem`, `handleStem`, `stairOnThisFloor`, `obstacleMode`,
`gatesOwnedBy`, `leverRooms`, `chainRooms`, `isHandleGate`, `distanceFor`, `deriveN`, `paddedChainLength(rung)`,
`carvedCells(rung)`, `nid`. In `carve/roomSpecs.ts`: `leverSpec`, `controlRoomSpec`, `regionBarrierDoorSpec`,
`puzzleRoomSpec`, `endRoomSpec`, `floorKeysOfGate(chains)`.

`prepareFloor` also takes the sub-section `noUngatedSectionForKey` refusal (2433–2435). It depends on config alone.

## CarveState

Flat keys, so `Pick` types each pass. Optional until its pass runs.

| Key                | Shape                                                                                               | Written by             |
| ------------------ | --------------------------------------------------------------------------------------------------- | ---------------------- |
| `rand`             | `() => number`, one stream (`mulberry32(seed + attempt * 7919)`)                                    | loop                   |
| `attempt`, `rung`  | number, `Rung`                                                                                      | loop                   |
| `lay`              | `{ laid: LaidFloor; mainSteps: number[]; n }`                                                       | `layFloor`             |
| `maze`             | `{ n, entrance, exit, mainPath, passages }`, exit already a dead end                                | `growMaze`             |
| `regions`          | `{ stepRegion, seams: Set<number> }`                                                                | `seatRouteRegions`     |
| `seamGates`        | `Map<obstacleId, step>`                                                                             | `seatSeamGates`        |
| `content`          | `{ placed, goal, lever, puzzleRole }`, before controls move any                                     | `placeMainContent`     |
| `junctions`        | `{ steps: Set<number>, order: number[] }`                                                           | `placeJunctions`       |
| `runGates`         | `Map<obstacleId, step>`, the rest of each run                                                       | `seatGateRuns`         |
| `mainBarrierDoors` | `Map<step, { id, region, entrance }>`                                                               | `seatMainBarrierDoors` |
| `mainControls`     | `{ at: Map<controlId, step>, moves: [from, to][] }`                                                 | `seatMainControls`     |
| `branches`         | `{ used, groups, subChains, seamDrops, carved }`                                                    | `hangBranches`         |
| `keys`             | `{ chains: Chain[], hostColors }`                                                                   | `relayKeys`            |
| `labels`           | per cell: sectionHash, legacy, address, ordinal, hidden, dressing, difficulty, region, absorbedHash | `labelCells`           |
| `chainGates`       | `{ at: Map<obstacleId, { idx, cellIndex }>, runShort? }`                                            | `seatChainGates`       |
| `doors`            | `{ intended, gated, behind, ground, seamGated, seamBehind }`                                        | `isolate`              |
| `mainRooms`        | `Map<cell, RoomSpec>`: absorbed, main path, forks, exit                                             | `mainRooms`            |
| `chainRooms`       | `Map<cell, RoomSpec>`                                                                               | `chainRooms`           |
| `forks`            | `{ reserved: string[], inFork: Set<string>, switchesPlaced }`                                       | `reserveJunctions`     |
| `switchDoors`      | `Map<cell, Set<door>>`                                                                              | `shutSwitchGround`     |
| `drops`            | `OneWayEdge[]`, seam drops first                                                                    | `placeDrops`           |

**Derived, in `carve/derive.ts`** (today's locals that are lookups, not decisions): `routeStepOf` and
`mainPathIndexByKey` (one function), `absorbedCell`, `dropEnds`, `regionDoorAt`, `gateAtCell`,
`gateIndices` (seam ∪ run), `contentNow`/`puzzleRoleNow` (`content` with `mainControls.moves` applied in order),
`controlAtIndex`, `hasPassage`/`neighbors` (maze ∪ `branches.carved`), `bareRouteStep`, `forkPositions` (insertion
order kept: the junction sort at 3550 is stable), `standsBehind` (`doors.behind` ∪ `switchDoors`),
`standsBehindSeam`, `edgeAllowed`, `nodeExitsOf`, `exitKindOf`, `freeWaysOut`, `roomAt` (`chainRooms` over
`mainRooms`, today's write order).

**Scratch, local to its pass:** `edgeCells`; `kept`, `lengthPlan`, `lengthened`; `mainKeys`, `sideRoom`; `inRegion`,
`takenByControl`, `sawContentCandidate`; `rawFreeNeighbors`, `branchCandidates`, `mainZoneCandidates`, `pocketSize`,
`scoreCandidates`, `attachChain`, `attachByDrop`, `sectionOrder`, `hubGroups`, `mainZoneSlices`, `sliceOrder`,
`failed`, `heldForSeams`; `chain`, `keyNodeIdMap`; `laidOrdinal`, `perCell`, `extendedStepRegion`, `taken`;
`chainGateIndices`, `contentStart`, `leverIndexInChain`, `contentIndices`, `takenByChainControl`, `barrierCells`,
`chainControlSeated`, `barrierDoorCells`; `claimedWaysOut`; `reached`; `candidates`, `takenRunCells`.

## Passes, in order

The order is today's order, and it is the order of `rand()` draws. A pass that draws is marked 🎲. Reordering one
moves every floor after it.

| #   | File                       | Reads                                                    | Writes             | From                                                                |
| --- | -------------------------- | -------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| 1   | `layFloor.ts`              | `rung`; prep `layPlan`, `plan`, sizing, sections         | `lay`              | 1566–1627                                                           |
| 2   | `growMaze.ts` 🎲           | `rung`, `lay`, `rand`                                    | `maze`             | 1628–1649, 2088–2103                                                |
| 3   | `seatRouteRegions.ts`      | `maze`, `lay`                                            | `regions`          | 1651–1675, 1797–1806                                                |
| 4   | `seatSeamGates.ts`         | `regions`, `lay`, `maze`                                 | `seamGates`        | 1765–1795                                                           |
| 5   | `placeMainContent.ts`      | `maze`, `regions`, `lay`                                 | `content`          | 1813–1872                                                           |
| 6   | `placeJunctions.ts` 🎲     | `maze`, `regions`, `content`, `lay`                      | `junctions`        | 1874–1910                                                           |
| 7   | `seatGateRuns.ts`          | `regions`, `content`, `junctions`, `seamGates`           | `runGates`         | 1912–1939                                                           |
| 8   | `seatMainBarrierDoors.ts`  | `regions`, `content`, `junctions`, gates, `lay`          | `mainBarrierDoors` | 1941–1970                                                           |
| 9   | `seatMainControls.ts`      | everything above                                         | `mainControls`     | 1972–2077                                                           |
| 10  | `hangBranches.ts` 🎲       | everything above                                         | `branches`         | 2079–2525                                                           |
| 11  | `relayKeys.ts` 🎲          | `branches`, `lay`                                        | `keys`             | 2527–2610                                                           |
| 12  | `labelCells.ts`            | `maze`, `regions`, `keys`, `lay`                         | `labels`           | 2711–2738, 2850–2950 (not 2911–2938), 3082–3103 hashes and dressing |
| 13  | `seatChainGates.ts`        | `keys`, `labels`, `lay`                                  | `chainGates`       | 2869, 2886–2887, 2911–2938                                          |
| 14  | `checkChainsSeated.ts`     | `labels`, `chainGates`, `keys`                           | —                  | 2952–2992                                                           |
| 15  | `isolate.ts`               | `maze`, `keys`, `labels`, `lay`                          | `doors`            | 2741–2828, 2994–3036                                                |
| 16  | `mainRooms.ts`             | `maze`, `content`, controls, gates, doors, `keys`, `lay` | `mainRooms`        | 3038–3192                                                           |
| 17  | `chainRooms.ts`            | `keys`, `labels`, `chainGates`, `lay`                    | `chainRooms`       | 3194–3471                                                           |
| 18  | `reserveJunctions.ts`      | `forkPositions`, `roomAt`, `nodeExitsOf`, `labels`       | `forks`            | 3473–3568                                                           |
| 19  | `shutSwitchGround.ts`      | `forks`, `branches.used`, `nodeExitsOf`                  | `switchDoors`      | 3570–3597                                                           |
| 20  | `placeDrops.ts`            | `branches`, `labels`, `standsBehind`                     | `drops`            | 3599–3718                                                           |
| —   | `render.ts`                | all                                                      | grid               | 3720–4101                                                           |
| —   | `settle.ts` (transitional) | state, grid                                              | grid               | 4103–4518                                                           |
| —   | `finish.ts`                | prep, grid                                               | grid               | 4520–4541                                                           |

Notes the port must keep:

- **`seatChainGates` before `checkChainsSeated`.** A short run is noted (`runShort`) even when the attempt then fails
  on an unseated region (2934 before 2963).
- **`checkChainsSeated` reads the loop's memory today:** `if (barriersShort) continue` (2978) skips recording
  `gateSeamMissing` once any attempt noted a short run. Port it as a rule in `shortfalls.ts`, not a read in the pass.
- **`shutSwitchGround` changes `edgeAllowed`.** `reserveJunctions` sees doors without the switch ground.
  `closeWaysOut`, the drops and `render` see them with it. `standsBehind` over state gives each the view it has
  today.
- **`shutSwitchGround` builds up its own doors as it goes.** Junction n+1's walk sees junction n's doors (3591).
- **`chainRooms` overwrites `mainRooms` on shared cells.** A sub-branch may hang off a laid chain cell that is a
  fork (3181–3182, then 3211–3447), so `roomAt` reads `chainRooms` first.

## Early writes

### State one step writes and a later step changes

The layer split removes each of these. None changes a grid, given the read order above.

| #   | Where     | What                                                              | Becomes                                             |
| --- | --------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| S1  | 2097–2103 | exit trim deletes `passages`                                      | inside `growMaze`; nothing reads `passages` between |
| S2  | 2236      | `attachChain` adds a carved passage                               | `branches.carved`; `hasPassage` is the union        |
| S3  | 2043–2048 | controls displace `placedContent`, move `puzzleRole`              | `mainControls.moves`, applied by `contentNow`       |
| S4  | 1935–1938 | run gates extend `gateIndexByObstacle`/`gateIndices`              | `seamGates` + `runGates`                            |
| S5  | 2297      | `attachByDrop` pushes onto `dropSeamEdges`                        | `branches.seamDrops`                                |
| S6  | 3101      | absorbed rooms overwrite `cellDressing`                           | end of `labelCells`                                 |
| S7  | 3596      | switch walk adds to `doorsToEnter`                                | `switchDoors`                                       |
| S8  | 4148      | `closeWaysOut` sets phase-1 `markByGateKey`, kept across attempts | per-attempt switch marks (open question 3)          |

### Grid writes a later step reads back

These decide where "passes decide, one renderer writes" could change a floor.

| #   | Lines     | Write                                                                                  | Read back by                                              | In the new engine        |
| --- | --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------ |
| G1  | 3877–3901 | drops over the fill; `joinNode` reads node `dirs`                                      | itself, dressing                                          | inside `render`; stays   |
| G2  | 3903–3908 | entrance `reachable`                                                                   | validate                                                  | inside `render`; stays   |
| G3  | 3910–4077 | dressing and patron read `dirs` and `footprintSize` off the grid                       | itself                                                    | inside `render`; stays   |
| G4  | 4138–4209 | `closeWaysOut` shuts every reserved junction, then reopens those past `switchesPlaced` | `validateSite` (closed), G5, G6, G7, agreement (`opened`) | `settle`; **move later** |
| G5  | 4216–4248 | switch family, board, tier on the junction                                             | `duplicateSlot`, G7 (`mechanismId`)                       | `settle`; **move later** |
| G6  | 4253–4327 | fork-switch junction; asserts the door cell's `requiredKeyId` (4289)                   | `duplicateSlot`, G7                                       | `settle`; **move later** |
| G7  | 4333–4358 | marks painted off `mechanism`, `requiredKeyId`, `mechanismId`, `exits`                 | `withGateFaces`                                           | `settle`; **move later** |
| G8  | 4473–4495 | `placeSequences` finds free nodes on the grid and writes tiles                         | G9, `duplicateSlot`, degrade                              | `settle`; **move later** |
| G9  | 4497–4518 | `placeWeights`, same                                                                   | `duplicateSlot`, degrade, faces                           | `settle`; **move later** |
| G10 | 4523–4540 | degrade, passages, faces: grid to grid                                                 | —                                                         | `finish`; stays          |

Checks that read the grid stay checks on the grid: `duplicateSlot` (4123, 4245, 4324, 4493, 4516), `validateSite`
(4201, 4203), appetite (4370–4389), carve agreement (4396–4467).

## Implementation steps

The new engine is built next to the old one. `siteAssembler.ts` stays untouched and in use until step 9. Specs need
not be green while the copy is built.

**The signals.** The comparison harness (step 3) is a report, not a gate. It lists which floors differ and how, so
each difference is reviewed and explained. Identical floors need no review. A floor that differs is fine once its
difference is explained in the step's report.

1. **State types.** Creates `src/game/carve/state.ts`: `FloorPrep`, `CarveState`, `Rung`, `Pass`, `Refusal`,
   `Shortfall`. Ports the shapes above. Check: `yarn check-types`.
2. **prepareFloor.** Creates `carve/prepareFloor.ts`, `carve/ids.ts`, `carve/roomSpecs.ts`. Ports 757–1480, the
   hoisted values (⬆), and 2426–2435. Check: `carve/prepareFloor.spec.ts` with made-up configs, one test per
   refusal; harness step 3 reports every floor's prep refusal against the old engine's.
3. **Comparison harness.** Creates `src/game/carve/compareEngines.verify.ts`. For every floor of `allFloors()` at its
   pinned seed (the baked `seed`/`packing`), it carves with the old and the new `assembleFloor` and prints, per
   floor, `identical` or what differs: grid size and route (entrance, exit, main path cells), rooms (cell →
   roomType, family, pathIndex), gates (cell → requiredKeyId), marks, `dirs`, the attempt that carved, and refusal
   reasons. A one-line summary at the end counts identical and differing floors. Until render lands it compares
   refusals only. Check: it runs (`yarn verify-content carve/compareEngines`); it never fails on a difference.
4. **Loop.** Creates `carve/ladder.ts` (1414–1480, 1538–1564), `carve/shortfalls.ts` (1494–1534, 4544–4578),
   `carve/passes.ts` (the `PASSES` list, empty to start), `carve/carveFloor.ts` (the loop), `carve/assembleFloor.ts`
   (4583–4601, calling the new loop). Check: `carve/ladder.spec.ts` (rung per attempt: widen at 8/16/24, grow at
   4/12/20, recovery from 30); `carve/shortfalls.spec.ts` (first of each kind, most-carved fork shortfall, reason
   order, the `barriersShort` rule).
5. **Passes 1–11** (layFloor to relayKeys), one file and one commit each, appended to `PASSES` in order, line
   ranges as in the pass table. Each pass file gets a spec with a hand-built state for the rule it carries. Check:
   `yarn check-types`; its own spec.
6. **Passes 12–20** (labelCells to placeDrops), the same way.
7. **render.** Creates `carve/render.ts` (3720–4101, `connectorBetween` included). From here the harness compares
   whole grids. Check: harness report; differences explained or fixed.
8. **settle and finish.** Creates `carve/settle.ts` (4103–4518: G4–G9 and the grid checks, in today's order) and
   `carve/finish.ts` (4520–4541). Check: harness report. Expect all floors identical; explain any that are not.
9. **Swap.** `assembleFloor` in `siteAssembler.ts` calls `carve/assembleFloor`. Every caller keeps its import.
   Gate:
   - every spec green against the new engine: `siteAssembler.spec.ts` and the ~90 specs and verifies that carve
     through `assembleFloor`;
   - `yarn verify`, `yarn verify-content` and `yarn build` pass;
   - every floor carves (the bake's own refusal list is empty, as now);
   - every placed lock still lays: `yarn lock` is green and `docs/game-design/lock-placement.md` stays at "Placed:
     34 of 34";
   - then `yarn generate-world` (check for an uncommitted playtest bake first) and commit the new
     `src/data/generatedWorld.ts` and `src/data/carveLedger.json`.

   Then delete `assembleExpandedFloor` and the helpers it alone used (`buildMaze`, `growMazeAround`,
   `extendPath`, `spreadContentIndices`, `withHandleGates`, the chain types). `siteAssembler.ts` keeps its public
   exports (`assembleFloor`, the resolver types, `encounterFromMeta`, `PACKING_CEILING`).

   **Reading the ledger.** Every ledger `hash` moves at the swap: it hashes the carve's source files
   (`sourceFingerprint` of `siteAssembler.ts`'s transitive imports, `scripts/generateWorld.ts:111`), and the new
   engine's files join that set. If every hash moved, keys are unchanged and every `refusal` string is the same,
   only sources moved. A changed `refusal` or a missing key is a floor that carves differently; read it in the
   harness report. The moved hashes make the bake search every ledgered floor again, so budget the time.

10. **Spec split.** Cut `siteAssembler.spec.ts` into per-pass specs beside the pass files. Rewrite a test against
    its pass with a hand-built state where it states one pass's rule. Keep it end-to-end where it is about a whole
    floor.

    | Target spec                      | Describe blocks and tests (line in today's spec)                                                                                                                                                                                        |
    | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `carve/assembleFloor.spec.ts`    | 87 basic, 92 attempt, 98/107 told seed, 116 maxAttempts, 121 validates, 300 deterministic, 438 first pyramid, 915–956 properties, 967 keeps layout, 1272 engine's sort, 1344 widens, 1390 short walk, 2856 doubleBack (with 2870, 2969) |
    | `carve/prepareFloor.spec.ts`     | 734 auto-injects a host, 1862 switches exceed forks, 1892 not re-enterable, 2541 gate no control opens, 2580 mouth gate collides                                                                                                        |
    | `carve/growMaze.spec.ts`         | 291 entrance on edge, 306 and 365 packing scales the walk, 338 exit is a dead end                                                                                                                                                       |
    | `carve/placeMainContent.spec.ts` | 790 pathPuzzles rooms, 847 rewards in order                                                                                                                                                                                             |
    | `carve/hangBranches.spec.ts`     | 393 chain length, 869 interleaves forks, `multi-cell footprints` (1024)                                                                                                                                                                 |
    | `carve/relayKeys.spec.ts`        | 447 key before gate, 521 endReward survives, `an authored floor-key id` (1420), `a floor-key gate with no authored keyId` (1481)                                                                                                        |
    | `carve/isolate.spec.ts`          | 453, 565, 623, 682 no back door                                                                                                                                                                                                         |
    | `carve/labelCells.spec.ts`       | `section hashes across re-authored encounters` (1204), `hidden sections` (1122)                                                                                                                                                         |
    | `carve/mainRooms.spec.ts`        | 134, 148, 160 skin and tier, 180 main key requirement, 231 goal grants nothing, 808 stairhead, 266 stairId                                                                                                                              |
    | `carve/chainRooms.spec.ts`       | 201 side key requirement, 241 shop stock, 284 no stock, 751, 772 side families, 826 tomb-key, 988 sub-section puzzles, `trap rooms` (1086), `a control seated in an off-route region` (2124)                                            |
    | `carve/seatChainGates.spec.ts`   | `a side path seating a chain of regions` (1938), `a gate on a connection off the threaded route` (2361)                                                                                                                                 |
    | `carve/reserveJunctions.spec.ts` | `a switch fork` (1540), 1816 no junction left                                                                                                                                                                                           |
    | `carve/placeDrops.spec.ts`       | `a one-way drop between two regions` (2675)                                                                                                                                                                                             |
    | `carve/render.spec.ts`           | `fork exits` (1493)                                                                                                                                                                                                                     |
    | `encounterFromMeta.spec.ts`      | `encounterFromMeta` (2831)                                                                                                                                                                                                              |

    Check: the test count does not drop; `yarn verify` green.

11. **One renderer** (later, one step per write). Move G4–G9 out of `settle` into decisions in passes plus writes in
    `render`, in this order: G7 marks (render's last write), G5 switch families, G6 fork-switch, G4 switch doors
    (validation then needs the grid twice: switch doors open and all shut), G8 tiles, G9 plates. Each may move
    floors: the `duplicateSlot` and `validateSite` order changes. Gate per step: the step-9 gate, the harness report
    explained, re-bake, commit. Delete `settle.ts` with the last one.

## Open questions

1. **The ladder lives in the loop**, outside `FloorPrep` and `CarveState`, because `N` carries across attempts and
   the lay grows it. Agreed?
2. **Shortfall quirks:** `barriersShort` suppresses a later `gateSeamMissing` (2978); a fork shortfall keeps the
   most carved (3556). Port them as they are, or simplify to "first of each kind" (changes only failure reasons,
   and with them ledger `refusal` text)?
3. **Switch marks outlive a failed attempt** (S8): `closeWaysOut` writes into the phase-1 `markByGateKey`. Make them
   per attempt? No floor is expected to move; the harness will say.
