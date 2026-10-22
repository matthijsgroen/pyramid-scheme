# Tomb redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tomb becomes a journey of two levels — a hidden cave (no board, cave tileset, a tier + 1 lock, no loot) then a sunlit cavern pyramid (tier + 1 locks and puzzles between the unchanged tableaus) — built for every tier, filled in for the starter tomb.

**Architecture:** Tombs stop being a special build path: each tomb level is an ordinary authored site through `buildSite`, with the tomb's own rules (ward keys, treasures, tableau `runNr`) on its last level. Four uniform vocabulary additions carry the redesign — `tileset` beside `difficulty`, node-level `difficulty` and `loot`, a family ordinal per room — plus per-level `exterior`/`board` on a journey.

**Tech Stack:** TypeScript, React 19, Vitest, Storybook, the world-gen DSL (`src/worldGen/`), the bake (`yarn generate-world`).

**Spec:** `docs/superpowers/specs/2026-10-22-tomb-redesign-design.md`

## Global Constraints

- Tasks 1–6 leave the baked world **byte-identical**: after `yarn generate-world`, `git diff --stat src/data/generatedWorld.ts` is empty and `yarn vitest run src/data/tierFingerprints.spec.ts` passes unchanged. Only Task 9 moves the starter fingerprint, and only the starter one.
- Domain code (`src/game/`, `src/data/`, `src/worldGen/`) stays pure TypeScript — no React, no i18n (AGENTS.md §8).
- No unit tests pin the contents of an authored lock or puzzle; tests use made-up sites and locks. `yarn lock` is the check for real locks.
- Comments state the current state and why, never history ("used to", "replaces").
- Commits: one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- `yarn verify` before each commit that touches code (lint --fix, types, tests, betterer, in that order).
- New user-facing strings get both `public/locales/en/` and `public/locales/nl/` entries.
- Every new `src/ui/` component gets a story in the same folder.
- Never `git pull`; never `git stash` bare.
- New content for this redesign authors `loot: false`; no task adds a loot slot.

## Review Focus

1. **Revisiting a completed tomb from the map card** lands at the cavern, never the cave — pinned in Task 7.
2. **Backing out of the cave mid-visit and coming back** reopens the cave interior, not an Enter screen with no board — pinned in Task 7.
3. **Every tomb with one level (all but starter)** builds exactly as before — pinned by the byte-identical gate in Task 2.
4. **A node that sets `difficulty` but no `encounter`** is still dealt a board of the node's difficulty, from the node's bucket — pinned in Task 4.
5. **`loot: false` on a floor that authors `tombTreasure`** keeps the treasure and drops only generated slots — pinned in Task 5.

---

### Task 0: Branch and baseline

**Files:** none changed.

- [ ] **Step 1: Branch from the current HEAD** (the spec and this plan are committed on it)

```bash
git switch -c tomb/cave-and-cavern
```

- [ ] **Step 2: Confirm the committed world is current**

```bash
yarn generate-world && git status --short src/data/
```

Expected: no output. If `generatedWorld.ts` changed, stop and report — the baseline must be the committed world.

- [ ] **Step 3: Record the baseline**

```bash
yarn vitest run src/data/tierFingerprints.spec.ts && shasum src/data/generatedWorld.ts > /tmp/tomb-baseline.sha && yarn world-info > /tmp/tomb-baseline-world-info.txt
```

Expected: PASS. Later tasks compare against `git diff src/data/generatedWorld.ts` (empty) — the sha is a second witness.

---

### Task 1: Tomb floors counted apart from tomb levels

A tomb's `levelCount` today means its floors. Rename it to `floorCount` everywhere and add a real `levelCount` (sites, default 1). Pure rename plus a default: world byte-identical.

**Files:**
- Modify: `src/data/journeyStructure.ts` (`TombStructure`, `TOMB_STRUCTURES`)
- Modify: `src/worldGen/types.ts:161` (`TombJourneyDef`)
- Modify: `src/worldGen/data.ts:49` (`TOMB_JOURNEYS`)
- Modify: `src/worldGen/dsl.ts:435` (`PyramidConstraint.levelCount` → `floorCount`, doc "Number of floors of a tomb level")
- Modify: `src/worldGen/configBuilder.ts:186`
- Modify: `src/worldGen/validateWorldSpec.ts:31-55`
- Modify: `src/mods/hieroglyph/game/tableaus.ts:86-262` (every `tomb.levelCount`)
- Modify: `src/mods/hieroglyph/app/plugin.tsx` (escalation `total`)
- Modify: `src/worldGen/spec/starter.ts:214` and every other `tomb(...)` call using `levelCount`
- Modify: `src/data/levelSites.ts:13-21`
- Test: `src/worldGen/validateWorldSpec.spec.ts` (or the spec beside it that covers the floor-count check)

**Interfaces:**
- Produces: `TombStructure = { id: string; tier: Difficulty; floorCount: number; levelCount?: number }` — `levelCount` is the number of sites, default 1. `TombJourneyDef = { id; tier: Tier; floorCount: number; levelCount: number }` with `levelCount` defaulted to 1 in `TOMB_JOURNEYS`. DSL: `PyramidConstraint.floorCount?: number`.

- [ ] **Step 1: Write the failing test** — the validator names floors, not levels:

```ts
it("refuses a tomb whose authored floors differ from its floorCount", () => {
  const errors = validateTombFloors([tomb("t", { floorCount: 3, floors: [{}, {}] })], [{ id: "t", tier: "starter", floorCount: 3, levelCount: 1 }])
  expect(errors[0].message).toContain("floorCount is 3")
})
```

Adapt to the validator's real entry point (read `validateWorldSpec.ts:31-55` first); the assertion that matters is the message naming `floorCount`.

- [ ] **Step 2: Run it** — `yarn test src/worldGen/validateWorldSpec` — FAIL.
- [ ] **Step 3: Rename** `levelCount` → `floorCount` on `TombStructure`, `TombJourneyDef`, the DSL field and every reader listed above (`grep -rn "levelCount" src/mods/hieroglyph src/worldGen src/data/journeyStructure.ts src/data/levelSites.ts` and follow `yarn check-types`). Add `levelCount` (sites) defaulting to 1 in `TOMB_JOURNEYS`. `levelSitesOf` maps a tomb's `levelCount` (sites), so each level re-enters `configs[id][level]`. Journey-side `levelCount` in `src/data/journeys.ts` (map nodes, from `config.length`) is untouched.
- [ ] **Step 4: Run** `yarn test src/worldGen src/mods/hieroglyph src/data` — PASS.
- [ ] **Step 5: Byte-identical gate** — `yarn generate-world && git diff --stat src/data/` → empty; `yarn vitest run src/data/tierFingerprints.spec.ts` → PASS.
- [ ] **Step 6: `yarn verify`, commit** — `refactor: tombs count floors apart from levels`

---

### Task 2: Tomb levels built as ordinary sites

`buildTombConfigs` copies a subset of floor fields and builds one site. Make it build `levelCount` sites through `buildSite`; the tomb's rules apply to the last level only; every authored floor field passes through.

**Files:**
- Modify: `src/worldGen/configBuilder.ts:170-264` (`buildTombConfigs`)
- Modify: `src/worldGen/dsl.ts:594` (`tomb()` scope)
- Test: `src/worldGen/configBuilder.spec.ts` (create beside it if the tomb build has no spec; check `ls src/worldGen/*.spec.ts`)

**Interfaces:**
- Consumes: Task 1's `TombJourneyDef.levelCount` / `floorCount`, `PyramidConstraint.floorCount`.
- Produces: `configs[tomb.id]: SiteConfig[]` of length `tomb.levelCount`; level `i < last` is built from `journey(id).pyramid(i, …)` rules with authored `floors` and no tomb rules; the last level is the tomb pyramid. `tomb(id, c)` returns a rule scoped `{ level: "journey-pyramid", journey: id, pyramid: "last" }`.

- [ ] **Step 1: Write the failing tests** (made-up spec, not the real world):

```ts
it("builds one site per tomb level, the tomb's rules on the last", () => {
  const configs = buildTombConfigsFor(
    [{ id: "t", tier: "starter", floorCount: 1, levelCount: 2 }],
    [
      journey("t").pyramid("first", { floors: [{ pathPuzzles: 2, encounter: "puzzle" }] }),
      tomb("t", { encounter: "tomb-puzzle", floorCount: 1, floors: [{ mainEndReward: "tombTreasure" }] }),
    ]
  )
  expect(configs.t).toHaveLength(2)
  expect(configs.t[0][0].encounter).toBe("puzzle")
  expect(configs.t[0][0].sideSections.some(s => s.gate?.type === "tomb-key")).toBe(false)
  expect(configs.t[1][0].encounter).toBe("tomb-puzzle")
})

it("passes an authored tomb floor's locks and difficulty through", () => {
  const configs = buildTombConfigsFor(
    [{ id: "t", tier: "starter", floorCount: 1, levelCount: 1 }],
    [tomb("t", { floorCount: 1, floors: [{ difficulty: "junior", locks: [madeUpLock], realisations: { toggle: "handle" } }] })]
  )
  expect(configs.t[0][0].difficulty).toBe("junior")
  expect(configs.t[0][0].regionLayout).toBeDefined() // locks compile into the floor's layout
})
```

`buildTombConfigsFor(tombs, rules)` is a test seam: export `buildTombConfigs` taking the tomb list and spec as parameters (defaulting to `TOMB_JOURNEYS` / `worldSpec`), the way the injected resolvers are passed today. `madeUpLock` is a two-region lock built with the helpers in `src/game/lockAuthoring.ts` (copy a fixture from an existing lock spec, e.g. `grep -rln "freeRegions" src/**/*.spec.ts`).

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
  - `tomb()` scopes its rule to `pyramid: "last"`. With one level, "last" is pyramid 0 of 1 — the same constraint as today.
  - Loop `li` over `tomb.levelCount`, resolving `resolvePyramidConstraintWithProvenance(worldSpec, tomb.id, tier, li, tomb.levelCount)`.
  - Last level: today's tomb build, with each floor built as `{ ...authored, pathPuzzles: authored?.pathPuzzles ?? TOMB_ROOMS_PER_FLOOR[difficulty], difficulty: authored?.difficulty ?? difficulty, encounter: authored?.encounter ?? encounter, mainEndReward: authored?.mainEndReward ?? "tombTreasure", sideSections: [...authoredSections, ...shortcut], corridorStraightness, packing, sealed, encounterArgs: authored?.encounterArgs ?? { runNr: i + 1 }, theme }` — spread first so every field passes, then the tomb defaults. `pyramidIndex: li, levelCount: tomb.levelCount`.
  - Earlier levels: `buildSite` with the resolved constraint as authored (it must author `floors`; throw a clear error otherwise), `resolveReward` = `specToReward` for the tier, no `tombTreasure`, `hasMapPieceBranch: false`, `hasWardGate: false`, `nextTier: null`.
  - Update the block comment above `buildTombConfigs` to say this.
- [ ] **Step 4: Run** `yarn test src/worldGen` — PASS.
- [ ] **Step 5: Byte-identical gate** (as Task 1 Step 5). A diff here means an authored tomb floor carried a field the old copy dropped: report which field and tomb rather than deleting the authoring.
- [ ] **Step 6: `yarn verify`, commit** — `refactor: tomb levels build through buildSite like any site`

---

### Task 3: Rooms carry their family ordinal; tableaus key by it

A tableau's content is keyed by `pathIndex + 1`, so nothing may stand before a tableau. Key it by the room's position among rooms of **its own family** on its chain.

**Files:**
- Modify: `src/game/siteTypes.ts` (`RoomCell.familyOrdinal?: number`)
- Modify: the assembler pass that sets `RoomCell.family` (find with `grep -rn "family:" src/game/carve src/game/siteAssembler.ts`)
- Modify: `src/game/siteAssembler.ts:59` (key-requirement ctx gains `familyOrdinal`)
- Modify: `src/game/families/familyMeta.ts` (`FamilyContext.familyOrdinal?: number`)
- Modify: `src/app/SiteMap/useEncounter.ts:60-100` (ctx carries it)
- Modify: `src/mods/hieroglyph/game/keyRequirements.ts:20-31`, `src/mods/hieroglyph/app/plugin.tsx:44-101`
- Modify: `src/worldGen/spec/starter.ts:217-226` (the comment explaining "LAST, not first" — now Ipi can stand anywhere; keep him last, rewrite the why)
- Test: the assembler's spec (beside the file you modify), `src/mods/hieroglyph/game/keyRequirements.spec.ts`

**Interfaces:**
- Produces: `RoomCell.familyOrdinal: number` — 0-based count of earlier rooms on the same chain (main path or one section) that resolved to the same family. Key-requirement ctx and `FamilyContext` carry `familyOrdinal`. Tableau `levelNr = familyOrdinal + 1`.

- [ ] **Step 1: Write the failing tests**

```ts
it("numbers a room among rooms of its own family on its chain", () => {
  // made-up floor: main path of 4, node 2 overridden to another family
  const grid = assembleMadeUpFloor({ pathPuzzles: 4, encounter: "tableau", encountersByIndex: { 1: "sumplete" } })
  const ordinals = mainPathRooms(grid).map(r => [r.family, r.familyOrdinal])
  expect(ordinals).toEqual([["tableau", 0], ["sumplete", 0], ["tableau", 1], ["tableau", 2]])
})
```

```ts
it("resolves a tableau by its family ordinal, not its path position", () => {
  const req = resolveTableauKeyRequirements({ journeyId: "starter_treasure_tomb", pathIndex: 2, familyOrdinal: 1, encounterArgs: { runNr: 1 } })
  expect(req).toEqual(resolveTableauKeyRequirements({ journeyId: "starter_treasure_tomb", pathIndex: 1, familyOrdinal: 1, encounterArgs: { runNr: 1 } }))
})
```

Use the assembler spec's existing fixture builder in place of `assembleMadeUpFloor`/`mainPathRooms` (read the spec first). The second test may read the real tableau table: it pins the key, not authored content.

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — stamp `familyOrdinal` where the family is resolved per room (one counter per chain per family); thread it into the key-requirement ctx and `FamilyContext`; both tableau resolvers and the escalation `position` use `familyOrdinal + 1` in place of `pathIndex + 1`. Rewrite the plugin and `keyRequirements.ts` comments that explain `pathIndex + 1`.
- [ ] **Step 4: Run** `yarn test src/game src/mods/hieroglyph src/app/SiteMap` — PASS.
- [ ] **Step 5: Byte-identical gate.** Then `yarn verify-content` (the world's tableaus still resolve; ~4 min).
- [ ] **Step 6: `yarn verify`, commit** — `feat: tableaus key by their place among tableaus, not along the path`

---

### Task 4: Node difficulty

**Files:**
- Modify: `src/worldGen/dsl.ts:67-72` (`NodeSelector.difficulty?: Difficulty`), add `resolveNodeDifficulties` beside `resolveNodeActivities`
- Modify: `src/worldGen/types.ts:58-97` and `src/game/siteTypes.ts` (`difficultiesByIndex?: Record<number, Difficulty>` on floor and section configs)
- Create: `src/game/roomDifficulty.ts` — `roomDifficulty(section, index)`
- Modify: `src/worldGen/buildSite.ts:335`, `src/worldGen/sideSections.ts:66-82` (resolve and carry it)
- Modify: `src/worldGen/serializer.ts:72-75,181-182` (serialize it like `activitiesByIndex`)
- Modify every per-room difficulty reader to use `roomDifficulty`: `src/worldGen/placeEncounters.ts:103-140` (`assignByIndex` and `dealChain`), `src/worldGen/slots.ts:121-175` (slot `tier`), `src/game/seeds/boardIndex.ts:125,138`, `src/game/seeds/seedDemand.ts`, `src/game/carve/mainRooms.ts:54,119`, `src/game/carve/roomSpecs.ts:109,159` (RoomCell.difficulty). Find stragglers with `grep -rn "section.difficulty\|floor.difficulty\|config.difficulty" src/worldGen src/game | grep -v spec`.
- Test: `src/game/roomDifficulty.spec.ts`, `src/worldGen/placeEncounters.spec.ts`

**Interfaces:**
- Produces: `NodeSelector.difficulty`; `difficultiesByIndex` on `FloorConfig`/`SubSection` (worldGen and game mirrors); `roomDifficulty(section: { difficulty: Difficulty; difficultiesByIndex?: Record<number, Difficulty> }, index: number): Difficulty`. `RoomCell.difficulty` holds the room's own difficulty (what `useEncounter` already reads for the board).

- [ ] **Step 1: Write the failing tests**

```ts
it("a node's difficulty wins for that room only", () => {
  const section = { difficulty: "starter" as const, difficultiesByIndex: { 1: "junior" as const } }
  expect([0, 1, 2].map(i => roomDifficulty(section, i))).toEqual(["starter", "junior", "starter"])
})
```

```ts
it("deals a node that names only a difficulty from that difficulty's pool", () => {
  // made-up floor: three rooms, node 2 { difficulty: "junior" } and no encounter
  const floors = dealMadeUpFloor({ pathPuzzles: 3, difficulty: "starter", nodes: [{ where: 2, difficulty: "junior" }] })
  expect(allocatedTiers(floors)).toEqual(["starter", "junior", "starter"])
})
```

Build both made-up floors with the fixture helpers in `placeEncounters.spec.ts`; `allocatedTiers` records the difficulty each `allocate` call received.

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — resolve, carry, serialize, and switch every reader above to `roomDifficulty`.
- [ ] **Step 4: Run** `yarn test src/worldGen src/game` — PASS.
- [ ] **Step 5: Byte-identical gate.**
- [ ] **Step 6: `yarn verify`, commit** — `feat: a node can name its own difficulty`

---

### Task 5: `loot: false`

**Files:**
- Modify: `src/worldGen/dsl.ts` (`loot?: false` on `FloorConstraint`, `SideSectionConstraint`, `PyramidConstraint`, `NodeSelector`)
- Modify: `src/worldGen/types.ts`, `src/game/siteTypes.ts` (`loot?: false` and `lootByIndex?: Record<number, false>` on floor/section configs)
- Modify: `src/worldGen/buildSite.ts:255-345` (resolve inheritance: node ?? section ?? floor ?? site; a lootless floor's unauthored `mainEndReward` is `undefined`, not `fragmentSlot`)
- Modify: `src/worldGen/sideSections.ts:56-82` (a lootless section's unauthored treasure `endReward` is `undefined`; sections inherit the floor's `loot`)
- Modify: `src/worldGen/slots.ts:121-175` (`emitPuzzle` skips a lootless chain and lootless indexes)
- Modify: `src/worldGen/serializer.ts`
- Test: `src/worldGen/slots.spec.ts`, `src/worldGen/buildSite.spec.ts`

**Interfaces:**
- Produces: `loot?: false` in the DSL at site, floor, section and node level, stamped on built configs as `loot: false` / `lootByIndex`. Only generated slots are affected; authored rewards (`mainEndReward`, `endReward`, gates) are untouched.

- [ ] **Step 1: Write the failing tests**

```ts
it("a lootless floor emits no generated slots but keeps its authored treasure", () => {
  const site = buildMadeUpSite({ floors: [{ loot: false, pathPuzzles: 3, mainEndReward: "mosaicPiece", sideSections: [sidePath({ puzzles: 2 })] }] })
  const slots = collectSlots({ j: [site] }, () => 60)
  expect(slots).toEqual([])
  expect(site[0].mainEndReward).toBeDefined()
})

it("a lootless node drops only its own room's slot", () => {
  const site = buildMadeUpSite({ floors: [{ pathPuzzles: 3, nodes: [{ where: 2, loot: false }] }] })
  const puzzleSlots = collectSlots({ j: [site] }, () => 60).filter(s => s.kind === "puzzle")
  expect(puzzleSlots).toHaveLength(2)
})
```

`buildMadeUpSite` wraps `buildSite` with the defaults existing `buildSite` specs use; the journey id must have `emitFragmentSlots` (use whichever id the existing slot specs use).

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `yarn test src/worldGen` — PASS.
- [ ] **Step 5: Byte-identical gate.**
- [ ] **Step 6: `yarn verify`, commit** — `feat: loot: false keeps generated loot out of a floor, path or room`

---

### Task 6: Tilesets

**Files:**
- Modify: `src/game/siteTypes.ts` — `export type Tileset = Difficulty | "cave"`; `tileset?: Tileset` on `FloorConfig`, `SubSection`, `FloorGrid`, `RoomCell`, `CorridorCell`
- Modify: `src/worldGen/dsl.ts` (`tileset?: Tileset` on `PyramidConstraint`, `FloorConstraint`, `SideSectionConstraint`), `src/worldGen/types.ts`, `buildSite.ts`, `sideSections.ts`, `serializer.ts`
- Modify: the carve, where `RoomCell.difficulty` / `CorridorCell.difficulty` and `FloorGrid.difficulty` are stamped (`src/game/carve/mainRooms.ts`, `roomSpecs.ts`, and the grid builder) — stamp `tileset = section.tileset ?? floor.tileset` on cells, and on a room whose `difficultiesByIndex` overrides its difficulty stamp the section's `tileset ?? difficulty`; `FloorGrid.tileset = floor.tileset`
- Modify: `src/app/SiteMap/roomClaims.ts:519` — `floorTier(grid): Tileset = grid.tileset ?? grid.difficulty ?? "starter"`; add `cellTileset(cell, grid): Tileset = cell.tileset ?? cell.difficulty ?? floorTier(grid)`
- Modify: every art lookup reading `cell.difficulty ?? tier` / `grid.difficulty ?? "starter"` in `src/app/SiteMap/` (`SiteMapView.tsx:333,447,455,1235,1847-1861`, `roomClaims.ts:253,272,461-504`, `tileLayers.tsx`) to `cellTileset`/`floorTier`
- Modify: `src/app/SiteMap/tileAssets.ts` (`tileUrl(tileset: Tileset, name)`; a missing `cave/` file falls back to `placeholder/`), `tileMaterials.ts:49` (`tierPalette: Record<Tileset, TierPalette>` with a grey-brown rock `cave` entry), `moodSettings.ts` rank mood (`cave` entry: cool, dim)
- Modify: `src/app/SiteMap/EncounterModal.tsx` (prop `tileset?: Tileset`; wall from `imageMap` only when the tileset is a rank that has one), `SiteMapScreen.tsx:326`, `lockPlayground.tsx:181`, `dev/PuzzleLab.tsx:173`, stories passing `difficulty`
- Modify: `src/app/SiteMap/useEncounter.ts` (ctx carries `tileset: cellTileset(cell, grid)`), `src/game/families/familyMeta.ts` (`FamilyContext.tileset?: Tileset`)
- Create: `src/assets/tiles/cave/.gitkeep`
- Test: `src/app/SiteMap/roomClaims.spec.ts`, `src/app/SiteMap/EncounterModal.spec.tsx`, carve spec

**Interfaces:**
- Consumes: Task 4's `difficultiesByIndex`.
- Produces: `Tileset`, `cellTileset(cell, grid)`, `floorTier(grid): Tileset`, `EncounterModal` prop `tileset`, `FamilyContext.tileset`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("cellTileset", () => {
  it("draws a cell in its section's difficulty when nothing names a tileset", () => {
    expect(cellTileset(room({ difficulty: "junior" }), grid({ difficulty: "starter" }))).toBe("junior")
  })
  it("draws a cell in the floor's tileset over its section's difficulty", () => {
    expect(cellTileset(room({ difficulty: "junior" }), grid({ difficulty: "starter", tileset: "cave" }))).toBe("cave")
  })
  it("draws a cell in its own tileset over the floor's", () => {
    expect(cellTileset(room({ difficulty: "junior", tileset: "master" }), grid({ tileset: "cave" }))).toBe("master")
  })
})
```

Carve spec: a made-up floor with `difficultiesByIndex: { 1: "junior" }` on a starter floor stamps that room `difficulty: "junior"`, `tileset: "starter"`.

EncounterModal spec: `tileset="cave"` renders no wall image (card colour); `tileset="junior"` renders the junior wall.

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**, letting `yarn check-types` find every `Record<Difficulty, …>` art map that must take `Tileset`.
- [ ] **Step 4: Run** `yarn test src/app/SiteMap src/game` — PASS.
- [ ] **Step 5: Byte-identical gate**, then look: `yarn dev`, open any starter pyramid floor with a junior side path, screenshot — it draws as before (memory: verify rendering by looking).
- [ ] **Step 6: `yarn verify`, commit** — `feat: floors and paths can wear a tileset apart from their difficulty`

---

### Task 7: Journey levels — per-level exterior, boardless level, resume at the last level

**Files:**
- Modify: `src/data/journeys.ts:26-60` — `levels?: JourneyLevel[]` with `type JourneyLevel = { exterior?: "caveMouth" | "cavern"; board?: false }`
- Create: `src/ui/atoms/CaveBackdrop.tsx` + `CaveBackdrop.stories.tsx` — props `{ variant: "mouth" | "cavern" }`; draws `src/assets/exteriors/cave-mouth.png` / `cavern.png` when present (import via `import.meta.glob`, as `tileAssets.ts` does), else a layered CSS gradient (sand and dark mouth / dark rock with a pale shaft of light)
- Modify: `src/app/PyramidExpedition.tsx:95-251` — the level's backdrop is `CaveBackdrop` when `levels[levelNr-1]?.exterior` is set, else `DesertBackdrop`; a boardless level renders no `<Level>` board, only the existing Enter button (the one `revealSolvedBoard` shows) which calls `flow.enterInterior()`
- Modify: `src/app/PyramidExpedition/useExpeditionFlow.ts` — args gain `boardless: boolean`; `enterInterior()` = `setInteriorLevel(journeyId, levelNr); setShowingInterior(true)`; `interiorComplete` on a boardless level with `completionCount === 0` calls `onNextLevel` with no `setTransitionToLevel` (no slide)
- Modify: `src/app/pages/Travel.tsx:78-93` — `resumeAt` out of range falls back to `effectiveLevelCount`, not 1; update the comments at `:70-76` and `:111`
- Test: `src/app/PyramidExpedition/useExpeditionFlow.spec.ts`, `src/app/pages/Travel.spec.tsx` (or the spec covering `handleMapClick`), `src/app/PyramidExpedition.spec.tsx`

**Interfaces:**
- Produces: `Journey.levels`, `JourneyLevel`, `CaveBackdrop`, `ExpeditionFlow.enterInterior`, `ExpeditionFlowArgs.boardless`.

- [ ] **Step 1: Write the failing tests**

```ts
it("goes on to the next level without a slide after a boardless level's site", () => {
  vi.useFakeTimers()
  const onNextLevel = vi.fn()
  const { result } = renderHook(() => useExpeditionFlow({ ...args, boardless: true, completionCount: 0, onNextLevel }))
  act(() => result.current.interiorComplete())
  expect(result.current.startNextLevel).toBe(false)
  act(() => vi.runAllTimers())
  expect(onNextLevel).toHaveBeenCalledOnce()
  expect(result.current.startNextLevel).toBe(false)
})

it("reopens a boardless level's interior after backing out", () => {
  const { result } = renderHook(() => useExpeditionFlow({ ...args, boardless: true, interiorLevelNr: 1, levelNr: 1 }))
  expect(result.current.showingInterior).toBe(true)
})
```

```ts
it("resumes a completed journey at its last level from the map", async () => {
  // journey with levelCount 2, stored levelNr 3, completionCount 1
  await user.click(screen.getByTestId("journey-map"))
  expect(visitLevel).toHaveBeenCalledWith("t", 2)
})
```

Read the existing specs first and reuse their `args`, render helpers and test ids; field names (`showingInterior`, `startNextLevel`) are the ones `ExpeditionFlow` already returns.

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; `CaveBackdrop` story shows both variants with and without art.
- [ ] **Step 4: Run** `yarn test src/app src/ui` — PASS.
- [ ] **Step 5: `yarn verify`, commit** — `feat: a journey level can have its own exterior and no board`

---

### Task 8: Three junior locks — the starter cave, cavern floors 2 and 4

Claude may write junior locks (`// designed by: Claude`). Junior = 1–3 actions per door. Read `docs/game-design/lock-curriculum.md` and `docs/game-design/lock-placement.md` first, and three existing junior locks (`src/game/locks/junior/*.lock`, `junior/lessons/*.lock`).

**Files:**
- Create: `src/game/locks/junior/caveLevers.lock` — the starter cave: **levers and doors only** (`toggle`), several levers and several doors; each door shut before its lever is seen; levers off the obvious path (memory: lessons show the problem first); a lock is multi-step, never a one-choice fork.
- Create: two more junior locks for cavern floors 2 and 4, names describing their idea. Floor 2 may add one mechanic the junior lessons teach (`one-way`/zipline or `fork-switch`); floor 4 is the tomb's hardest junior lock.
- Modify: `src/worldGen/spec/locks/onFloor.ts` — `LOCK_BINDINGS` entries for the three; add `export const lockOnFloor = (name) => ({ locks: [{ lock: freeRegions(catalogueLock(name)) }], realisations: LOCK_BINDINGS[name] })` for authored floors (`lockOnMainFloor` builds on it).
- Modify: `docs/game-design/lock-placement.md` — the three locks and where they stand.

- [ ] **Step 1: Write each lock**, then `yarn lock src/game/locks/junior/<name>.lock` until it passes. A lock the check refuses is fixed while it is Claude's own; never edit a designer's lock.
- [ ] **Step 2: `yarn test src/game src/worldGen/spec`** — PASS.
- [ ] **Step 3: `yarn verify`, commit** — `feat: three junior locks for the starter tomb`

---

### Task 9: The starter tomb as cave and cavern

**Files:**
- Modify: `src/data/journeyStructure.ts` — starter tomb `levelCount: 2`
- Modify: `src/worldGen/spec/starter.ts:211-237`:
  - cave: `journey("starter_treasure_tomb").pyramid("first", { tileset: "cave", difficulty: "starter", loot: false, floors: [{ pathPuzzles: 3, encounter: "puzzle", ...lockOnFloor("caveLevers") }] })`
  - cavern floors: each gets a junior puzzle between its two tableaus — `pathPuzzles` + 1 and `nodes: [{ where: 2, encounter: "puzzle", difficulty: "junior", loot: false }]` (floor 0 keeps Ipi last); floors 2 and 4 (indexes 1 and 3) spread `lockOnFloor(<name>)`; every new room `loot: false`
- Modify: `src/data/journeys.ts:146-160` — `levels: [{ exterior: "caveMouth", board: false }, { exterior: "cavern" }]`; `levelSettings` sized as a junior board (copy a junior journey's first-level settings, e.g. `junior_1`)
- Modify: `src/data/tierFingerprints.json` — the starter hash only
- Modify: `docs/game-design/pyramid-interior-design.md` §8 and `docs/game-design/tomb-exteriors.md` — describe the tomb as it now is

- [ ] **Step 1: Author** the spec and journey data above.
- [ ] **Step 2: Bake** — `yarn generate-world`, then `yarn lock` and `yarn validate-world`. A lock floor that will not carve: report it with the error; do not weaken the lock to make it fit.
- [ ] **Step 3: Gates**
  - `yarn vitest run src/data/tierFingerprints.spec.ts` — only **starter** fails; copy its new hash into the JSON. Any other tier failing is drift: find the cause.
  - Tableaus unchanged: `git diff src/data/generatedWorld.ts` shows no change to any tableau's required fragments; hieroglyph totals in `yarn world-info` equal `/tmp/tomb-baseline-world-info.txt`.
  - `yarn verify-content` — PASS.
- [ ] **Step 4: Look** — `yarn dev`: start the starter tomb (dev jump or save with 4 map pieces), walk the cave from the Enter screen to the pillar, see the cavern exterior appear without a slide, solve its board, find a junior puzzle on starter walls between two tableaus, finish, then tap the map card and land at the cavern. Screenshots.
- [ ] **Step 5: `yarn verify`, commit** — `feat: the starter tomb is a cave and a sunlit cavern`

---

### Task 10: Art queue, backlog, changelog

**Files:**
- Modify: `docs/instructions/repaint-queue.md` — entries for `cave-mouth` and `cavern` exteriors, the `cave` tileset's floor/wall tiles (the same set a rank folder holds), and the `cave` encounter wall, in the format the queue's other entries use (`yarn repaint <key>` reads it)
- Modify: `docs/playtest-backlog.md` — what Task 9 Step 4 could not play
- Modify: `CHANGELOG.md` `## Unreleased` — one line: `- The starter treasure tomb is now hidden in a cave, behind a lever lock, before its sunlit cavern.`
- Modify: `docs/handover-tomb-redesign.md` — point at the spec and plan, list what is left (story lines, loot economy, other tiers)

- [ ] **Step 1: Write the entries.**
- [ ] **Step 2: Gate in a clean worktree** — `git worktree add ../tomb-gate tomb/cave-and-cavern && cd ../tomb-gate && yarn install && yarn verify && yarn verify-content`; remove the worktree after.
- [ ] **Step 3: Commit** — `docs: tomb art queue, playtest items and changelog`
