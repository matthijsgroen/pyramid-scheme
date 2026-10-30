# Maze With Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The lattice maze stays the floor; every designed room (prefab) reserves its block of lattice nodes before
the maze is dug, as a room the paths run to, on plain floors and on lock floors alike.

**Architecture:** A new pass `reserveRooms` picks the floor's prefab rooms from the DSL before digging and fixes
their blocks; the main path and side paths are walked to and through those blocks, and the maze grows around the
walked paths. On lock floors the lock lay places a room in a lock region instead. The prefab is stamped before
validate. The parked graph/layout engine (`ROOMS_ENGINE`, `src/game/carve/embed/`, floor plans, wide corridors, the
`plan`/`spread`/`corridorWidth`/`width` knobs) leaves this branch; it lives on `camp/rooms-layout-engine`.

**Tech Stack:** TypeScript, Vitest (`yarn test`), `*.verify.ts` (`yarn verify-content`), Storybook, `yarn generate-world`.

**Spec:** `docs/superpowers/specs/2026-10-30-maze-rooms-design.md`. Also `docs/superpowers/specs/2026-10-29-room-prefabs-design.md`
(prefab rules) and `docs/instructions/carve-passes.md`.

**Spike code to port, not copy blindly:** worktree
`/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-prickly-gila/345327e8-6237-4038-b062-d691e79b5e33/scratchpad/maze-spike`
(its diff: `scratchpad/maze-spike.diff`; its findings and "still hacky" lists: `scratchpad/maze-spike-report.md`).

## Global Constraints

- One rule at every tier, no per-tier or per-floor exception; protect a case with a guard.
- Deterministic from the site's address seed; new draws come from the carve's existing streams in a fixed order.
- Mod off = same carve, bare nodes, open corridors. Core never names a mod. `src/ui` takes props only, with stories.
- Tests use made-up floors, rooms and locks; never pin authored content. Never edit or rename a `.lock`.
- A floor without prefabs carves byte-identically to today until Task 4's rebake: `yarn carve-digests` equals
  `.superpowers/sdd/2026-10-29-carve-engine/baseline-digests.txt` on every floor whose config names no prefab.
- `yarn test` (the whole suite) is green at the end of every task. Bakes and `*.verify.ts` runs only in Task 4,
  each under `timeout 900`.
- Comments describe current state only. Commits: one line `type: what changed`, blank line, the two attribution
  lines. Changelog entries one line. Strings nl + en. No push until the designer approves (Task 4).
- Every task ends with screenshots the controller takes (Storybook `SiteMap/SiteMapBuilder` → Shipped Floor), shown
  to the designer before the next task starts.

## Review Focus

1. **A prefab whose block cannot be placed anywhere on attempt N** refuses that attempt with a reason naming the
   room, and a floor whose `min` rooms never fit refuses at bake with that name. Owner: Task 2.
2. **Two blocks side by side** never share a ring cell, and a 3×3 room or a gate never lands inside a block's ring:
   that refuses the attempt (not a log line). Owner: Task 2.
3. **A side path whose end is a big room** still carries its reward and its gate. Owner: Task 2.
4. **A lock region that holds a control, made a room**, seats the control on one of the prefab's mechanism places,
   and the lock walk passes. Owner: Task 3.
5. **The same seed carves the same floor twice** with reservations. Owner: Task 2.

---

### Task 1: Park the layout engine off this branch

**Files:**
- Delete: `src/game/carve/embed/` (all), `src/game/carve/floorPlans.ts`, `src/game/carve/pickPlan.ts`,
  `src/game/carve/roomsEngine.spec.ts`, `scripts/layoutMeasure.ts`, `src/app/SiteMap/WideCorridor.stories.tsx` and
  its centre-line/lane specs and helpers (`centreLine.ts`, `wideLane.spec.ts`, shoulder/lane handling in
  `roomWalk.ts`, `standingSpot.ts`, `SiteMapView.tsx`, `roomClaims.ts`), `docs/superpowers/plans/2026-10-29-carve-engine.md`.
- Modify: `src/game/carve/engines.ts` (one engine: `CARVE_ENGINE = LATTICE_ENGINE`, no `ROOMS_ENGINE`, no
  `engineFromEnv`; keep the `Engine` seam only if `carveFixtures.ts` still needs it), `src/worldGen/dsl.ts` and
  `src/game/siteTypes.ts` (drop `plan`, `spread`, `corridorWidth`, `NodeSelector.width`, `RoomCell.wideWayIn`,
  `shoulder`, `shoulderOf`), the STRUCTURAL sweep rows for those knobs, `sectionHash.ts`, `docs/game-design/world-spec-stability.md`,
  `src/app/SiteMap/SiteMapBuilder.stories.tsx` (drop the engine control), any verify file reading `CARVE_ENGINE_OVERRIDE`.
- Keep: `choosePrefabs` / `stampPrefab` split, `seatOf`, the prefab check, `scripts/carveDigests.ts`.

- [ ] **Step 1:** Delete and simplify as listed; follow `yarn check-types` until clean.
- [ ] **Step 2:** `yarn test` green (delete only specs whose subject was deleted; list them in the report).
- [ ] **Step 3:** `yarn carve-digests` equals the baseline on all 230 floors (nothing in the lattice carve moved).
- [ ] **Step 4: Commit** `refactor: the layout engine leaves this branch`.

### Task 2: Rooms reserve their blocks before the maze is dug

**Files:**
- Create: `src/game/carve/reserveRooms.ts` (+ `reserveRooms.spec.ts`).
- Modify: `src/game/carve/passes.ts` (pass order), `growMaze.ts`, `hangBranches.ts`, `layFloor.ts`,
  `placeMainContent.ts`, `ladder.ts`, `finish.ts` / `placePrefabs.ts` (stamp before validate; the post-dig fit
  `fitPrefab` stays only for the prefab previews if they still need it).

**Interfaces:**
- `reserveRooms` pass: reads the config's `prefabPlacements` (`rooms`: room, min, max, central) and
  `prefabsByIndex` (pinned), writes `state.blocks: ReservedBlock[]` with
  `ReservedBlock = { room: string; prefab: PrefabChoice; variant: number; mirrored: boolean; rect: CellRect; anchor: Cell; rays: Cell[][]; nodes: Set<CellKey>; on: { main: number } | { section: number } }`.
- Which rooms: pinned ones first; then each `rooms` entry up to `max`, as many as fit, `min` hard. A room takes a
  main-path slot or a side path's end, never adds a room (room-prefabs rule). "Central" = position along the main
  path the DSL describes (0 = ends, 1 = middle).
- Every prefab reserves a block, 3×3 ones included (Fez needs it: spike 2).

The algorithm comes from spike 2 (report §"What changed"), with its "still hacky" list fixed:
- The main path is walked entrance → each main block (central order) → end, through each block's entry ray, anchor,
  exit ray; side spines are walked to their end blocks. The rest of the maze grows as a multi-root DFS around them.
  Nothing walked is pruned.
- The ladder owns the grid size: a floor with blocks starts at the rung's grid plus the blocks' nodes, and climbs as
  today; the carved grid is cropped to its box (no void band).
- A side spine starts at a hub the existing hub/region rules allow, not a random bare node.
- A block's ring is guarded: a 3×3 room, a gate or another block in it refuses the attempt.
- The prefab is stamped before validate, so validate and the room walk see the real room; the chest/portal place
  of a prefab holds the room's chest/portal art.
- A room is a hub (designer, 2026-10-30: a throne room is a centerpiece with many corridors): each free door place
  is a ray to a node where a side path or another main-path leg may start, so side paths branch off a big room as
  they branch off any fork. A central room (`central` near 1) is offered to the side paths first.

- [ ] **Step 1: Failing tests** (made-up floors and a made-up 7×4 hall prefab, as in `spike/rooms/hall.room`):
  - `"a pinned room reserves its block and the main path runs through its doors"`.
  - `"a side path's end room carries the path's reward and gate"` (Review Focus 3).
  - `"three side paths branch off one central hall through its door places"`.
  - `"a block's ring holding a room or a gate refuses the attempt"` (Review Focus 2).
  - `"a floor whose min room never fits refuses naming the room"` (Review Focus 1).
  - `"the same seed carves the same reserved floor twice"` (Review Focus 5).
  - `"a floor naming no prefab carves as before"` (digest of a made-up floor equals its pre-task value).
- [ ] **Step 2:** Run them; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn test` green; `yarn carve-digests` unchanged on every floor naming no prefab (list the floors
  that changed: only starter pyramid floors and the Ipi tomb floor may).
- [ ] **Step 5: Look** (controller): starter_1#1#0 (Fez + starter rooms), two other starter pyramid floors and the
  Ipi tomb floor. Designer judges before Task 3.
- [ ] **Step 6: Commit** `feat: designed rooms claim their space before the maze is dug`.

### Task 3: A lock region can be a designed room

**Files:**
- Modify: `src/game/layLocks.ts` (room asks, as in spike 3), `src/game/carve/reserveRooms.ts`, `layFloor.ts`, `growMaze.ts`, `hangBranches.ts`.

**Interfaces:**
- `LayOptions.blocks: BlockAsk[]` and `LaidLocks.blocks: LaidBlock[]` (spike 3 names). `reserveRooms` hands a room
  to the lay instead of walking it itself when the floor has a lock.
- The rule (one, uniform): a prefab may take a lock region when the prefab has a door place for every way the
  region has and a mechanism place for every control the region seats (the room-prefabs rule "a prefab takes a room
  whose contents it has a place for"). A region with many ways (a hub such as caveLevers' `hall`) is laid as the
  anchor plus one ray per way. A drop end stays a corridor stop: a drop needs its straight run, so a drop's end is
  never a room. The region's controls stand on the mechanism places. "Central" on a lock floor is measured along
  the lock's route.

- [ ] **Step 1: Failing tests** (a made-up lock, a made-up prefab with a mechanism place):
  - `"a lock region becomes the room and the lock walk passes"`.
  - `"the region's lever stands on the room's mechanism place"` (Review Focus 4).
  - `"a hub region with four ways becomes a room with four door places in use"`.
  - `"a drop end is never offered to a room"`.
- [ ] **Step 2:** Run them; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `yarn test` green; `yarn lock` all ✓.
- [ ] **Step 5: Look** (controller): starter_treasure_tomb#1#0 (caveLevers) and the pitStair / throwItBack tomb
  floors carved with a made-up room asked into a region (Storybook preset, not shipped content).
- [ ] **Step 6: Commit** `feat: a lock region can be a designed room`.

### Task 4: Bake, gates, the designer's look (controller drives; subagent for the bake and gates)

- [ ] **Step 1:** `timeout 900 yarn generate-world`; then `yarn verify-content` (split per file under `timeout 900`),
  `yarn test`, `yarn lock`; `docs/game-design/lock-placement.md` "Placed N of N" not lower.
- [ ] **Step 2:** Docs: `docs/instructions/carve-passes.md` (the reserve pass), `docs/instructions/room-prefabs.md`
  (rooms claim space before digging). `CHANGELOG.md` `## Unreleased`: `Designed rooms on the starter floors`.
- [ ] **Step 3: Look:** screenshots of every starter floor (pyramids and tomb) in the app; STOP for the designer.
- [ ] **Step 4:** After approval: re-snapshot `src/data/starterCarve.json` and `tierFingerprints.json`; commit
  `test: starter carve snapshot with designed rooms`; push.
