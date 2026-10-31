# Rooms Join Their Own Doors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A designed room is one stop on the floor graph, joining any number of doors through its own floor, so the
3x3-inside caveBasin (basin in the centre, a door in the middle of each wall) stands on the starter cave's 5-way hall.

**Architecture:**
- **Ports instead of rays.** A room's shape (`shapesOf`, reserveRooms.ts) offers *ports*: a door place on a lattice line, with its port node and the first node past the ring. Rays straight or bent through the room's lattice are gone.
- **Joins instead of passages.** The lay and the non-lock reservation join each used port to the room's node with a *room join*, not a lattice passage. The node-level graph (laidFloor `neighboursOf`, reserveRooms walks, hangBranches) treats a join as an edge.
- **Room floor drawn open.** At draw time the room's rect, and the doors in use, become open floor joined cell to cell. So every cell-level reader (gridNavigation, the lock walk, labels) sees one connected room.
- **The map never stops on room floor.** The map offers no stop on room floor, and `roomPath` walks the explorer around what stands there.
- **Porches.** A region with more ways than the room has doors gets a *porch*, a region node two steps past one door, where the extra ways branch off.

**Tech Stack:** TypeScript, Vitest, Storybook + Playwright (screenshot only).

**Spec:** `docs/superpowers/specs/2026-10-31-rooms-join-their-doors-design.md` (rulings 1–7).

**Reference (not the base):** the spike branch `worktree-agent-afa585224bc3015e0`, in worktree `/Users/matthijsgroen/projects/personal/pyramid-scheme/.claude/worktrees/agent-afa585224bc3015e0`.
- `a872160a`: door list on `PrefabRoom`, bent rays.
- `b0e68764`: room floor is no stop.
- `7cd67b3c`: porch, `routeStubs`, 5x5 caveBasin.
- The spike's bent-ray and "rays cross anything" code is superseded by ports + joins. Do not copy it. Its app-side changes (b0e68764) and the porch (7cd67b3c, `layLocks.ts` `blockStep`) match the rulings and may be ported.
- Report: `many-ways-spike-report.md`, in the session scratchpad.

**Base:** `camp/home-and-loot` at `5d2c15e4`. Every task ends with `yarn verify` green.

## Global Constraints

- Never weaken a check. A test pinning a retired rule is replaced, in the same commit, by a test of the new rule that fails on the old code.
- Tests use made-up rooms (`parsePrefab` inline), never `src/game/rooms/**` contents.
- Every bake is `timeout 900 yarn generate-world`. Never hand-edit baked numbers.
- Before release, a task that changes the carve re-bakes in the same commit. If a digest test (`src/data/tierFingerprints.spec.ts`, `src/app/SiteMap/starterCarve.verify.ts`) moves, regenerate it with the repo's script (`yarn carve-digests`). Never edit digests by hand.
- Comments state the current state and why. Never "used to", never "replaces X".
- Commit messages are one line, in the form `type: what`.
- Hub carve success stays at its bar: `HUB_FORK_SEEDS = 36` in `src/game/carve/reserveRooms.spec.ts`.
- `routeStubs` rule (approved): a room's own cells and its door places count as that room.
- A region's control (lever) stands on the room's node, which is drawn at its mechanism place or stop. It never stands on a corridor node beside the room.

## Review Focus

1. **A pinned room** (`prefabsByIndex`, e.g. fezStall, ipiLedger; `placePrefabs`/`fitAt`) still lays over a carved node with straight absorbed arms. Its absorbed arm cells must become room floor without breaking the pinned-room path. Test in Task 1.
2. **A room on a non-lock floor used as a hub.** Side paths hang from its free ports. A port used by the main path must never be offered to a side path. Test in Task 2.
3. **A room with a door place whose port node is on the ring** (the ring row/column is a lattice line) versus one whose port node is just inside. Both must open and walk. Test in Task 2.
4. **A floor re-carved with a mod off** (`src/game/testSupport/modOff.ts`): the room carves the same. Covered by the existing mod-off sweeps; Task 2 must keep them green.
5. **Explorer standing on a room door, then tapping another door of the same room:** he walks through the room around the prop and never stops on room floor. Test in Task 1.

---

### Task 1: The map treats a room as one stop

**Files:**
- Modify: `src/game/siteTypes.ts`. `PrefabRoom.doors` becomes `readonly Cell[]`: the ring door places in use.
- Modify: `src/game/carve/placePrefabs.ts`.
  - `Fit.doors: Cell[]`.
  - `fitAt` pushes door cells into the list.
  - `doorsAt(grid, variant, rect): Cell[]` becomes every `d` of the variant on the ring whose grid cell is not `empty`.
  - `furnish` reads the list.
- Modify: `src/game/carve/reserveRooms.ts`. `croppedToBox` maps `room.doors.map(at)`.
- Modify: `src/game/roomShape.ts`. Add:
  - `sideOf(rect, cell): Direction`
  - `type RoomDoor = { at: Cell; side: Direction; inside: Cell }`
  - `roomDoors(grid, r, c): RoomDoor[]`
  - `roomPlaceOf(grid, r, c): "inner" | "node" | "door" | undefined`, cached per grid like `prefabRoomCells`.
- Modify: `src/app/SiteMap/roomWalk.ts`.
  - `RoomEnd = { door: Direction } | { doorAt: Cell } | "stop"`.
  - `endFor` returns `{ doorAt }` for the used door nearest the outside cell.
  - `armCells` counts only doors in line with the node.
  - `freeCells` never frees a cell under an object whose layer is not `ground`.
  - `markerCell` reads the new `armOf`.
- Modify: `src/app/SiteMap/clickTargets.ts`.
  - `clickTargetAt` returns `null` for `"inner"`, `freeWalk` included.
  - `corridorOffer(…, roomStop)`: a `"door"` or `"node"` cell is a stopping point whatever its shape.
- Modify: `src/app/SiteMap/corridorRuns.ts`. In `findCorridorRunTarget`, an `"inner"` cell ends no run (`null`) and a `"door"` cell ends one.
- Modify: `src/app/SiteMap/prefabPreviewFloor.ts`. It builds its own direction-keyed `doors` with `sideOf`.
- Test: `src/game/roomShape.spec.ts`, `src/app/SiteMap/roomWalk.spec.ts`, `src/app/SiteMap/clickTargets.spec.ts` (or the existing spec next to it), `src/app/SiteMap/SiteMapView.spec.tsx`, `src/app/SiteMap/movementInvariant.spec.ts`. Also update for the door list: `placePrefabs.spec.ts`, `reserveRooms.spec.ts`, `lockRooms.spec.ts`, `prefabPreviewFloor.spec.ts`, `roomClaims.footprint.spec.ts`, `tileRegions.spec.ts`, `lessonOrder.spec.ts`.

**Interfaces:**
- Produces: `roomPlaceOf`, `roomDoors`, `sideOf`, `RoomDoor`, `PrefabRoom.doors: readonly Cell[]`. Tasks 2–3 read `roomPlaceOf`, and Task 2 relies on `doorsAt` reading doors off the drawn ring.

- [ ] **Step 1: Write the failing tests**
  - `roomShape.spec.ts` "names a room's floor, node and doors in use":
    - `roomPlaceOf(floor, 2, 4)` is `"node"`
    - a rect cell is `"inner"`
    - `[0, 4]` is `"door"`
    - an unused ring `d` is `undefined`
    - `roomDoors(floor, 2, 4).map(d => d.inside)` is `[[1, 4], [2, 5], [2, 2]]`
  - `clickTargets` "a room's floor offers no stop, its doors and node do", on a made-up room over a fork:
    - every `"inner"` cell → `clickTargetAt(...) === null`, also with `freeWalk: true`
    - each used door (a straight corridor cell) → itself
  - `SiteMapView.spec.tsx`: replace "draws the run arrow of an absorbed arm at the room's door" with "an absorbed arm offers nothing; the room's door it leads to is a stop". The arm cell has no marker and no tap. The door cell draws a dot. This retires the old arrow rule.
  - `roomWalk.spec.ts` "a walk between two doors of a room goes round what stands in its middle": a made-up 3x3 room with a `floor` object in its centre.
    - `walkPoints` from the W door to the E door stays inside the rect.
    - No point lies within the centre cell's box.
  - `movementInvariant.spec.ts`, fixture "a fork laid over by a prefab room":
    - Add the assertion that the walk reaches every used door of the room.
    - Re-measure the step count and set `minSteps` just under it, per the comment at line 505, updating the comment's measured list. The door assertion keeps the guard's purpose; the bar is a measurement, not a weakening.
- [ ] **Step 2: Run them, expect FAIL.**
  - Command: `yarn test --run src/game/roomShape.spec.ts src/app/SiteMap`
  - Expected: `roomPlaceOf` is not exported, and the arm cell still offers.
- [ ] **Step 3: Implement the changes in the files listed above.** Port the app side from spike `b0e68764`, and the doors-list part of `a872160a` (placePrefabs, roomShape, siteTypes, prefabPreviewFloor). Do not port its `shapesOf`/`layLocks` ray changes.
- [ ] **Step 4: Run `yarn verify`.** Expected: green. The carve is unchanged, so no bake.
- [ ] **Step 5: Commit** `feat: a room is one stop on the map, its floor takes no tap`

---

### Task 2: The floor graph knows a room as one node joining its doors

**Files:**
- Modify: `src/game/carve/reserveRooms.ts`.
  - `Shape` loses `rays` and gains:
    - `ports: Port[]`, with `type Port = { node: Cell; door: Cell; out: Cell }` as offsets from the inside's top-left.
    - `bare: boolean`: the anchor stands on `.`.
  - `shapesOf`: see the algorithm below.
  - `ReservedBlock.rays: Cell[][]` becomes `ReservedBlock.ports: { node: Cell; door: Cell; out: Cell }[]` in absolute cells.
  - `ReservedWalk` gains `joins: ReadonlyArray<[Cell, Cell]>`.
  - `reserveRooms`' walks: in by a port's `out → node`, join `node → anchor`, join `anchor → node'`, out by `node' → out'`. Joined hops go to `walks.joins`, never to `walks.passages`.
  - `roomTakesRegion` reads `ports.length`.
  - The hub score `HUB_WAY_WEIGHT * (4 - rays)` becomes `HUB_WAY_WEIGHT * (4 - Math.min(4, ports))`, so more door places than four never outrank a fitting walk.
  - New `openRoomFloor(grid: FloorGrid, block: ReservedBlock): FloorGrid`. Every rect cell, and every used door cell, becomes floor joined to its 4 neighbours within the rect and to its door. The node's own cell keeps its type and contents and gains the dirs. Every other cell becomes a corridor cell carrying the node's `region` and `sectionAddress`.
  - `stampBlocks` calls `openRoomFloor` before `stampPrefab`.
  - `ringFault` keeps every check. Room floor cells are the room's own, so they are skipped like the anchor.
- Modify: `src/game/layLocks.ts`.
  - `RoomShape` mirrors `Shape` (`anchor`, `ports`).
  - `LaidBlock` gains `joined: CellKey[]`: the port nodes joined to `anchor`.
  - `LaidLocks` gains `joins: string[]` (`pkey`-style `"a|b"` of anchor and port node).
  - `blockStep`:
    - claims the anchor and the used port nodes for the region and holds the rest;
    - `link`s only port node → out;
    - records `rayEnd` at the port node;
    - the walk is `[portIn, anchor, portOut]`.
  - `snapshot()` emits `joins`.
- Modify: `src/game/laidFloor.ts`.
  - `neighboursOf(passages, n)` also takes `joins` and adds both directions. All three call sites pass `laid.joins`.
  - `bare` keeps excluding block nodes except `anchor` from seats.
  - The control seat of a block region (`seatItems` / `seatLaidFloor`; find where a `seat.for === "control"` lands) is pinned to the block's `anchor` (ruling 6).
- Modify: `src/game/carve/hangBranches.ts`.
  - `freeRays` becomes `freePorts`: a port whose node and out are free.
  - `attachAtHub` carves only `node → out` and records the join.
- Modify: `src/game/carve/derive.ts`. `forkPositions` excludes a block's nodes other than its anchor; a room's ports are no forks.
- Modify: `src/game/routeStubs.ts`. A cell with `roomPlaceOf(...) !== undefined` counts as roomed (ruling 5, approved).
- Grep and adapt every other reader of `.rays` and `walks.passages`/`mainPath` adjacency: `rg "\.rays\b|mainPath|walks\.passages" src/game/carve`. A consecutive pair in `mainPath` may now be a join; a reader that builds a `pkey` from consecutive cells skips pairs listed in `walks.joins`.
- Test: `src/game/carve/reserveRooms.spec.ts`, `src/game/carve/lockRooms.spec.ts`, `src/game/layLocks.spec.ts`, `src/game/laidFloor.spec.ts`, `src/game/routeStubs.spec.ts` (create it if absent).

**`shapesOf` algorithm** (the signature does not determine it):

```
for each variant, each parity (pt, pl):
  ports = every ring cell 'd' at inside offset (i, j) on a lattice line for this parity
          (N/S wall: (pl + j) even; W/E wall: (pt + i) even);
          node = the door cell itself when the ring line is a node line, else the inside cell next to it
          (it must be a node of this parity); out = the first node past the ring
  if ports is empty: skip
  anchors = inside nodes of this parity on '.', or, when there are none, every inside node of this parity
  for each anchor: one Shape { anchor, bare: cell is '.', ports, ... }
sort by ports.length descending (stable)
```

**Interfaces:**
- Consumes: Task 1 `roomPlaceOf`, and `doorsAt` reading doors off the drawn ring.
- Produces:
  - `Shape.ports`, `ReservedBlock.ports`, `ReservedWalk.joins`, `LaidBlock.joined`, `LaidLocks.joins`, `openRoomFloor`.
  - `blockStep` lays a region on a room when `ports.length >= ways`. Task 3 extends this to porches.

- [ ] **Step 1: Write the failing tests**
  - `reserveRooms.spec.ts` "a 3x3 room with a door in the middle of each wall and a prop on its centre offers four ports at one parity". Made-up `CROSSING` room:

    ```
    # # d # #
    # . . . #
    d . b s d
    # . . . #
    # # d # #
    ```

    with `b floor basin` and `s stop`. Assertions:
    - `shapesOf(CROSSING).some(s => s.ports.length === 4 && s.pt === 1 && s.pl === 1)`
    - that shape's anchor is `[1, 1]` with `bare === false`
  - Retire "a room whose door places meet no one free way is never reserved, and a pinned one refuses naming it". Replace it with "a room whose two door places sit on neighbouring columns never offers two ports, and a pinned one refuses naming it":
    - a made-up room with `d` at N wall inside columns 0 and 1 only;
    - `shapesOf(room).every(s => s.ports.length < 2)`;
    - the pinned floor's `assembleFloor` reasons include `{ type: "prefabsNotPlaced", room }`.
  - `lockRooms.spec.ts` "a room joins its doors through its own floor: no lattice passage runs inside it", on `FOUR_WAY_HUB` with `CROSSING` and `SEEDS`:
    - every cell inside `room.rect` has `roomPlaceOf` of `"inner"` or `"node"`;
    - `walkFloorLock(grid)` equals `{ sound: true, states: expect.any(Number) }`;
    - `room.doors` has length 4.
  - `lockRooms.spec.ts`: keep "the region's lever stands on the room's mechanism place" unchanged. Add seed 29 to its loop, the seed the spike broke.
  - `routeStubs.spec.ts` "a room's own floor and doors count as its room": a made-up grid where a `lock:` section's only cells are a room's door cells → `roomlessRouteStubs(grid)` is `[]`. The same grid with the prefab removed → `["lock:x.hall"]`.
  - `reserveRooms.spec.ts` (Review Focus 2) "a hub room never offers the port the main path took to a side path": `ReservedBlock.ports` used by `walks.mainPath` are never the `via`/`attachedAt` of a spine.
  - `reserveRooms.spec.ts` (Review Focus 3) "a room opens and walks whether its port nodes sit on the ring or just inside":
    - one made-up room laid at both parities;
    - `walkableFrom(grid, entrance)` holds every used door.
- [ ] **Step 2: Run, expect FAIL.**
  - Command: `yarn test --run src/game/carve src/game/routeStubs.spec.ts src/game/laidFloor.spec.ts`
  - Expected: `ports` is undefined.
- [ ] **Step 3: Implement the changes in the files listed above.**
- [ ] **Step 4: Run the carve specs, including the hub bar.**
  - Command: `yarn test --run src/game/carve/reserveRooms.spec.ts -t "hub room leaves the floor its forks"`
  - Expected: PASS, with the bar still 36.
  - If it fails, tune the hub score (prefer the shape whose ports cover the hub's ways with the fewest ports). Do not change `HUB_FORK_SEEDS`.
- [ ] **Step 5: Re-bake and digest.**
  - Command: `timeout 900 yarn generate-world`. Expected: `✓ Written: src/data/generatedWorld.ts`, and no `✗` line.
  - Then `yarn carve-digests` if a digest test fails.
- [ ] **Step 6: Run `yarn verify`.** Expected: green.
- [ ] **Step 7: Commit** `feat: a room joins its doors through its own floor, no lattice inside it`

---

### Task 3: A region with more ways than doors branches off a porch

**Files:**
- Modify: `src/game/layLocks.ts` `blockStep`. Add `const PORCH_WAYS = 2`. When a shape has `k = min(ways, ports) >= min(ways, 2)` and `ways - k <= PORCH_WAYS`:
  - pick `k` ports;
  - choose a porch on the port of the way in or the way out only;
  - the porch's `out` and the node one step further along its direction (`at`) must both be free;
  - claim both for the region and link `node → out → at`;
  - take `out`'s other sides;
  - set `rayEnd` for that way to `at`;
  - extend the walk through `out`, `at` (prepend for the way in, append for the way out).

  The extra ways attach to the region's nodes with free sides, which is only the porch.
- Modify: `src/game/carve/reserveRooms.ts`. `roomTakesRegion` accepts `ports + PORCH_WAYS >= ways && ports >= min(ways, 2)`. Export `PORCH_WAYS` from layLocks, or define it once in a shared module.
- Port reference: spike `7cd67b3c`, `layLocks.ts` porch block.
- Test: `src/game/carve/lockRooms.spec.ts`.

**Interfaces:**
- Consumes: Task 2 `blockStep` with ports and joins, and `roomTakesRegion`.
- Produces: `PORCH_WAYS = 2`.

- [ ] **Step 1: Write the failing test.** `lockRooms.spec.ts` "a five-way region takes a four-door room, the fifth way branching off a porch past one door". Lock `in -- hub\nhub -- out\nhub -- a\nhub -- b\nhub -[A]- c\nA toggle @a`, with `CROSSING` from Task 2, for each of `SEEDS`:
  - the room's cell `region` is `"made.hub"`;
  - `room.doors` has length 4;
  - some `made.hub` node lies outside `ringed(room.rect)` and its 3x3 does not meet the ring;
  - `walkFloorLock(grid).sound` is `true`;
  - `roomlessRouteStubs(grid)` is `[]`.
- [ ] **Step 2: Run, expect FAIL.**
  - Command: `yarn test --run src/game/carve/lockRooms.spec.ts`
  - Expected: `prefabsNotPlaced` for `CROSSING`.
- [ ] **Step 3: Implement the porch and the `roomTakesRegion` rule.**
- [ ] **Step 4: Re-bake and digest** as in Task 2 Step 5.
- [ ] **Step 5: Run `yarn verify`.** Expected: green.
- [ ] **Step 6: Commit** `feat: a room takes a region with more ways than doors, the rest off a porch`

---

### Task 4: caveBasin stands on the starter cave's hall

**Files:**
- Create: `src/game/rooms/starter/caveBasin.room`, verbatim from spike `7cd67b3c`: 5x5, basin centre, `s` east of it, a mid-wall door per side, `mirror`, `// designed by: Claude`.
- Modify: `src/worldGen/spec/starter.ts`. On `journey("starter_treasure_tomb").pyramid("first", …)` add `rooms: [{ room: "caveBasin", min: 1, max: 1, central: 1 }]`.
- Bake: `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, and digests if moved.

- [ ] **Step 1: Check the room.**
  - Command: `yarn room caveBasin`
  - Expected: `every variant walks in every fill`, and both layouts printed.
- [ ] **Step 2: Bake.**
  - Command: `timeout 900 yarn generate-world`
  - Expected: no `✗` line, and the bake summary shows starter `Prefab rooms` including caveBasin.
  - Confirm with `yarn tsx scripts/dumpFloorLock.ts starter_treasure_tomb 1 0`, or by reading the carved grid: the `prefabRoom.name === "caveBasin"` cell has `region === "caveLevers.hall"` and 4 doors.
- [ ] **Step 3: Run `yarn verify`.** Expected: green.
- [ ] **Step 4: Screenshots.**
  - Run `yarn storybook -p 6010 --no-open`.
  - Open `http://localhost:6010/iframe.html?id=app-sitemap-journeyinspector--tomb-inspector&viewMode=story` at 1400x1000.
  - Save the whole floor as `rooms-join-doors-cave.png`: exactly one dot per used door and none on the room's floor.
  - Tap the N door dot, wait for the explorer (`[data-explorer]`), tap the S door dot, and screenshot after about 450 ms as `rooms-join-doors-midwalk.png`: the explorer beside the basin, not on it.
  - Put both under `.playwright-mcp/`, which is not committed, and hand them to the reviewer.
- [ ] **Step 5: Commit** `feat: caveBasin stands on the starter cave's hall`

---

## Decided here, not in the spec (confirm when reviewing)
- **How "one node joining its doors" is encoded.**
  - The node graph (the lay, laidFloor, reserveRooms walks, hangBranches) carries explicit *joins*, anchor ↔ port node.
  - The drawn grid opens the room's rect as floor joined cell to cell, so the ~30 readers of cell `dirs` (gridNavigation, floorLock, lessonOrder, lighting…) need no new adjacency rule.
  - The alternative, a "room hop" adjacency in every `dirs` reader, was rejected as too wide.
- **The room's node may stand under a prop** when the room has no bare node at the parity that aligns its doors. caveBasin's node is the basin's cell. The marker and the explorer use the stop. The graph does not see props; `roomPath` does.
- **The porch only on the way in or the way out**, so it is on the route. Off the route it makes a roomless stub.
