# Room Prefabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Designed rooms (`.room` text files) that the carve places on a floor — by DSL count and centrality, or
pinned to a story node — with their places filled per room, walked through naturally, and starter's rooms built
from them.

**Architecture:** A `.room` file parses to a `Prefab` (pure, `src/game/prefab*.ts`) and is checked on its own for
every variant and fill. World-gen resolves the DSL's prefab names into the floor config, so the carve (which runs in
the browser too) carries the parsed prefabs. A new step at the end of each carve attempt fits prefabs over existing
rooms, absorbing void and the node's straight arms, fills the places by hash and writes one `PrefabRoom` record on
the node cell; a floor short of a prefab's `min` retries the attempt. The map draws, claims and walks a prefab room
from that record. "Centre piece plus one ring" (`growRooms`, `GrownRoom`, centre kinds) is removed: a centre piece is
a small prefab.

**Tech Stack:** TypeScript, Vitest (`*.spec.ts` mechanics, `*.verify.ts` built world), React map layers, Storybook,
tsx bake scripts.

**Spec:** `docs/superpowers/specs/2026-10-29-room-prefabs-design.md` (builds on
`docs/superpowers/specs/2026-10-28-room-walk-paths-design.md`). File:line pointers below were mapped on 2026-10-29.

## Global Constraints

- One rule at every tier, no per-tier exceptions; protect a case with a guard, not a carve-out.
- A prefab takes over a room the floor already has; it never adds one, never changes a cell's `type` or `dirs`.
- Only rooms the DSL names become prefabs; every other room stays as today.
- `min` is hard (bake refuses with a clear message); between min and max the carve places as many as fit.
- What stands on a place is decided only by the `.room` file (kinds or a named list); no code pool or tag.
- Placement draws no `prep`/`state.rand` value: picks hash `siteId` + cell key, so floors with no prefab carve
  byte-identically.
- Saves are keyed by authoring address and slot: no save migration.
- Tests never pin authored content: engine tests use made-up prefabs; real `.room` files are checked in
  `*.verify.ts` and by `yarn room`.
- Core names no mod; `src/ui` takes props only, with stories; strings nl + en.
- Comments describe current state only; commits one line `type: what changed` plus the session trailer.
- Every bake and verify runs under `timeout 900`; never hand-edit baked numbers; never weaken a check.

## Review Focus

1. A prefab rect that would cover another claiming room's 3×3, a stair, a puzzle stop, a mechanism cell, a corridor
   that is not the node's own straight arm, or a web door — must not be placed (Task 6 test "never covers…").
2. A mirrored layout: doors, wall places (still on the north row), wall items and ground sprites (flipped) all land
   on the mirrored side (Task 2 and Task 7 tests).
3. A node whose arm leaves through a cell that is not a door place, or a door place left unused: the first refuses
   the fit, the second draws wall (Task 6 tests).
4. A floor that never reaches a prefab's `min` in any attempt fails with a reason naming the floor, the room and the
   count — not a silent smaller floor (Task 6 + Task 4 tests).
5. A prefab room that is fogged or partly hidden draws none of its objects until lit (Task 7 test).

---

### Task 1: The `.room` notation and parser

**Files:**

- Create: `src/game/prefabTypes.ts`, `src/game/prefabNotation.ts`
- Modify: `src/game/siteTypes.ts:145` (`PropFootprint` gains `ground?: true`; a kind's footprint is the one source
  of its size — the `.room` file states none)
- Test: `src/game/prefabNotation.spec.ts`

**Interfaces:**

- Produces (in `prefabTypes.ts`):
  ```ts
  export type PlaceLayer = "wall" | "floor" | "ground" | "wallItem"
  export type SpecialPlace = "stop" | "actor" | "chest" | "portal" | "mechanism"
  export type PlaceKind = DecorationKind | WallDecorationKind | "patron"
  export type PlaceDef = {
    letter: string
    layer: PlaceLayer
    optional: boolean
    kinds: readonly PlaceKind[] // named lists already expanded
    cols: number
    rows: number // footprint, from the drawing
    group?: { take: number; of: number; per?: string } // "3 of 4", "1 of 3 per q"
  }
  export type PrefabLayout = {
    name: string // "" for the first, "turned" etc.
    cells: readonly string[] // the drawn rows, spaces removed, wall ring included
  }
  export type Prefab = {
    name: string
    tier: Difficulty
    activity?: ActivityId
    mirror: boolean
    designedBy?: string
    layouts: readonly PrefabLayout[]
    places: Readonly<Record<string, PlaceDef>>
    specials: Readonly<Record<string, SpecialPlace>> // letter → special
  }
  ```
- Produces (in `prefabNotation.ts`): `parsePrefab(text: string, name?: string): Prefab` — throws
  `Error("line N: …")` like `parseLock` (`src/game/lockNotation.ts:244`); `PREFAB_SYNTAX: string` help text.

The notation (spec "The file format", plus decisions taken there):

- `//` comments; `// designed by: <name>` header read into `designedBy` (as `lockNotation.ts:60`).
- Header lines `room <name>`, `tier <difficulty>`, `activity <ActivityId>` (optional), `mirror` (optional).
- `<list> = kindA | kindB` declares a named list.
- `layout [name]` then grid rows: one character per cell, separated by single spaces. Fixed signs `#` wall,
  `d` door place, `.` free floor. Ring = outermost row/col; `d` and wall-item letters only on the ring; every
  other letter only inside.
- Legend lines `<letter> <layer>[?] <kind|list>[ | …] [K of N [per <letter>]]`, or `<letter> <special>`.
  `?` marks optional. A place has no size of its own: every kind it lists has the footprint of its drawn blob in `DECORATION_FOOTPRINTS` (a kind flagged `ground` there fits only a `ground` place), else the line is refused.
- Exactly one `stop` letter per layout, inside, on free floor. `wall` places only on the first inside row.
- Every listed kind is a known `DecorationKind`/`WallDecorationKind` (or `patron` for floor places) and its
  `decorationFootprint` equals the place's footprint; `wallItem` takes `WallDecorationKind`s only.

- [ ] **Step 1: Write the failing tests** (`prefabNotation.spec.ts`, made-up prefabs only):
  - `parses a hall with pillars, a 2x2 piece, a wall item and a stop` — asserts `layouts[0].cells.length`,
    `places.p.kinds` equals `["pillar","patron"]`, `places.T` cols/rows `2`/`2`, `specials.s === "stop"`.
  - `expands a named list on a place` — `gift = jarRack | basin` then `g floor? gift 3 of 4` → `kinds`
    `["jarRack","basin"]`, `optional true`, `group {take:3, of:4}`.
  - `reads a per-group` — `r floor? rubblePile 1 of 3 per q` → `group.per === "q"`.
  - `reads mirror and a second named layout`.
  - refusals, each `toThrow(/line \d+: /)`: unknown kind; a `d` inside the ring; a wall place below the first
    inside row; two stops; no stop; a listed kind whose footprint differs from the drawing, or a `ground`-flagged kind on a non-ground place; a letter used but never declared; a
    `wallItem` with a floor kind.
- [ ] **Step 2: Run** `yarn vitest run src/game/prefabNotation.spec.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** `parsePrefab` and `PREFAB_SYNTAX` in `src/game/prefabNotation.ts`, line-based like
      `parseLock`.
- [ ] **Step 4: Run** the spec — PASS.
- [ ] **Step 5: Commit** `feat: room prefab notation`.

### Task 2: Variants, fills and the prefab check

**Files:**

- Create: `src/game/prefabChecks.ts`
- Test: `src/game/prefabChecks.spec.ts`

**Interfaces:**

- Consumes: `Prefab`, `PlaceDef` (Task 1).
- Produces:
  ```ts
  export type PlacedObject = { letter: string; top: number; left: number; rows: number; cols: number }
  export type Variant = { layout: number; mirrored: boolean; cells: readonly string[] }
  export type Fill = ReadonlyMap<string /* "top,left" of a place blob */, true>  // the filled blobs
  export const variantsOf = (prefab: Prefab): Variant[]       // each layout, plus its mirror when `mirror`
  export const placeBlobs = (variant: Variant, prefab: Prefab): PlacedObject[]   // one per drawn blob
  export const fillsOf = (variant: Variant, prefab: Prefab): Fill[]              // every legal fill
  export const blockedCells = (variant: Variant, prefab: Prefab, fill: Fill): ReadonlySet<string>
  export const prefabFaults = (prefab: Prefab): string[]
  export const MAX_FILLS = 4096
  ```
- Blocking: a filled `floor` or `wall` blob, every `#`, and the `actor`/`chest`/`portal`/`mechanism` cells block;
  `ground`, `wallItem` (on the ring), `.`, `d`, `stop` do not. Mandatory places are always filled; an optional
  place without a group is filled or not; a group fills exactly `take` of its `of`; a `per` group fills `take` of
  the blobs touching (4-neighbour) each blob of the named letter, and a blob touching two counts for both.
- `prefabFaults` for every variant × fill: every pair of door places joined over free cells; the stop free and
  reached from every door; each special that blocks has a free 4-neighbour reached from every door. More than
  `MAX_FILLS` fills is a fault (`"too many fills to check"`), never a silent sample.

- [ ] **Step 1: Write the failing tests** (made-up prefabs as inline strings):
  - `mirrors doors, places and the stop` — a lopsided room; the mirrored variant's `d` columns and stop column are
    `cols-1-x`, and wall places stay on row 1.
  - `a 3 of 4 group yields 4 fills, all with 3 filled`.
  - `a per group fills one top per stump; a top touching two stumps counts for both` — assert every fill has
    exactly one filled `r` blob neighbouring each `q`.
  - `ground places never block` — a `ground` 1×2 across the only corridor; no faults.
  - `refuses a room whose pillar cuts two doors apart in one fill` — fault message names the layout, the fill and
    the doors.
  - `refuses a stop walled in by a filled optional place`.
  - `refuses past MAX_FILLS`.
- [ ] **Step 2: Run** `yarn vitest run src/game/prefabChecks.spec.ts` — FAIL.
- [ ] **Step 3: Implement**; flood fill over the variant's cells (4-neighbour).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: room prefab variants and check`.

### Task 3: The room catalogue, `yarn room`, and the authoring doc

**Files:**

- Create: `src/game/roomCatalogue.ts`, `src/game/roomCatalogue.spec.ts`, `src/game/rooms.verify.ts`,
  `scripts/room.ts`, `docs/instructions/room-prefabs.md`, `src/game/rooms/starter/.gitkeep`
- Modify: `package.json` (script `"room": "tsx scripts/room.ts"`), `AGENTS.md` (one line in key files)

**Interfaces:**

- Mirrors `src/game/lockCatalogue.ts` (node:fs, `here` from `fileURLToPath`, one folder per tier,
  `*-blocked.room` skipped, duplicate bare name throws).
- Produces: `roomEntriesIn(root: string): RoomEntry[]` with `RoomEntry = { name; tier; path; text }`;
  `ROOM_CATALOGUE: Readonly<Record<string, Prefab>>`; `findRoom(name: string): Prefab | undefined`;
  `catalogueRoom(name: string): Prefab` (throws when missing or `prefabFaults` is non-empty, like
  `src/worldGen/spec/locks/catalogue.ts:9`). The file's `tier` must equal its folder, else throw.

- [ ] **Step 1: Failing tests** in `roomCatalogue.spec.ts` on a temp dir with made-up rooms: reads tier folders;
      skips `-blocked`; throws on a duplicate name; throws on a tier header that disagrees with its folder;
      `catalogueRoom` throws on a faulty room.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5:** `rooms.verify.ts` — `it.each` over `ROOM_CATALOGUE`: `prefabFaults` is empty (no content
      pinned, only "every room passes its own check").
- [ ] **Step 6:** `scripts/room.ts` — no args: table of every room (tier, layouts, variants, fills, faults count);
      `yarn room <name>`: its faults, and each variant drawn with one sample fill; `--new <tier>/<name>` seeds a file
      with `PREFAB_SYNTAX` as comments. Run `yarn room` — prints an empty table.
- [ ] **Step 7:** `docs/instructions/room-prefabs.md` — the syntax (from `PREFAB_SYNTAX`), the check, how a DSL
      places a room (Task 4's fields), `yarn room`, the Storybook catalogue story (Task 9). Add the AGENTS.md line.
- [ ] **Step 8: Commit** `feat: room catalogue and yarn room`.

### Task 4: DSL and world config

**Files:**

- Modify: `src/worldGen/dsl.ts` (`NodeSelector :67`, `FloorConstraint :197`, `PyramidConstraint :333`,
  `resolveNodeField :110`), `src/worldGen/buildSite.ts:420-429,507,593,664`, `src/worldGen/sideSections.ts:90-110`,
  `src/worldGen/types.ts`, `src/game/siteTypes.ts` (`FloorConfig :628`, `SubSection :565`),
  `src/worldGen/serializer.ts:98-101,200-225`, `src/worldGen/validateWorldSpec.ts`,
  `src/game/carve/mainRooms.ts:113,138`, `src/game/carve/roomSpecs.ts:102,131`, `src/game/carve/state.ts:111`
- Test: `src/worldGen/dsl.spec.ts`, `src/worldGen/buildSite.spec.ts`, `src/worldGen/serializer` spec if present

**Interfaces:**

- Produces:
  ```ts
  // dsl.ts
  export type RoomPlacement = { room: string; min?: number; max?: number; central?: number } // central 0 = the ends, 1 = the middle
  NodeSelector.room?: string
  FloorConstraint.rooms?: RoomPlacement[]; PyramidConstraint.rooms?: RoomPlacement[]   // floor's own wins, like `chambers`
  export const resolveNodeRooms = (nodes, count): Record<number, string>
  // siteTypes.ts — FloorConfig and SubSection
  prefabs?: Record<string, Prefab>                 // every prefab this floor names, parsed
  prefabPlacements?: Required<RoomPlacement>[]     // defaults: min 0, max = min || 1, central 0.5
  prefabsByIndex?: Record<number, string>          // pinned, by node index
  // RoomSpec / RoomCell
  pinnedPrefab?: string
  ```
- World-gen resolves names with `catalogueRoom` (Task 3) and copies the parsed `Prefab` into `prefabs`, so the
  baked world carries them. `mainRooms`/`puzzleRoomSpec` write `pinnedPrefab` from `prefabsByIndex` as they do
  `authoredActivity`.
- `validateWorldSpec` refuses (`✗ …` lines, exit 1): an unknown room; a room whose `tier` is not the floor's
  difficulty; `min > max`; `central` outside 0–1.

- [ ] **Step 1: Failing tests:** `resolveNodeRooms` maps 1-based `where` like `resolveNodeActivities`; a floor's
      `rooms` beats its pyramid's; `buildSite` fills `prefabs`/`prefabPlacements`/`prefabsByIndex` with defaults;
      the serializer round-trips a floor with a prefab; `validateWorldSpec` names each refusal. Use a made-up room
      written to a temp catalogue or an injected lookup — never a real `.room`.
- [ ] **Step 2: Run** `yarn vitest run src/worldGen` — FAIL. **Step 3: Implement.** **Step 4:** PASS.
- [ ] **Step 5: Gate:** `timeout 900 yarn generate-world` — `generatedWorld.ts` byte-identical (no DSL names a room).
- [ ] **Step 6: Commit** `feat: dsl places room prefabs`.

### Task 5: Centrality

**Files:**

- Modify: `src/game/gridNavigation.ts` (beside `walkableFrom :265`)
- Create: `src/game/carve/centrality.ts`
- Test: `src/game/carve/centrality.spec.ts`

**Interfaces:**

- Produces: `distancesFrom(grid: FloorGrid, from: Cell): ReadonlyMap<string, number>` (BFS over `dirs`, as
  `findPath`); `centrality(grid: FloorGrid, rooms: readonly Cell[]): ReadonlyMap<string, number>` — per room
  `1 - (ecc - minEcc) / (maxEcc - minEcc)` where `ecc` is the greatest walking distance from the room to any dead
  end of the floor (cells with one exit); all equal → 1.

- [ ] **Step 1: Failing tests** on a fixture floor (`floorFixtures.testing.ts`): a T fork scores 1, the far dead
      end of the longest arm 0; equal arms score equally.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat: room centrality on a floor`.

### Task 6: Fitting and placing prefabs in the carve

**Files:**

- Create: `src/game/carve/placePrefabs.ts`, `src/game/carve/placePrefabs.spec.ts`
- Modify: `src/game/siteTypes.ts` (`PrefabRoom`, `RoomCell.prefabRoom`), `src/game/carve/passes.ts:89`
  (`finishAttempt`), `src/game/carve/state.ts:358` (`Shortfall`), the `AssemblerReason` union
  (`prefabsNotPlaced`), `src/game/carve/assembleFloor.ts:53-54` (web doors never inside a prefab rect)

**Interfaces:**

- Consumes: `variantsOf`, `placeBlobs`, `fillsOf` (Task 2); `centrality` (Task 5); `FloorConfig.prefabs`,
  `prefabPlacements`, `RoomCell.pinnedPrefab` (Task 4).
- Produces:
  ```ts
  export type PrefabObject = { kind: PlaceKind; layer: PlaceLayer; top: number; left: number; rows: number; cols: number; flip?: true }
  export type PrefabRoom = {
    name: string; layout: number; mirrored: boolean
    rect: CellRect                                  // inside of the ring, in floor cells
    stop: Cell; actor?: Cell; nodeArt?: Cell         // nodeArt: the chest/portal/mechanism place
    objects: readonly PrefabObject[]                 // what stands, after the fill
    blocked: readonly string[]                       // "r,c" the walk may not cross
    doors: Partial<Record<Direction, Cell>>          // the door places in use
  }
  export const fitPrefab = (grid: FloorGrid, r: number, c: number, prefab: Prefab, siteId: string): PrefabRoom | undefined
  export const placePrefabs = (prep: FloorPrep, grid: WritableGrid): Refusal | FloorGrid
  ```
- **Eligible rooms:** a fork, a pass-through chamber, a dead end with nothing in it; a room with a chest only for a prefab with a `chest` place, a portal (stairhead/exit) only with a
  `portal` place, a mechanism only with a `mechanism` place; a pinned room always (`pinnedPrefab`). The entrance,
  puzzle stops in corridors and Fez's/story rooms not pinned are never taken.
- **Fit:** for each variant, each free inside cell as the node: every `dir` of the node leaves in a straight line
  through a `d` on the ring; the rect (inside, in floor cells) holds only void and that node's own straight plain
  arms (as `absorbable`, `src/game/carve/growRooms.ts:28`); the rect plus one ring meets no other claiming room's
  3×3 (`claimsFloorAt`), no earlier prefab rect, no stair, mechanism or web door. Rank: fewest absorbed arm cells,
  then hash `${siteId}|prefab|${pk}|${variant}`.
- **Fill:** pick one of `fillsOf` and each place's kind by `hashString(\`${siteId}:prefab:${pk}:${letter}:${blob}\`)`; `patron` resolves to the floor's patron statue (`render.ts:27` `PATRON_KINDS`) and, on a floor with no patron, to the place's next kind or, when optional, empty. Mirrored `ground`objects get`flip`.
- **Order:** pinned rooms first (one that fits nowhere refuses the attempt with `retry`), then
  each placement in DSL order: rank eligible rooms by `|centrality - central|`, then hash; place up to `max`; fewer
  than `min` → `{ retry: [{ type: "prefabsNotPlaced", room, wanted: min, placed }] }`.
- Wired: `finishAttempt` returns `placePrefabs(prep, finish(prep, grid))` in place of `finish(prep, grid)`.

- [ ] **Step 1: Failing tests** (`placePrefabs.spec.ts`, made-up prefabs, fixture floors):
  - `places a hall over a fork whose arms leave through door places`.
  - `refuses a fit where an arm leaves through a wall` and `draws unused door places as wall` (no `doors` entry).
  - `never covers another room's 3x3, a stair, a mechanism, a puzzle stop or a foreign corridor` (Review Focus 1).
  - `takes a chest room only with a chest place, and puts the chest's art there` (`nodeArt`).
  - `central 1 takes the fork, central 0 the far dead end`.
  - `places up to max` and `retries with prefabsNotPlaced when fewer than min fit` (Review Focus 4).
  - `a pinned prefab lands on its node`.
  - `the same site and floor place and fill identically twice; two storerooms on one floor fill differently`.
  - `a floor with no prefabs carves byte-identically` — `carvedFloorDigest` before/after on a fixture config.
- [ ] **Step 2: Run** `yarn vitest run src/game/carve/placePrefabs.spec.ts` — FAIL.
- [ ] **Step 3: Implement.** Add `prefabsNotPlaced` to the reasons and its line in `describeLayoutFailure`
      (`src/worldGen/carveSeedSearch.ts`): `"<floor>: room <name> placed N of min M"`.
- [ ] **Step 4: Run** `yarn vitest run src/game` — PASS.
- [ ] **Step 5: Commit** `feat: carve places room prefabs`.

### Task 7: The map draws, claims and walks a prefab room; piece-plus-ring goes

**Files:**

- Modify: `src/game/roomShape.ts` (`grownCells :12`, `roomDoors :29` read `prefabRoom`), `src/app/SiteMap/roomClaims.ts`
  (`:113-163, :308-341, :348-371, :427`), `src/app/SiteMap/roomWalk.ts`, `src/app/SiteMap/standingSpot.ts`,
  `src/app/SiteMap/SiteMapView.tsx` (`:1451-1627`), `src/app/SiteMap/floorFixtures.testing.ts:156-169`,
  `src/game/lessonOrder.ts`, `scripts/layoutPicker.ts:144`, `src/worldGen/carveSeedSearch.ts`, `scripts/generateWorld.ts:244-251`
- Delete: `src/game/carve/growRooms.ts` (+spec), `src/worldGen/centreReport.ts` (+spec), `GrownRoom`/`CentrePiece`,
  `PropFootprint.centre`, `isCentreKind`, `takesCentre` (`render.ts:350`)
- Create: `src/worldGen/prefabReport.ts` (+spec)

**Interfaces:**

- Consumes: `PrefabRoom` (Task 6).
- Produces: `roomPath(grid, node, from: RoomEnd, to: RoomEnd): WalkPoint[]` now walks the room's free cells
  (`rect` minus `blocked`): BFS on cells, then string-pulled (drop a point when the straight segment between its
  neighbours crosses no blocked cell) so the walk never zig-zags on the grid; `roomStop` returns `prefabRoom.stop`;
  `occupantOffset` returns `prefabRoom.actor` when set; node art is drawn at `prefabRoom.nodeArt`.
  `describePrefabTally(tally): string` → `" Prefab rooms: starter N placed (P pinned), …"` in the bake.
- Prefab rooms are claimed whole (as grown rooms are now, `roomClaims.ts:147-163`); objects come only from
  `objects` (no companions, no `decoration` pick in that room); `wall` objects stand against the north wall,
  `wallItem` on the ring's north wall cells, `ground` under the player, `flip` mirrors the sprite; the fade
  (`OCCLUDER_FADE`) applies to `floor`/`wall` objects that cover his figure; drawn only when the room is lit.
- `lessonOrderFaults` uses the prefab rect ring where it used the grown rect ring.
- `layoutPicker`'s `prefer` score and `verifyCarvePair` no longer read centre fallbacks (the option goes).

- [ ] **Step 1: Port the fixtures and tests:** `grownForkFloor` becomes `prefabForkFloor` building a `PrefabRoom`;
      the room-walk tests (L chamber, T fork six pairs, stop, start/end at stop) run on it unchanged in their claims.
      New tests: `walks round two pillars without zig-zag` (no three consecutive points that turn twice within one
      cell); `a mirrored room's ground steps draw flipped`; `a fogged prefab room draws no object` (Review Focus 5);
      `the actor stands on the actor place`; `the chest art stands on its place`.
- [ ] **Step 2: Run** `yarn vitest run src/app/SiteMap src/game` — FAIL.
- [ ] **Step 3: Implement and delete** the piece-plus-ring code; `grep -rn "grownRoom\|GrownRoom\|isCentreKind\|growRooms\|centreFallbacks" src scripts` returns nothing.
- [ ] **Step 4: Run** `yarn verify` — PASS.
- [ ] **Step 5: Gate:** `timeout 900 yarn generate-world` — byte-identical; the bake prints `Prefab rooms: … 0 placed`.
- [ ] **Step 6: Commit** `feat: map draws and walks prefab rooms`.

### Task 8: Art guard

**Files:**

- Create: `src/worldGen/tileArt.ts` (+spec), `src/worldGen/prefabArtValidator.ts` (+spec)
- Modify: the world validator list (`src/worldGen/configBuilder.ts:340,460`)

**Interfaces:**

- Produces: `hasTileArt(tier: Tileset, kind: string, root?: string): boolean` — `src/assets/tiles/<tier>/<kind>.png`
  or `default/`, never `placeholder/` (mirrors `tileUrl`, `src/app/SiteMap/tileAssets.ts`), read with `node:fs`;
  `prefabArtValidator: WorldValidator` — throws `[worldSpec] Room prefab art missing: <room> on <floor> needs <kind> (<tier>)`
  for every kind any placed prefab lists (a `patron` place needs the floor's patron statue).

- [ ] **Step 1: Failing tests** with a temp tiles root: found in tier; found in default; not found in placeholder;
      the validator names room, floor and kind.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat: bake refuses a prefab without art`.

### Task 9: Storybook — the room catalogue and fixture rooms

**Files:**

- Create: `src/app/SiteMap/PrefabRooms.stories.tsx`

**Interfaces:**

- Loads `.room` files with `import.meta.glob("../../game/rooms/**/*.room", { query: "?raw" })` (as
  `LockPlayground.stories.tsx:10`) and `parsePrefab`; draws each on a minimal fixture floor with every door in use,
  one story per room, with controls: variant, fill index, explorer walk between two chosen doors.
- Plus fixture stories with made-up prefabs: hall with two rows of pillars and a 2×2 piece, its mirror, a ruined
  hall with tops, a room with ground steps, a storeroom with a 3-of-4 gift group.

- [ ] **Step 1:** Write the stories. **Step 2:** `yarn storybook` and screenshot each fixture story; check by
      looking: objects on their places, walk round pillars, stop marker, fade behind a tall object, flipped steps.
- [ ] **Step 3: Commit** `feat: storybook room prefab catalogue`.

### Task 10: The room editor (dev mode)

**Files:**

- Create: `src/app/dev/RoomEditor.tsx`, `src/app/dev/RoomEditor.stories.tsx`, `src/app/dev/RoomEditor.spec.tsx`,
  `src/app/dev/roomEditorUrl.ts` (+spec), `src/app/SiteMap/roomPalette.ts` (+spec)
- Modify: `src/app/dev/devActionContributions.ts` (open the editor, beside the lock editor), locale files (nl + en)

**Interfaces:**

- Follows `src/app/dev/LockEditor.tsx` / `LockEditorHost.tsx` / `lockEditorUrl.ts`: text on the left, live result
  on the right, the text shared by a URL hash (`encodeRoomHash`/`decodeRoomHash`) and a copy button. The browser
  writes no file: the designer pastes the text into `src/game/rooms/<tier>/<name>.room` (or hands it over).
- **Tier picker** (starter … wizard, cave, sphinx): the preview draws with that tier's art; a `tier` header that
  disagrees is a shown fault, not a silent override.
- **Preview:** the Task 9 room drawing (one shared component, not a copy) with controls for layout, mirror, fill
  index and a walk between two chosen doors; `prefabFaults` and parse errors (`line N: …`) listed under it.
- **Palette:** `roomPalette(tier: Tileset): PaletteEntry[]` with
  `PaletteEntry = { kind: string; layer: "prop" | "wallItem" | "ground"; cols: number; rows: number; painted: boolean; url: string }`
  — every `DecorationKind` and `WallDecorationKind`, footprint from `decorationFootprint`, `painted` from `tileUrl`
  (else the placeholder sprite, shown greyed). Clicking an entry inserts a legend line for the next free letter
  (`<letter> floor <kind>`, `wallItem` / `ground` by the kind's layer).
- Opening the editor on a catalogued room (a picker of `ROOM_CATALOGUE` names via `import.meta.glob` raw text).

- [ ] **Step 1: Failing tests:** `roomPalette` marks a painted kind `painted` and an unpainted one not, with the
      kind's footprint; `roomEditorUrl` round-trips a room text; `RoomEditor.spec.tsx` — typing a room with an
      unknown kind shows the `line N:` error; clicking a palette entry adds its legend line; switching tier redraws
      with that tier (the preview's tileset prop changes).
- [ ] **Step 2–4:** FAIL → implement → PASS. All strings in nl + en.
- [ ] **Step 5:** Storybook `RoomEditor` story; screenshot it with a made-up hall at two tiers — check by looking.
- [ ] **Step 6: Commit** `feat: dev room editor`.

### Task 11: Starter rooms

**Files:**

- Create: `src/game/rooms/starter/*.room` — one per starter activity (weighing, packing, storage, selling,
  ledger) using starter's painted kinds (`src/assets/tiles/starter/`: scale, weightsTable, basketStack, bales,
  jarRack, shelf, basin, counter, mat, offeringTable, scribeDesk, tallyBoard, niche, hanging, lamp, pillar …),
  Fez's meeting room (selling, with an `actor` place) and the starter tomb's ledger room (with an `actor` place).
- Modify: `src/worldGen/spec/starter.ts` (`:110` Fez node, `:274` tomb node get `room`; floors get `rooms` with
  min/max/central per activity), `docs/game-design/themed-rooms.md` §2–3 (story rooms are pinned prefabs; prefab
  rooms dress themselves), `docs/game-design/world-spec-stability.md` (`.room` files and DSL `rooms` are
  structural), `CHANGELOG.md` `## Unreleased` (one line: `Designed rooms in the starter pyramids`).

- [ ] **Step 1:** Draw the rooms small (starter floors are small); `yarn room` — every room 0 faults.
- [ ] **Step 2:** DSL entries; `timeout 900 yarn generate-world` — passes; bake line shows starter rooms placed;
      only starter floors move (`git diff --stat src/data/generatedWorld.ts` and `carveLedger.json`; junior–wizard
      floors unchanged: compare their `carvedFloorDigest`s before/after).
- [ ] **Step 3:** `timeout 900 yarn verify-content` — passes except `starterCarve.verify.ts` (expected to move).
- [ ] **Step 4:** Screenshot every starter floor that holds a prefab room (Storybook `Topology` or the dev map);
      send them to the designer. **STOP: the designer looks at the carved starter floors.**
- [ ] **Step 5:** After the designer's yes: re-snapshot `yarn vitest run -c vitest.verify.config.ts src/app/SiteMap/starterCarve.verify.ts -u`; refresh tier fingerprints if their verify asks; `yarn verify` PASS.
- [ ] **Step 6: Commit** `feat: starter rooms are designed rooms`; push.
