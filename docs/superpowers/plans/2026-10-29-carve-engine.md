# Carve Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Floors whose rooms are real space: the passes decide the topology on the node lattice (now a sketch), and a
new embed step gives every room its footprint first and then routes corridors between them, with DSL knobs for plan,
spread, winding and width; caves included; packing gone.

**Architecture:** `carveFloor` takes an `Engine` record. `LATTICE_ENGINE` is today's carve, byte-identical, until the
swap. `ROOMS_ENGINE` runs the same `PASSES` (plus `pickPlan` up front), chooses prefabs on the sketch, renders the
lattice grid, then `embedFloor` turns it into the real grid. After that come validate, the pieces and finish, and
then the prefabs are stamped. `embedFloor` reads the sketch as a graph (rooms are blocks, locks keep their behaviour, not their shape,
corridors are strings holding their stops), lays it out (main path first, side paths hung on as subtrees, then
compacted), and carves the layout (Task 11; the block embed of Task 5 is replaced).

**Tech Stack:** TypeScript, Vitest (`yarn test`), `*.verify.ts` (`yarn verify`), Storybook, `yarn generate-world`.

**Spec:** `docs/superpowers/specs/2026-10-29-carve-engine-design.md`. Also read
`docs/superpowers/specs/2026-10-29-room-prefabs-design.md` and `docs/instructions/carve-passes.md`.

## Global Constraints

- Until Task 9, `LATTICE_ENGINE` output stays byte-identical. Check it with the per-floor digest over every shipped
  floor (`carvedFloorDigest`, `src/data/tierFingerprints.ts:24`), compared to a baseline captured before Task 1.
- One rule at every tier, no per-tier exceptions; protect a case with a guard, not a carve-out.
- Deterministic from the site's address seed. Embed and plan picks draw from their own stream
  (`mulberry32(prep.input.seed ^ SALT)`), never from `state.rand`, so the passes' draw order is untouched.
- Mod off = same carve, bare nodes, open corridors. Block sizes come from structural fields only (claims floor,
  prefab, wide), never from an encounter or a mod.
- Core never names a mod. `src/ui` takes props only, with stories. Strings in nl + en.
- Tests use made-up floors, rooms and locks. Never pin authored content.
- Comments describe current state only. Commits are one line `type: what changed`, then a blank line and the two
  attribution lines from the ledger. Changelog entries are one line.
- Every bake and verify runs under `timeout 900`. Verify by looking (Storybook or app screenshots), not by grep.
- Never weaken a check. Never hand-edit baked numbers. Never use bare `git stash` or `git pull`. Push is allowed;
  never merge or open a PR.
- A lock the engine refuses may become `<name>-blocked.lock` only as an exception. Report it with its reason; never
  use it to get round a hard case.

## Review Focus

1. **The smallest floor** (an entrance, one stop, the exit, no side paths) embeds into a valid grid. Owner: Task 5.
2. **A drop and a wide corridor that meet.** The drop keeps its exact run, and the wide
   corridor narrows where it meets the drop. Owner: Task 7.
3. **A prefab named with `min` whose door places miss one of the node's edge sides** is not chosen there, and when
   no node fits, the refusal names the room. Owner: Task 4.
4. **The same floor with a mod off embeds to the same `dirs`.** Owner: Task 6 (`toggleOff.verify.ts` under
   `ROOMS_ENGINE`).
5. **The same seed carves the same embed twice**, and a different seed moves only the embed, not the topology.
   Owner: Task 5.

---

### Task 1: Engine seam

**Files:**
- Create: `src/game/carve/engines.ts`
- Modify: `src/game/carve/carveFloor.ts`, `src/game/carve/assembleFloor.ts`
- Test: `src/game/carve/engines.spec.ts`

**Interfaces:**
- Produces:
  - `type Engine = { passes: readonly PassEntry[]; finish: Finish; firstRung: (prep: FloorPrep) => Rung; climb: (prep: FloorPrep, attempt: number, rung: Rung) => Rung }`
  - `LATTICE_ENGINE: Engine`, built from today's `PASSES`, `finishAttempt`, `firstRung` and `climb`.
  - `CARVE_ENGINE: Engine`, set to `LATTICE_ENGINE` until Task 9.
  - `carveFloor(prep, engine: Engine)`.
  - `assembleFloor(..., options?: { engine?: Engine })`, which defaults to `CARVE_ENGINE`.

- [ ] **Step 0: Capture the baseline.** Write `scripts/carveDigests.ts` (`yarn carve-digests`). It prints
  `floorRef sha256` for every shipped floor, using `carvedFloorDigest` over `worldFloorCarve`. Save the output to
  `<sdd workspace>/baseline-digests.txt`. Run it under `timeout 900`. Later tasks diff against this file.
- [ ] **Step 1: Write the failing test.** `engines.spec.ts`:
  - `"carveFloor runs the engine's passes and finish"`: a fake engine whose one pass writes a marker and whose
    finish returns a grid; assert the grid comes back.
  - `"assembleFloor takes an engine override"`.
- [ ] **Step 2:** Run `yarn test src/game/carve/engines.spec.ts`. It must fail.
- [ ] **Step 3: Implement.**
  - `carveFloor` reads `engine.firstRung` and `engine.climb` in place of the imports.
  - `assembleFloor` passes `options.engine ?? CARVE_ENGINE` to both carves (the stub retry too).
- [ ] **Step 4:** Run `yarn test` and `yarn carve-digests`. Diff against the baseline: it must be empty.
- [ ] **Step 5: Commit** `refactor: carve takes an engine`.

### Task 2: Shape knobs in the DSL

**Files:**
- Modify: `src/worldGen/dsl.ts` (`FloorConstraint` near `:334`, pyramid near `:487`, `NodeSelector` `:67`),
  `src/worldGen/types.ts:134`, `src/worldGen/configBuilder.ts:273`, `src/worldGen/buildSite.ts` (alongside
  every `corridorStraightness` site: `:63`, `:128`, `:175`, `:419`, `:478`, `:621`, `:808`),
  `src/worldGen/serializer.ts:227`, `src/game/siteTypes.ts` (`FloorConfig` and `RoomCell`), and the room-spec
  path that carries `pinnedPrefab` today, from `NodeSelector.room` to `RoomCell.pinnedPrefab`.
- Test: `src/worldGen/shapeKnobs.spec.ts`

**Interfaces:**
- Produces:
  - `FloorConfig.plan?: PlanKind`
  - `FloorConfig.spread?: number` (0 = compact, 1 = sprawling; default `DEFAULT_SPREAD = 0.3` in
    `src/game/carveConstants.ts`)
  - `FloorConfig.corridorWidth?: 2`
  - `NodeSelector.width?: 2`, which reaches `RoomCell.wideWayIn?: true`: the corridor arriving at that node, from
    the way in, is wide.
  - `type PlanKind = "axis" | "meander" | "spiral"`, exported from `src/game/carve/floorPlans.ts`. Task 2 creates
    the file with the type only.
- Each knob is authored at pyramid and at floor level, the same way `corridorStraightness` is. The floor wins.
- No `windyChance`-style roll for the new knobs.

- [ ] **Step 1: Write the failing test.**
  - `"a pyramid's spread reaches every floor's config, a floor's own wins"`.
  - The same test for `plan` and for `corridorWidth`.
  - `"a node selector's width marks that node's room wideWayIn"`.
  - Use made-up specs.
- [ ] **Step 2:** Run it. It must fail.
- [ ] **Step 3:** Implement, following the `corridorStraightness` flow site by site.
- [ ] **Step 4:** Run `yarn test`, then `timeout 900 yarn generate-world` and `yarn carve-digests`. The diff must be
  empty, because nothing is authored yet and the lattice engine reads none of the knobs.
- [ ] **Step 5:** Add the knobs to `docs/instructions/` next to where `corridorStraightness` is documented (find it
  with `grep -rn corridorStraightness docs`).
- [ ] **Step 6: Commit** `feat: plan, spread and corridor width in the DSL`.

### Task 3: Floor plans

**Files:**
- Modify: `src/game/carve/floorPlans.ts`, `src/game/carve/growMaze.ts`, `src/game/carve/state.ts` (CarveState key
  `plan`)
- Create: `src/game/carve/pickPlan.ts`
- Modify: `src/game/carve/engines.ts` (add `ROOMS_ENGINE`, whose passes are `[pickPlan, ...PASSES]`; its finish is
  `finishAttempt` until Task 6)
- Test: `src/game/carve/floorPlans.spec.ts`

**Interfaces:**
- Produces:
  - `FLOOR_PLANS: Record<PlanKind, { straightness: number; turnBias: number }>`. The first set is:
    - axis `{ straightness: 0.95, turnBias: 0 }`
    - meander `{ straightness: 0.3, turnBias: 0 }`
    - spiral `{ straightness: 0.6, turnBias: 0.8 }`
  - `turnBias`: in growMaze's DFS, the chance that a turn goes the same rotational way as the last turn.
  - pass `pickPlan` writes `state.plan: PlanKind`. It takes `config.plan` if authored. Otherwise it picks from the
    seed's own stream `mulberry32(seed ^ 0x9e3779b9)`, uniformly over `FLOOR_PLANS`.
- `growMaze` reads `state.plan` when present. With `plan` present, the plan's straightness is used unless the floor
  authors `corridorStraightness`. With `plan` absent (`LATTICE_ENGINE`), growMaze behaves exactly as today.
- Declare `plan` as an optional read so the pass wrapper accepts its absence. Extend `requireReads`/`pass()` in
  `state.ts` with an optional-reads list if none exists.

- [ ] **Step 1: Write the failing tests.**
  - `"an authored plan is the one picked"`.
  - `"an unauthored plan is picked from the seed, the same twice"`.
  - `"spiral turns one way more often than meander"`: count same-rotation turns over a made-up 21×21 maze, 50
    seeds; assert spiral > meander.
  - `"pickPlan draws nothing from state.rand"`: wrap `rand` in a counter.
- [ ] **Step 2:** Run the tests. They must fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `yarn test` and `yarn carve-digests`. The lattice engine's diff must be empty.
- [ ] **Step 5: Commit** `feat: floor plans steer the sketch`.

### Task 4: Choose prefabs on the sketch

**Files:**
- Modify: `src/game/carve/placePrefabs.ts`
- Test: `src/game/carve/placePrefabs.spec.ts` (extend)

**Interfaces:**
- Produces:
  - `type PrefabChoice = { cell: Cell; name: string; layout: number; mirrored: boolean; pick: PrefabPick }`
  - `choosePrefabs(prep: FloorPrep, grid: FloorGrid): Refusal | PrefabChoice[]`: eligibility (holds, stood-on,
    empty dead end), centrality, min/max, pinned rooms and door sides. A choice needs a door place on every side
    the node has an exit. No space test. Same refusal text as today when `min` cannot be met.
  - `stampPrefab(grid: FloorGrid, choice: PrefabChoice, rect: CellRect, prep: FloorPrep): FloorGrid`: furnish and
    draw at a given rect (today's `fitPrefab` drawing).
  - `placePrefabs` stays for `LATTICE_ENGINE`, rebuilt as `choosePrefabs` plus the existing fit plus `stampPrefab`,
    with byte-identical output.

- [ ] **Step 1: Write the failing tests.**
  - `"choosePrefabs skips a node whose exit side has no door place"`.
  - `"a min the sketch cannot meet refuses naming the room"`.
  - `"stampPrefab draws the room at the rect it is given"`.
  - Use made-up prefabs.
- [ ] **Step 2:** Run the tests. They must fail.
- [ ] **Step 3:** Split the code.
- [ ] **Step 4:** Run `yarn test` and `yarn carve-digests`. The diff must be empty.
- [ ] **Step 5: Commit** `refactor: prefabs are chosen apart from where they fit`.

### Task 5: The embed

**Files:**
- Create: `src/game/carve/embed/embedFloor.ts`, `src/game/carve/embed/blocks.ts`, `src/game/carve/embed/route.ts`
- Test: `src/game/carve/embed/embedFloor.spec.ts`

**Interfaces:**
- Consumes: `PrefabChoice` (Task 4), and `FloorConfig.spread` and `corridorStraightness`.
- Produces:
  - `embedFloor(lattice: FloorGrid, opts: EmbedOptions): { grid: FloorGrid; prefabRects: Map<CellKey, CellRect>; report: EmbedReport }`
  - `EmbedOptions = { seed: number; spread: number; straightness: number; rooms: Map<CellKey, { rows: number; cols: number }> }`. `rooms` holds the prefab sizes by sketch node, with the ring included.
  - `EmbedReport = { rows: number; cols: number; longestRoomToRoom: number }`

**The algorithm.** It is pinned here because the tests do not determine it:
1. **Node blocks.** Each lattice node `(r, c)` with r and c even gets a footprint:
   - a prefab: its ring rect (`rooms`);
   - a plain room that claims floor (`claimsFloorAt`, `src/game/roomFootprint.ts`): 3×3, the room cell at the
     centre and the ring kept empty;
   - any other node (a stop, a corridor turn, a door): 1×1.
2. **Row heights and column widths.** Each lattice row's block height is the largest footprint height in it, and
   each column's width likewise. Lattice rows and columns that hold no non-empty node are dropped.
3. **Gaps.** Each boundary between two adjacent kept rows (and columns) gets
   `gap = 1 + round(spread * GAP_RANGE * u)`, with `GAP_RANGE = 6` and `u` from the embed stream in `[0.5, 1.5)`.
   One exception: a boundary crossed by a drop edge gets `gap = oneWayRunCells(dir)` exactly. `oneWayRunCells` is
   in `carveConstants.ts`.
4. **Jitter.** Inside its block, each footprint is offset by a seeded amount within the slack. A 1×1 node on the
   main path with both of its exits on one axis is not jittered across that axis, so a run of stops stays a
   straight corridor.
5. **Routes.** Each lattice edge is routed inside its band: the gap cells between the two blocks, spanning both
   blocks' extent across the gap.
   - The corridor leaves each footprint on the side facing the other node. For a prefab it leaves at the door place
     `choosePrefabs` picked.
   - With chance `1 - straightness` it bends once (a Z), at a seeded column or row inside the gap. Otherwise it
     runs straight when the two ends line up, and makes the smallest Z when they do not.
   - Drop edges never bend, and every gap cell of a drop edge carries the lattice run's `obstacle`.
6. **Copying.** Each lattice node's cell, with every field, is copied to its footprint's centre (or to the prefab's
   stop node cell, as `fitPrefab` does today). Corridor cells take the lattice connector's labels. `dirs` are
   recomputed from the routes. `exits` and `entrancePos`/`exitPos` are carried by node.
7. `rows` and `cols` of the result are free, and need not be equal.

- [ ] **Step 1: Write the failing tests** on made-up lattice grids built with `src/game/carve/carveFixtures.ts`:
  - `"every lattice node keeps its neighbours"`: the node adjacency graph over walkable cells is equal before and
    after.
  - `"every dirs is mutual"`.
  - `"spread 0 makes every gap one cell"`.
  - `"a claiming room keeps an empty ring"`.
  - `"a prefab node gets its rect and its corridors meet its door places"`.
  - `"a drop edge stays straight with its exact run"`.
  - `"the smallest floor embeds"` (Review Focus 1).
  - `"the same seed embeds the same; another seed moves only cells, not the node graph"` (Review Focus 5).
  - `"the report names size and longest room-to-room corridor"`.
- [ ] **Step 2:** Run `yarn test src/game/carve/embed`. It must fail.
- [ ] **Step 3:** Implement. Mark the known ceiling at the top of `blocks.ts` with:
  `// ponytail: per-row/column gaps keep rows aligned; upgrade to per-node compaction if floors read as a grid`.
- [ ] **Step 4:** Run `yarn test`. It must pass.
- [ ] **Step 5: Commit** `feat: embed a sketched floor into real space`.

### Task 6: The rooms engine carves every floor

**Files:**
- Modify: `src/game/carve/engines.ts` (`ROOMS_ENGINE.finish`), `src/game/carve/passes.ts` (export the tail pieces),
  `src/game/standPieces.ts` / `sequenceTiles.ts:137` (port the parity check to the node set),
  `src/game/carve/placePrefabs.ts:75` (`emptyDeadEnd`, same port), and every consumer that assumes
  `rows === cols` (`grep -rn "\.rows" src/app/SiteMap src/game | grep cols`).
- Modify: `scripts/layoutPicker.ts` (report section: size and longest corridor per floor), and
  `src/app/SiteMap/SiteMapBuilder.stories.tsx` (an `engine` control: lattice | rooms).
- Test: `src/game/carve/roomsEngine.spec.ts`, plus `CARVE_ENGINE_OVERRIDE=rooms` support in `bakedCarve.verify.ts`
  and `toggleOff.verify.ts`. Pick the engine from the env in one helper, `engineFromEnv()` in `engines.ts`, used by
  verify files only.

**Interfaces:**
- `ROOMS_ENGINE.finish`, in this order:
  1. `requireReads`
  2. `choosePrefabs`
  3. `render`
  4. `embedFloor`
  5. `validate`
  6. `standPieces`
  7. `finish`
  8. `stampPrefab` for each choice at its `prefabRects` rect
- `ROOMS_ENGINE.climb` is today's `climb`: the sketch may grow, and that growth is invisible. `firstRung` uses
  `DEFAULT_PACKING`, whatever the config says.

- [ ] **Step 1: Write the failing tests.**
  - `"rooms engine carves a made-up lock floor and its lock walk passes"`.
  - `"its lesson order holds"`.
  - `"a pinned prefab stands at its node"`.
- [ ] **Step 2:** Run the tests. They must fail.
- [ ] **Step 3:** Implement and port the parity checks.
- [ ] **Step 4:** Run `CARVE_ENGINE_OVERRIDE=rooms timeout 900 yarn verify bakedCarve toggleOff`. Every shipped
  floor must pass the hard criteria, and mod-off must give the same `dirs` (Review Focus 4).
  - A floor that fails is fixed in the engine.
  - A designer lock that still fails after a real attempt goes to the ledger with its reason. It is renamed in
    Task 9, never here.
- [ ] **Step 5: Look.** Run Storybook `SiteMapBuilder` with the rooms engine. Screenshot one floor per tier and one
  cave into the scratchpad, and check rooms have space and corridors join them.
- [ ] **Step 6: Commit** `feat: rooms engine carves every floor`.

### Task 11: Graph and layout (runs after Task 6, before Task 7)

The block embed of Task 5 stretched the lattice's rows and columns. The designer looked at it (starter_1#1#0: 40×48
against 25×25 on LATTICE, small rooms far apart, long empty corridors, a grid look) and chose a real layout stage
(spec, "Three stages: graph, layout, carve"). This task replaces the inside of `embedFloor`. Its signature,
`EmbedOptions`, `Embedded` and `longestRoomToRoom` stay, so the Task 6 wiring (`passes.ts:156`, `layoutPicker.ts`)
is untouched.

**Files:**
- Create: `src/game/carve/embed/graph.ts` (sketch → graph), `src/game/carve/embed/layout.ts` (place and compact),
  and `src/game/carve/embed/carveLayout.ts` (layout → grid).
- Modify: `src/game/carve/embed/embedFloor.ts`, which becomes `carveLayout(layoutFloor(floorGraph(…)))` plus the
  report.
- Delete: `src/game/carve/embed/blocks.ts` and `route.ts`, with their tests.
- Test: `src/game/carve/embed/{graph,layout}.spec.ts`; `embedFloor.spec.ts` keeps every test that still states a true
  claim.
- Create: `scripts/layoutMeasure.ts` (`yarn layout-measure`). It carves every shipped floor with `ROOMS_ENGINE` and
  prints per floor: rooms size, LATTICE size, area ratio, longest room-to-room walk and layout attempts used. It ends
  with a summary line.

**Interfaces:**
- `floorGraph(lattice: FloorGrid, rooms: ReadonlyMap<CellKey, EmbedRoom>): FloorGraph`.
  - **Pieces:**
    - every claiming room is a block: `claimsFloorAt`, 3×3 with its ring;
    - every prefab is a block: its `EmbedRoom`;
    - a lock keeps its behaviour, not its shape (designer, 2026-10-30): its rooms, stops and corridors are laid out
      like any other piece, and its walk is checked after the carve. Only cells a mechanism needs next to each other
      (a `transitions` or `underfoot` cell beside its node) stay together, as small a group as possible;
    - the entrance and the exit are blocks.
  - **Strings:** each maximal chain of corridor cells and 1×1 nodes (stops, turns, doors, gates) between two pieces
    is one string, holding its nodes in order.
  - **Drops:** a drop is a string with a fixed straight run, `oneWayRunCells(dir)`, and no bend.
- `layoutFloor(graph: FloorGraph, opts: EmbedOptions): Layout | { refused: string }`.
  - `Layout` holds each block's top-left, and each string's polyline as orthogonal corner cells.

**The algorithm.** It is pinned here because the tests do not determine it:
1. **Order.** The main path from the entrance to the exit first, then each side subtree depth-first, in the graph's
   order.
2. **Place.** Each piece hangs on its parent through a string.
   - The string leaves the parent's block at a door place: a prefab's marked place, or the middle of a side of a
     plain block. It reaches the child's facing door place.
   - Its length is at least the cells its nodes need at today's pitch: 2 per node, plus 1. `spread` adds
     `round(spread * GAP_RANGE * u)` cells, with `GAP_RANGE = 6` and `u` in `[0.5, 1.5)`.
   - It runs straight. With chance `1 - straightness` it takes one bend (an L) or two bends (a Z); the bend positions
     are seeded.
   - Candidates (side, door place, shape) are tried in seeded order. The first one whose cells and blocks are free
     wins. "Free" means: no cell is used, and no cell is orthogonally next to a used cell of another piece or string,
     except where the string meets its own two pieces.
3. **Compact.** In a fixed order, try to slide each subtree (a piece and everything hung below it) one cell toward its
   parent on each axis. That shortens or reshapes its string, never below its minimum length, and only while every
   cell stays free. Repeat until no move succeeds.
4. **Retry.** A piece with no free candidate re-places its subtree, up to 8 times. After that, the floor lays out again
   from `seed ^ attempt`, up to 16 attempts. Past both caps it returns `{ refused }`, naming the node, and
   `embedFloor` turns that into the existing retry reason.
5. **Cycles.** Measure first whether any shipped floor's graph has a cycle.
   - If none does: a cycle is refused with a clear reason, and a test pins that refusal.
   - If some do: lay each cycle as one closed piece, both arms grown from one parent and joined.
6. **Carve.**
   - Blocks copy their lattice cells: rooms keep every field; a rigid lock region keeps its spacing.
   - Strings become corridor cells with the lattice connector's labels. Each node of a string sits on its polyline in
     order, spaced evenly.
   - `dirs` follow the polylines. `exits`, `entrancePos` and `exitPos` are carried by node.
   - The result is trimmed to its bounding box plus a 1-cell margin.

- [ ] **Step 1: Measure the before.** Write `scripts/layoutMeasure.ts`, run it on HEAD (the block embed), and keep
  the output in the report.
- [ ] **Step 2: Write the failing tests**, on made-up sketches built with `carveFixtures.ts`:
  - `"a chain of stops between two rooms becomes one string holding them in order"`.
  - `"a lock.s rooms and stops are laid out freely and its walk still passes"` (made-up lock).
  - `"no string runs beside another string or a block it does not join"`, over 200 seeds of a made-up floor with
    four side paths.
  - `"compaction never leaves a string shorter than its nodes need"`.
  - `"a drop keeps its exact straight run"`.
  - `"the same seed lays out the same; another seed moves pieces, not the graph"`.
  - `"a floor that cannot be laid out is refused, naming the node"`.
  - Keep `"every lattice node keeps its neighbours"`, `"every dirs is mutual"` and `"the smallest floor embeds"`.
- [ ] **Step 3:** Run `yarn test src/game/carve/embed`. The new tests must fail.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run the gates:
  - `yarn check-types`, `yarn lint`, `yarn test`;
  - the digests equal the baseline (LATTICE is untouched);
  - `CARVE_ENGINE_OVERRIDE=rooms timeout 900 yarn verify bakedCarve toggleOff`, plus the STRUCTURAL sweep. At least
    the floors that passed at 091f37c5 still pass. List every floor that newly fails or newly passes.
- [ ] **Step 6: Measure the after.** Targets:
  - the median rooms/LATTICE area ratio over all shipped floors is at most 1.2;
  - every starter floor is at most 1.3;
  - the longest room-to-room walk drops clearly;
  - layout refusals are at most 1% of attempts.

  A target that cannot be met is reported with the reason; no check is bent.
- [ ] **Step 7: Commit** `feat: floors are laid out as a graph before they are carved`.

### Task 7: Wide corridors

**Files:**
- Modify: `src/game/siteTypes.ts` (`CorridorCell.shoulder?: Direction` and `RoomCell.shoulder?: Direction`, the side
  the corridor's second lane lies on), `src/game/carve/embed/layout.ts` and `carveLayout.ts` (Task 11). A wide string reserves two lanes, and its 1-cell
  margin lies outside both.
- Modify: the map's walker and stop positions in `src/app/SiteMap` (`roomWalk.ts`, the explorer position, and the
  marker/tap target placement). These read `shoulder` and draw half a cell toward it. The second lane's cell is
  drawn as corridor floor and is never a walk step.
- Test: `src/game/carve/embed/wide.spec.ts`, plus a `WideCorridor.stories.tsx` in `src/app/SiteMap`.

**Interfaces:**
- An edge is wide when `config.corridorWidth === 2`, or when its far node (seen from the way in) has `wideWayIn`.
- The second lane is a `CorridorCell` with `dirs` empty, `shoulderOf: CellKey` (the lane cell it widens), and the
  same labels. Walks never enter it.
- **Narrowing, one rule:** no second lane beside a cell that is a door (`requiredKeyId`), a gate, a drop or zipline
  run cell (`obstacle`), a cell next to one of those, or a narrow passage (`passage`).

- [ ] **Step 1: Write the failing tests.**
  - `"a wide floor gives every corridor a second lane"`.
  - `"the lane narrows to one cell at a door and at a drop"` (Review Focus 2: a drop and a wide corridor across one
    boundary).
  - `"a node selector widens only the corridor into that node"`.
  - `"walks never step on a second lane"`.
- [ ] **Step 2:** Run the tests. They must fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `yarn test`, then `CARVE_ENGINE_OVERRIDE=rooms timeout 900 yarn verify bakedCarve`.
- [ ] **Step 5: Look.** Screenshot `WideCorridor.stories.tsx`: the explorer and the stop markers sit on the centre
  line, and the corridor narrows at the door.
- [ ] **Step 6: Commit** `feat: wide corridors walk their centre line`.

### Task 8: Caverns (deferred)

Deferred (designer, 2026-10-30: "3x3 houden voor nu, ik wil na de werkende engine pas de content gaan doen"). Caves keep
3×3 rooms on the rooms engine; caverns come with the cave content.


**Files:**
- Create: `src/game/carve/embed/cavern.ts`
- Modify: `src/game/carve/embed/graph.ts` (Task 11: the block size of a claiming room)
- Test: `src/game/carve/embed/cavern.spec.ts`

**Interfaces:**
- `cavernRoom(node: Cell, block: CellRect, seed: number): PrefabRoom`. A generated room with no objects: a
  seeded blob of free cells round the node inside a block of 5×5, ring included. Its door places are where the
  routes meet it, its stop is the node, and its `blocked` cells are the rest of the block.
- Rule: a plain room that claims floor on a floor whose `tileset` is `"cave"` takes a cavern block (5×5) in place
  of the 3×3. Tileset is data, so this is the one rule, not a carve-out.
- The sunlit cavern stays the journey exterior it is today. Its prefab is content, for the cave release.

- [ ] **Step 1: Write the failing tests.**
  - `"every cavern cell is reachable from every door"`.
  - `"the stop is the node"`.
  - `"the same seed gives the same cavern"`.
  - `"a non-cave floor gets no caverns"`.
- [ ] **Step 2:** Run the tests. They must fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `yarn test`, then `CARVE_ENGINE_OVERRIDE=rooms timeout 900 yarn verify bakedCarve`.
- [ ] **Step 5: Look.** Screenshot a cave floor in `SiteMapBuilder` with the rooms engine.
- [ ] **Step 6: Commit** `feat: caves carve caverns`.

### Task 9: The swap

**Files:**
- Modify: `src/game/carve/engines.ts` (`CARVE_ENGINE = ROOMS_ENGINE`; delete `LATTICE_ENGINE`,
  `engineFromEnv`, the override env, the story control and `placePrefabs`' lattice fit).
- Remove packing:
  - DSL: `packing`, `packingChance`, `packingWhenHit`, per-lock `floorLocks` packing (`dsl.ts:336,493-500,518`).
  - Types and config: `types.ts:135`, `serializer.ts:228`, `buildSite.resolvePacking` and its readers,
    `configBuilder.ts:274,318-324,424`, `spec/locks/onFloor.ts:72`, `GLOBAL_DEFAULTS.packingWhenHit`.
  - Authored values: `spec/expert.ts:140,206,211,350`, `spec/junior.ts:98`, `spec/master.ts:113`,
    `spec/wizard.ts:95`.
  - `FloorConfig.packing`, and `sectionHash.carveShape`'s packing.
  - The bake: `carveSeedSearch.ts` packing loop (the search becomes seed × side-path stage),
    `layoutPicker.ts` packing, `buildWorldConfigs.ts:43-59`, `tierFingerprints.ts:40`.
  - Fixtures.
  - The ladder keeps `DEFAULT_PACKING` as the sketch's internal slack.
- Modify: `docs/instructions/carve-passes.md` (the engine and the embed),
  `docs/instructions/room-prefabs.md` (prefabs are chosen on the sketch and stamped after the embed), and
  `CHANGELOG.md` (`## Unreleased`, one line: `Floors are laid out as rooms joined by corridors`).

- [ ] **Step 1:** Flip the engine and remove packing. `yarn tsc` must be clean.
- [ ] **Step 2:** Run `timeout 900 yarn generate-world`. Then run `timeout 900 yarn verify`, `yarn test` and
  `yarn lock`. Check `docs/game-design/lock-placement.md`'s "Placed N of N" has not dropped.
  - A designer lock the engine still refuses after a real engine fix becomes `<name>-blocked.lock`. Do not edit it.
    Record it with its reason in the ledger and the report.
- [ ] **Step 3:** `starterCarve.verify.ts` and `tierFingerprints.verify.ts` fail on purpose. Do not re-snapshot
  them; Task 10 does that.
- [ ] **Step 4: Commit** `feat: floors are laid out as rooms joined by corridors`. Push.

### Task 10: The designer looks (controller, not a subagent)

- [ ] **Step 1:** Screenshot every starter floor in the app, plus one floor per other tier and one cave, into the
  scratchpad. Send them to the designer with the bake report's size and longest-corridor lines.
- [ ] **Step 2:** Stop for the designer's verdict. Ledger every change they ask for as a follow-up task.
- [ ] **Step 3:** After approval, re-snapshot `src/data/starterCarve.json` and `tierFingerprints.json`. This
  finishes room-prefabs Task 12 step 5.
- [ ] **Step 4: Commit** `test: starter carve snapshot on the rooms engine`. Push.
