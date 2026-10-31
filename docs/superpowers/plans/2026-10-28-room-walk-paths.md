# Room Walk Paths and Growing Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fork or pass-through chamber whose activity has a centre kind grows to hold that object plus a ring to walk round it, the explorer walks round it by the shortest way between the exits he uses, stands at a stop the room's marker sits on, and the object fades when it would hide him.

**Architecture:** Growth is a last, rand-free step on the finished carve (`growRooms`, called at the end of `assembleFloor`): it writes a `grownRoom` record (rect + centre piece) on the room's node cell and changes no cell's `type` or `dirs`, so the walk graph, every lock walk and every reachability check are untouched by construction. The map reads that record: `roomClaims` claims the whole rect, `roomWalk.ts` turns a route through the rect into a taut polyline round the piece and a stop, and the explorer's logical position stays the node (the stop is where he is drawn, as a stairhead's `standingOffset` already is). The search for space is the bake's seed search: among seeds at the packing where a floor first meets every hard criterion, it prefers the fewest centre objects that fell back.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, tsx scripts (`yarn generate-world`).

**Spec:** `docs/superpowers/specs/2026-10-28-room-walk-paths-design.md`

## Global Constraints

- Core never names a mod; `src/game/` stays pure TypeScript (no React, DOM, i18n).
- A component in `src/ui/` ships only with a story; this plan adds none there. App-layer drawing changes get a story in `src/app/SiteMap/` for looking.
- Any new user-facing string has `en` and `nl` entries (this plan adds none: the fallback report is bake console output).
- Comments state the current state and why, never history ("replaces X", "used to").
- Tests never pin authored content: every grid, lock and centre kind in a unit test is made up. Stand-in centre kinds are injected through `propFootprint` / `footprintOf`; the shipped `DECORATION_FOOTPRINTS` flags no kind `centre` in this plan.
- Never weaken a check, never hand-edit baked numbers (`generatedWorld.ts`, `carveLedger.json`, `tierFingerprints.json`, `starterCarve.json`).
- Every bake and verify runs under `timeout 900`.
- Rendering and walk changes are verified by looking: screenshots of the story and the dev map, never a grep.
- Starter's carved floors stay exactly as they are; the starter tier fingerprint does not move.
- Saves are keyed by authoring address and slot (`docs/instructions/world-reshape-release.md`); no save migration.
- Determinism: growth draws no `rand()`; ties break by `hashString`, so no other floor moves.
- Commits: one line `type: what changed`, then a blank line and the two trailers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01NQk9Q1WZoZfDzoRioyXby1`.
- Never bare `git stash`, never `git pull`, never merge or open a PR. `yarn verify` before every commit that touches code.
- Out of scope, its own later plan: junior's real centre objects (banquetTable, the lotus pool), their activities, kinds and art. This plan ends with stand-ins only, so no player-visible change and no CHANGELOG entry.

## Review Focus

1. **A save standing on a cell a room has since absorbed** (a re-carve grew a room over a corridor cell the player stood in): he is drawn at the room's stop, not under the piece, and the next tap walks from there. Test: Task 6, "draws an explorer on an absorbed cell at its room's stop".
2. **Walking behind the piece to a north exit**: he is drawn behind the piece while north of its floor line and in front while south of it; never over it. Test: Task 7, "sorts the explorer against the piece by the waypoint he last passed".
3. **A fork whose arm leads into a hidden section**: growth never absorbs a hidden cell, so revealing the section later shows the corridor where it always was. Test: Task 3, "never absorbs a hidden cell".
4. **A tap while the explorer is mid-glide through a room**: the snap lands him on the stop, not on the node's centre under the piece. Test: Task 6, "snaps to the stop when a second tap lands mid-walk".
5. **An absorbed arm lit from its far end while the room is still fogged**: it draws and offers as its own corridor (the existing fogged-owner rule), and opens into the room when the room is lit. Test: Task 4, "a fogged grown room leaves a lit absorbed arm to its own state".

## Where the code bends the spec's wording

- **"The activity pick moves ahead of the maze."** Every dressing pick is hashed from the room's position
  (`pickDressing`, `render.ts`), and forks and chambers exist only once `growMaze`, `hangBranches` and `seatChambers`
  have run. Moving the pick before the maze would re-pick every room in the world, starter's included. The pick stays
  where it is; growth runs after it on the finished carve, and the search for room is the bake's seed preference
  (Task 9), which the bake already runs one attempt per seed.
- **"Growing moves walls."** It moves drawn walls only: growth claims void and absorbs a room's own straight arm cells
  as floor, and no cell's `type` or `dirs` changes. So section hashes cannot see it, and the sweep's `STRUCTURAL` rule
  ("never re-carves without rehashing") cannot hold for dressing without moving every section hash. Dressing gets its
  own sweep list (Task 10).
- **"4×3, 5×3, 4×4."** Nodes stand two cells apart and arms leave through a node's sides, so a room on a straight
  corridor widens along it only by absorbing its own arm. The rect is the piece plus one ring, nothing larger.

---

## File Structure

| File                                                                                                                            | Responsibility                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/SiteMap/starterCarve.spec.ts` (new) + `src/data/starterCarve.json` (new, written by the snapshot)                      | One digest per starter floor's carved grid; the starter guard.                                        |
| `src/game/siteTypes.ts`                                                                                                         | `PropFootprint.centre`, `CellRect`, `CentrePiece`, `GrownRoom`, `RoomCell.grownRoom`, `isCentreKind`. |
| `src/game/siteAssembler.ts` / `src/game/carve/state.ts` / `src/game/carve/prepareFloor.ts`                                      | `propFootprint` injection (`AssembleFloorKeyRequirements` → `FloorPrep.input`).                       |
| `src/game/carve/render.ts`                                                                                                      | Dressing: a centre kind only for forks and chambers, always taken when the activity has one.          |
| `src/game/roomFootprint.ts`                                                                                                     | `claimsFloorAt` (render's `chamberAt` rule, shared).                                                  |
| `src/game/roomShape.ts` (new)                                                                                                   | Read side of a grown room, for carve and map alike: `grownCells`, `roomDoors`.                        |
| `src/game/carve/growRooms.ts` (new)                                                                                             | The growth step and `centreFallbacks`.                                                                |
| `src/game/carve/assembleFloor.ts`                                                                                               | Calls `growRooms` last on every successful carve.                                                     |
| `src/app/SiteMap/roomClaims.ts`                                                                                                 | A grown room claims its rect and stands its piece; an ungrown centre kind stands its fallback.        |
| `src/app/SiteMap/roomWalk.ts` (new)                                                                                             | Stop, room path, route → waypoints, step count, where a cell's marker is drawn.                       |
| `src/app/SiteMap/standingSpot.ts`                                                                                               | Stop offset for a grown node and for an absorbed cell; occupant beside the stop.                      |
| `src/app/SiteMap/ExplorerDot.tsx`                                                                                               | Waypoints from `waypointsOf`, length-proportional room segments, `onWaypoint`.                        |
| `src/app/SiteMap/useSiteNavigation.ts`                                                                                          | `walkDelay` from the room-aware step count.                                                           |
| `src/app/SiteMap/SiteMapView.tsx`                                                                                               | Marker at the stop, arrows at doors, live depth sort, piece fade.                                     |
| `src/app/SiteMap/GrownRoom.stories.tsx` (new)                                                                                   | A stand-in grown room to look at.                                                                     |
| `src/game/lessonOrder.ts` (new) + `src/game/lockCatalogue.ts`                                                                   | Carved-floor lesson rule; `isLessonLock`.                                                             |
| `src/worldGen/carveSeedSearch.ts`, `scripts/layoutPicker.ts`                                                                    | Hard criterion for lessons; fewest-fallbacks preference.                                              |
| `src/worldGen/centreReport.ts` (new), `scripts/generateWorld.ts`                                                                | Fallbacks per tier, printed by the bake.                                                              |
| `src/app/SiteMap/worldFloorAssembly.verify.ts`, `docs/game-design/world-spec-stability.md`, `docs/instructions/carve-passes.md` | Stability tenet revised; growth documented.                                                           |

---

### Task 1: Starter carve snapshot

**Files:**

- Create: `src/app/SiteMap/starterCarve.spec.ts`
- Create (by the snapshot): `src/data/starterCarve.json`
- Modify: `src/data/tierFingerprints.ts` (beside `stableStringify`)

**Interfaces:**

- Produces: `carvedFloorDigest(grid: FloorGrid): string` in `src/data/tierFingerprints.ts`: sorted-key JSON of `grid` with every `Set` turned into a sorted array (a bare `stableStringify` writes a `Set` as `{}`), sha256, first 16 hex.

- [ ] **Step 1: Write the test**

```ts
describe("starter's carved floors", () => {
  it("are carved exactly as recorded, floor by floor", () => {
    const digests = Object.fromEntries(starterFloors().map(f => [f.label, carvedFloorDigest(assembled(f))]))
    expect(Object.keys(digests).length).toBeGreaterThan(5)
    expect(JSON.stringify(digests, null, 2)).toMatchFileSnapshot("../../data/starterCarve.json")
  })
})
describe("carvedFloorDigest", () => {
  it("tells two grids apart by a cell's dirs alone", () => {
    /* two made-up 1×3 grids, one dir differs */
  })
})
```

`starterFloors()` = `allFloors()` whose journey (`journeys.find(j => j.id === floor.journeyId)`) has `difficulty === "starter"`; `assembled` carves as `worldFloorAssembly.verify.ts` does (`resolveEncounter` from the family registry, `resolveKeyRequirements`, `floorRef`) and throws on failure.

- [ ] **Step 2: Run it to write the baseline, then again to check it holds**

Run: `yarn test src/app/SiteMap/starterCarve.spec.ts` twice. Expected: first run writes `src/data/starterCarve.json`; second PASS. Open the JSON and check it names every starter floor.

- [ ] **Step 3: Commit**

```bash
git add src/app/SiteMap/starterCarve.spec.ts src/data/starterCarve.json src/data/tierFingerprints.ts
git commit -m "test: snapshot of starter's carved floors"
```

---

### Task 2: Centre kinds and the dressing that always takes one

**Files:**

- Modify: `src/game/siteTypes.ts:145-153` (footprints), `RoomCell` (~line 309)
- Modify: `src/game/siteAssembler.ts:62-89` (`AssembleFloorKeyRequirements`), `src/game/carve/state.ts:136-152` (`FloorPrep.input`), `src/game/carve/prepareFloor.ts` (default)
- Modify: `src/game/roomFootprint.ts`, `src/game/carve/render.ts` (dressing block, `chamberAt`)
- Test: `src/game/carve/render.spec.ts` ("dressing by purpose"), `src/game/roomFootprint.spec.ts` (create if absent)

**Interfaces:**

- Produces:
  - `PropFootprint = { cols: number; rows: number; tall: number; centre?: true }` — `centre` marks a kind that stands in a room's middle.
  - `isCentreKind(kind: DecorationKind, footprintOf?: (k: DecorationKind) => PropFootprint): boolean` (default `decorationFootprint`).
  - `CellRect = { top: number; left: number; rows: number; cols: number }`
  - `CentrePiece = { kind: DecorationKind } & CellRect` (absolute grid cells; the footprint is written on it so the map never consults the table)
  - `GrownRoom = { rect: CellRect; piece: CentrePiece }`; `RoomCell.grownRoom?: GrownRoom`
  - `AssembleFloorKeyRequirements.propFootprint?: (kind: DecorationKind) => PropFootprint`; `FloorPrep.input.propFootprint` (required, defaulted to `decorationFootprint` in `prepareFloor`).
  - `claimsFloorAt(grid: FloorGrid, r: number, c: number): boolean` in `roomFootprint.ts`: render's `chamberAt` rule (portal kind by `portalKindOf`, `"treasure"` for a treasure/shop encounter, else `"room"`, then `isChamber`), now used by render and by Task 3.

- [ ] **Step 1: Write the failing tests** (stand-in: inject `propFootprint` making `basin` `{ cols: 2, rows: 1, tall: 0, centre: true }`)

```ts
it("gives a fork whose activity has a centre kind that kind, every time", ...)
  // pool [basin, mat, pillar], role serving an activity whose props include basin → decoration === "basin" on every fork
it("keeps a centre kind off a dead end, a stairhead and the exit", ...)
  // same pool on a stairhead/exit → decoration !== "basin"
it("names the single-cell kind a centre object falls back to", ...)
  // decorationFallback set, isSingleCell(footprint(decorationFallback))
it("dresses as before when no kind is flagged centre", ...)
  // default footprints: the floor's grid toEqual the grid carved with propFootprint omitted
// roomFootprint.spec.ts
it("claimsFloorAt agrees with render on every room of a carved floor", ...)
```

- [ ] **Step 2: Run to see them fail**

Run: `yarn test src/game/carve/render.spec.ts src/game/roomFootprint.spec.ts` — Expected: FAIL (`propFootprint` unknown / basin not picked).

- [ ] **Step 3: Implement**

In the dressing loop: when the room is a fork or `roomType === "chamber"` and `propPool` holds centre kinds, the decoration is `pickDressing(centreKindsOfPool, pk, "decoration")`; on every other chamber centre kinds are filtered out of `propPool` before the pick. Same salts, so a pool without centre kinds picks exactly as now.

- [ ] **Step 4: Run tests, the starter snapshot, and the gate**

Run: `yarn test src/game/carve src/game/roomFootprint.spec.ts src/app/SiteMap/starterCarve.spec.ts && yarn verify` — Expected: PASS, snapshot unchanged.

- [ ] **Step 5: Commit** — `git commit -m "feat: a centre kind is flagged per kind and always dresses its room"`

---

### Task 3: Rooms grow round their centre object

**Files:**

- Create: `src/game/roomShape.ts`, `src/game/roomShape.spec.ts`
- Create: `src/game/carve/growRooms.ts`, `src/game/carve/growRooms.spec.ts`
- Modify: `src/game/carve/assembleFloor.ts` (every `success` return goes through `growRooms`)

**Interfaces:**

- Consumes: `GrownRoom`, `isCentreKind`, `claimsFloorAt`, `FloorPrep.input.propFootprint` (Task 2).
- Produces:
  - `growRooms(grid: FloorGrid, siteId: string, footprintOf: (k: DecorationKind) => PropFootprint): FloorGrid`
  - `centreFallbacks(grid: FloorGrid, footprintOf): Array<{ at: string; kind: DecorationKind }>` — rooms whose decoration is a centre kind and carry no `grownRoom`.
  - `grownCells(grid: FloorGrid): ReadonlyMap<string, string>` — every rect cell (node included) → its node's key; cached per grid (WeakMap).
  - `roomDoors(grid: FloorGrid, r: number, c: number): Partial<Record<Direction, readonly [number, number]>>` — per `dirs` of a grown node, the rect-edge cell its arm leaves by.

**The rule (decisions the tests freeze):**

- Grows: a node with `roomType` `fork` or `chamber` whose `decoration` is a centre kind. Nothing else.
- Rect = the piece's footprint plus a one-cell ring: `rows = f.rows + 2`, `cols = f.cols + 2`; the piece sits at `(top + 1, left + 1)`. Candidates: every placement of that rect containing the node, inside the grid.
- A rect cell is the node, `empty` void, or an **absorbed arm cell**: a corridor on a straight line from the node along one of its `dirs`, with exactly that axis in its `dirs`, no `obstacle`, not `hidden`. Every arm runs straight to the rect's edge (its door). Any other used cell refuses the candidate.
- The rect grown by one cell meets no other room that claims floor (`claimsFloorAt`, its 3×3) and no rect grown earlier.
- Preference: fewest absorbed cells, then the node nearest the rect's middle, then `hashString(\`${siteId}|grow|${pk}|${top},${left}\`)`. Rooms are grown in `hashString(\`${siteId}|grow|${pk}\`)` order.
- No candidate: no `grownRoom`; the room keeps its node, size and `decorationFallback`.

- [ ] **Step 1: Write the failing tests** (hand-built grids from `carveFixtures`-style helpers; stand-in `basin` 2×1 centre)

```ts
it("grows a vertical pass-through chamber sideways to a 4×3 round its piece", ...)
  // rect {rows:3, cols:4}, piece inside with a ring on every side, node inside rect
it("absorbs its own straight arm to widen along a horizontal corridor", ...)
  // E-W chamber: rect cols 4, one arm node absorbed, the door is the rect-edge cell on that arm
it("changes no cell's type or dirs", ...)
  // grid with grownRoom stripped toEqual the input grid
it("never absorbs a corner, a room or a drop's run", ...)  // one case each, no grownRoom
it("never absorbs a hidden cell", ...)                      // Review Focus 3
it("never meets another chamber's 3×3 or another grown room", ...)
it("leaves a dead end, a portal and a mechanism room their size", ...)
it("falls back, keeping today's room, when no placement fits; centreFallbacks names it", ...)
it("grows the same rooms the same way on every run, drawing no rand()", ...)
it("leaves a lock floor's walk exactly as it was", ...)
  // carveLockFloor fixture with stand-in footprints: walkFloorLock(grown) toEqual walkFloorLock(ungrown)
// roomShape.spec.ts
it("maps every rect cell to its node and names each arm's door", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/game/carve/growRooms.spec.ts src/game/roomShape.spec.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `growRooms`, `centreFallbacks`, `grownCells`, `roomDoors`; call `growRooms(grid, siteId, keyRequirements.propFootprint ?? decorationFootprint)` as the last step of `assembleFloor` on every success path, after the web doors are laid (a web door could otherwise land on an absorbed cell).**

- [ ] **Step 4: Run tests, starter snapshot, gate** — `yarn test src/game src/app/SiteMap/starterCarve.spec.ts && yarn verify` → PASS, snapshot unchanged (no shipped centre kind).

- [ ] **Step 5: Commit** — `git commit -m "feat: a room grows round its centre object on the finished carve"`

---

### Task 4: The map claims a grown room whole

**Files:**

- Modify: `src/app/SiteMap/roomClaims.ts:111-306`
- Test: `src/app/SiteMap/roomClaims.footprint.spec.ts`, `src/app/SiteMap/tileRegions.spec.ts`

**Interfaces:**

- Consumes: `RoomCell.grownRoom`, `grownCells` (Task 3).
- Produces: `buildRoomClaims` unchanged in signature; for a grown owner `claimedBy` holds every rect cell but the node, `openEdges` joins every pair of orthogonally adjacent rect cells, `decorationAt` holds `piece` at `(piece.top, piece.left)`, `decorationCells` the piece's cells. Grown rooms are claimed before the row-major scan, so no ring claims into a rect. A grown room takes no companion.

- [ ] **Step 1: Write the failing tests**

```ts
it("claims every cell of a grown room's rect, absorbed arm cells included", ...)
it("stands the piece where the carve put it, its whole footprint", ...)
it("stands the single-cell fallback in a room whose centre object did not grow", ...)
  // decoration basin (centre via footprintOf), no grownRoom → decorationAt holds decorationFallback
it("lets no neighbouring room claim a cell of a grown rect", ...)
it("a fogged grown room leaves a lit absorbed arm to its own state", ...)   // Review Focus 5
  // litClaimOwner(...) undefined for the arm while the owner is fogged; tileRegionsFor draws it corridor
// tileRegions.spec.ts
it("draws a grown room as one floor with no partition inside it", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/app/SiteMap/roomClaims.footprint.spec.ts src/app/SiteMap/tileRegions.spec.ts` → FAIL.

- [ ] **Step 3: Implement** in `buildRoomClaims`; the fallback rule lives in the `standing` lookup (a centre kind is skipped where the owner has no `grownRoom`).

- [ ] **Step 4: Run** — same command + `yarn test src/app/SiteMap` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: the map claims a grown room's whole rect and stands its piece"`

---

### Task 5: Paths through a grown room

**Files:**

- Create: `src/app/SiteMap/roomWalk.ts`, `src/app/SiteMap/roomWalk.spec.ts`

**Interfaces:**

- Consumes: `grownCells`, `roomDoors` (Task 3); `cellCenter`, `COL_PITCH`, `ROW_PITCH` from `mapScale.ts`.
- Produces:
  - `type WalkPoint = { x: number; y: number; inRoom?: true }`
  - `roomStop(grid: FloorGrid, r: number, c: number): readonly [number, number] | undefined` — for a grown node: the ring cell directly south of the piece in the column nearest the node's, skipping door cells; then the other south ring cells nearest first; then east, west, north. Undefined for any other cell.
  - `roomPath(grid: FloorGrid, node: readonly [number, number], from: RoomEnd, to: RoomEnd): WalkPoint[]` with `type RoomEnd = { door: Direction } | "stop"` — shortest polyline in pixel space over the points {from, to, the four ring corners diagonal to the piece}, an edge allowed when its segment does not cross the interior of the piece's pixel rectangle (touching its boundary is allowed). Dijkstra over at most six points. Every point is `inRoom`.
  - `walkPoints(grid: FloorGrid, route: ReadonlyArray<readonly [number, number]>, standAt: (r: number, c: number) => StandingOffset): WalkPoint[]` — today's mapping (ends at `cellCenter + standAt`, the rest at centres) with each run of consecutive rect cells of one grown room replaced by `roomPath` (entering → its door; leaving → its door; a route that starts or ends at the node → `"stop"`).
  - `stepsBetween(a: WalkPoint, b: WalkPoint): number` — `hypot(dx / COL_PITCH, dy / ROW_PITCH)` when either end is `inRoom`, else `1`.
  - `walkSteps(points: readonly WalkPoint[]): number` — sum of `stepsBetween` over consecutive pairs.
  - `markerCell(grid: FloorGrid, r: number, c: number): readonly [number, number]` — a grown node → its stop; an absorbed cell → its arm's door; anything else → itself.

- [ ] **Step 1: Write the failing tests** (made-up grid: a fork with arms W, E, S; stand-in 2×1 piece)

```ts
it("goes straight between two doors on the same side of the piece", ...)        // 2 points
it("goes round the near side when the two doors are on opposite sides", ...)
  // W door → E door: every point south of the piece, none inside it
it("takes the shorter way round for every pair of exits", ...)
  // for each door pair, length <= length of the path forced round the other side
it("never crosses the piece", ...)  // every segment checked against the piece rect, all door/stop pairs
it("puts the stop south of the piece, on no door", ...)
it("leaves a route through no grown room exactly as today's waypoints", ...)
it("counts a corridor step as one and a room segment by its length", ...)
it("draws a grown room's marker at its stop and an absorbed arm's at its door", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/app/SiteMap/roomWalk.spec.ts` → FAIL.
- [ ] **Step 3: Implement `roomWalk.ts`.**
- [ ] **Step 4: Run** — `yarn test src/app/SiteMap/roomWalk.spec.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: shortest walk round a room's centre object and the room's stop"`

---

### Task 6: The explorer walks round and stands at the stop

**Files:**

- Modify: `src/app/SiteMap/ExplorerDot.tsx:47-170`, `src/app/SiteMap/standingSpot.ts`, `src/app/SiteMap/useSiteNavigation.ts:153-157`
- Test: `src/app/SiteMap/ExplorerDot.spec.tsx`, `src/app/SiteMap/standingSpot.spec.ts`, `src/app/SiteMap/useSiteNavigation.spec.ts`, `src/app/SiteMap/movementInvariant.spec.ts`

**Interfaces:**

- Consumes: `walkPoints`, `walkSteps`, `stepsBetween`, `roomStop`, `WalkPoint` (Task 5).
- Produces:
  - `ExplorerDot` props `waypointsOf?: (route: ReadonlyArray<readonly [number, number]>) => WalkPoint[]` (default: today's mapping) and `onWaypoint?: (at: WalkPoint) => void`, fired when a segment starting at an `inRoom` point begins and on arrival — never per frame.
  - Each segment lasts `segmentDuration * stepsBetween(start, end)`.
  - `standingOffset(grid, claims, r, c)`: a grown node → offset to its stop; an absorbed cell → offset to its room's stop; otherwise as now. `occupantOffset` in a grown room → the ring cell beside the stop (east, else west), never on the piece.
  - `walkDelay(row, col)` = `walkSteps(walkPoints(grid, route, standAt)) * 120 + 100`.

- [ ] **Step 1: Write the failing tests**

```ts
// ExplorerDot.spec.tsx (made-up grid with a grown fork; fake rAF)
it("walks round the piece from one door to the other, never inside it", ...)   // sampled data-at points
it("comes to rest at the room's stop when the room is the destination", ...)
it("snaps to the stop when a second tap lands mid-walk", ...)                  // Review Focus 4
it("takes as long per step in a room as in a corridor", ...)                   // count rAF frames per step, no wall-clock
it("announces each room waypoint once, and never in a corridor", ...)
// standingSpot.spec.ts
it("stands a grown room's explorer at its stop", ...)
it("draws an explorer on an absorbed cell at its room's stop", ...)            // Review Focus 1
it("stands an occupant beside the stop, off the piece", ...)
// useSiteNavigation.spec.ts
it("offers a grown room's prompt after the room walk, not the cell count", ...)  // fake timers
// movementInvariant.spec.ts
// add a grown-room fixture (floorFrom + grownRoom on a fork) to the walked fixtures: properties A, B, C hold unchanged
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/app/SiteMap/ExplorerDot.spec.tsx src/app/SiteMap/standingSpot.spec.ts src/app/SiteMap/useSiteNavigation.spec.ts src/app/SiteMap/movementInvariant.spec.ts` → FAIL.
- [ ] **Step 3: Implement.** `SiteMapView` passes `waypointsOf={route => walkPoints(grid, route, standAt)}`.
- [ ] **Step 4: Run** the same + `yarn test src/app/SiteMap` → PASS, including every `*Walk.spec.tsx`.
- [ ] **Step 5: Commit** — `git commit -m "feat: the explorer walks round a room's centre object to its stop"`

---

### Task 7: Marker on the stop, live depth, the piece fades

**Files:**

- Modify: `src/app/SiteMap/SiteMapView.tsx` (marker loop ~1880-2040, `standing` ~1420-1550, `explorerBaseY` ~1563)
- Create: `src/app/SiteMap/GrownRoom.stories.tsx`
- Test: `src/app/SiteMap/SiteMapView.spec.tsx`

**Interfaces:**

- Consumes: `markerCell`, `roomStop`, `onWaypoint` (Tasks 5–6), `OCCLUDER_FADE` (`htmlLayers.tsx`).
- Produces:
  - Every `MarkerCell` is drawn at `cellCenter(...markerCell(grid, r, c))`; its tap still calls `onCellClick(offer)`, so offers stay cell-level (`clickTargetAt` unchanged) and the movement invariant holds as is.
  - `explorerBaseY` reads the last `onWaypoint` point while a room walk is under way, else the destination as now.
  - A centre piece's sprite takes `OCCLUDER_FADE` while the explorer's current point is north of the piece's floor line and inside its columns' x range.

- [ ] **Step 1: Write the failing tests**

```ts
it("draws a grown room's node marker on its stop, and a tap there walks to the room", ...)
it("draws the run arrow of an absorbed arm at the room's door", ...)
it("sorts the explorer against the piece by the waypoint he last passed", ...)  // Review Focus 2
it("fades the piece while the explorer stands behind it, and only then", ...)
it("draws a room with no centre object exactly as before", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/app/SiteMap/SiteMapView.spec.tsx` → FAIL.
- [ ] **Step 3: Implement; write `GrownRoom.stories.tsx`**: a made-up floor with a grown fork (arms W, E, S), stand-in `basin` 2×1 piece, args `explorerAt: "west" | "stop" | "east" | "north"` and a play that walks west door → east door.
- [ ] **Step 4: Run** — `yarn test src/app/SiteMap && yarn verify` → PASS.
- [ ] **Step 5: Look.** `yarn storybook`, open the story; screenshot each `explorerAt`, and three frames of the walk (start, passing the piece, at the door). Confirm: walk hugs the piece without cutting through or zig-zagging, marker sits under his feet at the stop, piece fades only while he is behind it. Close the browser (`docs/instructions/browser-checks.md`).
- [ ] **Step 6: Commit** — `git commit -m "feat: a grown room's marker sits on its stop and its piece fades over the explorer"`

---

### Task 8: A lesson still shows its door first, on the carved floor

**Files:**

- Create: `src/game/lessonOrder.ts`, `src/game/lessonOrder.spec.ts`
- Modify: `src/game/lockCatalogue.ts` (export `isLessonLock(name: string): boolean`)
- Modify: `src/worldGen/carveSeedSearch.ts:9-26, 76-93` (criterion), `src/app/SiteMap/placedLockFloors.verify.ts` (sweep)

**Interfaces:**

- Consumes: `walkableFrom`, `findPath` (`gridNavigation`), `grownCells` (Task 3).
- Produces:
  - `lessonOrderFaults(grid: FloorGrid): string[]` — for each gate shut at the start whose owner is a control standing on this floor: (a) **seen first**: walking from the entrance with every mechanism at its initial state and never entering a control's cell, some walkable cell beside the door is reached; (b) **off the obvious path**: the control's cell is not on `findPath(entrance, door)`, and no grown room that path passes through has the control within its rect grown by one cell. Each fault names the gate and which rule.
  - `HARD_CRITERIA` gains `"lesson shows its door first"` (last); `refusal(result, floor)` applies it when `floor.locks?.some(({ lock }) => isLessonLock(lock.name))`; `AUTHORING_FIELD` names `locks`.

- [ ] **Step 1: Write the failing tests** (made-up grids)

```ts
it("passes a door met on the way with its lever up a side corridor", ...)
it("refuses a lever on the way to its own door", ...)
it("refuses a door that can only be reached past its lever", ...)
it("refuses a lever standing in the ring of a grown room on the way", ...)
it("ignores a gate a board opens, which stands in its own junction", ...)
// carveSeedSearch.spec.ts
it("refuses a lesson floor whose carve breaks the order, and only a lesson floor", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/game/lessonOrder.spec.ts src/worldGen/carveSeedSearch.spec.ts` → FAIL.
- [ ] **Step 3: Implement; add a sweep case** to `placedLockFloors.verify.ts`: "every placed lesson shows its door first" over every floor whose locks hold a lesson.
- [ ] **Step 4: Run** — unit tests PASS; then `timeout 900 yarn vitest run --config vitest.verify.config.ts src/app/SiteMap/placedLockFloors.verify.ts`. **If any lesson floor of the committed world fails, stop and report it to the user with its floor and fault** (the fix is in the carve or the lesson's placement, never in the check, and a starter floor must not move).
- [ ] **Step 5: Commit** — `git commit -m "feat: the bake refuses a carve where a lesson shows its control first"`

---

### Task 9: The bake looks for room to grow and reports what fell back

**Files:**

- Modify: `src/worldGen/carveSeedSearch.ts` (`CarvePairOptions.prefer`, `searchCarvePair`, `verifyCarvePair`)
- Modify: `scripts/layoutPicker.ts` (passes `prefer`)
- Create: `src/worldGen/centreReport.ts`, `src/worldGen/centreReport.spec.ts`
- Modify: `scripts/generateWorld.ts` (print after `printPicks`)
- Test: `src/worldGen/carveSeedSearch.spec.ts`

**Interfaces:**

- Consumes: `centreFallbacks` (Task 3).
- Produces:
  - `CarvePairOptions.prefer?: (grid: FloorGrid) => number` — lower is better, 0 ends the search. `searchCarvePair`: at the first packing where a candidate meets every hard criterion, every seed of that packing is asked and the first with the lowest `prefer` is pinned; packing never rises for it. `verifyCarvePair` returns null (search again) for a pin whose `prefer` is above 0.
  - `layoutPicker` passes `prefer: grid => centreFallbacks(grid, decorationFootprint).length`.
  - `centreFallbacksByTier(configs, carveFinal: CarveFinalFloor): Record<Difficulty, { stood: number; fellBack: number }>`, `configs` typed exactly as `findStrandingLocks`'s first parameter, the tier read off each journey's `difficulty`.
  - Bake line: `  Centre objects: starter 0/0, junior <stood> stood, <fellBack> fell back, …` per tier, every run.

- [ ] **Step 1: Write the failing tests** (`assemble` stubbed with made-up grids)

```ts
it("pins the first seed with no fallback over an earlier one with fallbacks", ...)
it("pins the fewest fallbacks when no seed has none, without raising packing", ...)
it("returns the first hard-criteria seed unchanged when prefer is absent or always 0", ...)
it("searches a pin again when its carve has a fallback", ...)
// centreReport.spec.ts
it("counts stood and fell-back centre objects per tier", ...)
```

- [ ] **Step 2: Run to see them fail** — `yarn test src/worldGen` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — `yarn test src/worldGen scripts && yarn verify` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: the bake prefers seeds where centre objects grow and reports fallbacks"`

---

### Task 10: The stability tenet says dressing can move walls

**Files:**

- Modify: `src/app/SiteMap/worldFloorAssembly.verify.ts:140-337`
- Modify: `docs/game-design/world-spec-stability.md` (free table rows `decorations`, `wallDecorations`, `a room's activity`; "Moves the walls" table), `docs/instructions/carve-passes.md` (growth runs on the finished carve), `docs/game-design/themed-rooms.md` (one line: a centre kind is flagged in `DECORATION_FOOTPRINTS`)

**Decisions:**

- `shape(g)` adds each room's `grownRoom` rect, so a grown room counts as moved walls.
- The three dressing rows leave `INERT` for a new list, `DRESSING`, asserting: every floor whose walls moved holds a grown room before or after the change. They are not added to `STRUCTURAL`: growth moves no `dirs`, so section hashes stay put by design, and putting dressing in the hash would move every section hash in the world, starter's included.
- The doc moves the three rows to "Moves the walls", one rule at every tier: the dressing a room is given can grow it round a centre object; no save cost (saves keyed by address and slot).

- [ ] **Step 1: Edit the sweep and run it** — `timeout 900 yarn vitest run --config vitest.verify.config.ts src/app/SiteMap/worldFloorAssembly.verify.ts` → PASS.
- [ ] **Step 2: Edit the docs** (tables edited by line, read back after; prettier reflows them).
- [ ] **Step 3: Commit** — `git commit -m "docs: dressing can grow a room, at every tier"`

---

### Task 11: Gate on committed data

- [ ] **Step 1: Bake** — check for an uncommitted playtest bake first (`git status src/data`), then `timeout 900 yarn generate-world`. Expected: `Centre objects:` line with 0 everywhere; `git diff src/data/generatedWorld.ts` empty unless Task 8's criterion re-pinned a lesson floor (then only junior/expert lesson floors differ; list them in the report). `carveLedger.json` may change (carve source fingerprint): commit it.
- [ ] **Step 2: Guards** — `yarn test src/data/tierFingerprints.spec.ts src/app/SiteMap/starterCarve.spec.ts` → PASS with no update.
- [ ] **Step 3: Content** — `timeout 900 yarn verify-content` → PASS; `yarn lock` → every lesson ✓.
- [ ] **Step 4: Gate** — `yarn verify` → PASS.
- [ ] **Step 5: Look in the app** — `yarn dev`, a starter floor and a junior lock floor: walks and markers as before. Close what you opened.
- [ ] **Step 6: Commit and push** — `git add src/data/carveLedger.json src/data/generatedWorld.ts` (only if changed) and `git commit -m "chore: rebake after room growth"`; `git push`.
