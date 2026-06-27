# Expedition Redesign — Implementation Plan

Companion to: `EXPEDITION_REDESIGN.md`, `PUZZLE_FAMILIES.md`, `docs/game-loop.md`, `docs/pyramid-interior-design.md`  
Status: active plan · updated 2026-06-27

---

## Resolved Decisions

| Decision | Resolution |
|----------|-----------|
| Save migration | Hard reset on V3 version bump — no migration code |
| Hieroglyphs | **Fragment model** — `hieroglyphFragments: Record<id, count>` in `useProgression`; completion derived from count ≥ tier threshold (2 for starter/junior, 3 for expert/master/wizard) |
| Map pieces | Per-journey `foundMapPiece: boolean` stays; multi-tomb mapping authored in site config (Phase 8) |
| Tomb keys (ward keys) | `tombKeys: Record<treasureId, true>` in `useProgression` — boolean, not count (each treasure is unique) |
| Mosaic pieces | `mosaicPieces: string[]` in `useProgression` — pyramid journey IDs |
| Exploration state | `solvedEdges: string[]` per site in `useJourneys` V3 |
| Entrance seal | Number-grid re-solved every visit — no seal state needed |
| Puzzle family | Sumplete only for initial build |
| Site map scope | Pyramids first; tombs as site maps in Phase 7 |
| Rollout | All 20 pyramid journeys at once |
| Carry-forward | Dropped — reintroduce only if a time-based family needs it |
| Shortcut gates | Deferred — `maxBranchFactor` tree-only for now |
| World generation | Fixed seed, dev-time script → `src/data/generatedWorld.ts`; authored rules + seeded generator + global reachability solver |
| Tomb count | 9 total (1+1+2+2+3); later tombs revealed by location key treasure |
| Tomb interiors | Site map system (same as pyramids) — Phase 7 |

---

## World Builder Gaps (audit 2026-06-27)

Gaps found between what the DSL can express, what the world generator produces, and what the game actually uses.

| Gap | Severity | Status | Notes |
|-----|----------|--------|-------|
| Ward key never placed in any tomb site config | **Blocker** | 🔜 | Gates exist in junior+ pyramids requiring `starter_ward` etc., but no tomb chest rewards `{ type: "tombKey", keyId: "starter_ward" }`. Add to tomb site configs in Phase 7/8. |
| `puzzleFamily` field ignored by assembler | **Blocker** | 🔜 | 200+ floor configs set `puzzleFamily: "tableau"` but `siteAssembler` always emits `family: "sumplete"`. Fixed by puzzle plugin system (Phase 2b). |
| Floor-key gate type dormant | Minor | 🔜 | `{ type: "floor-key" }` in `GateConfig` type, zero uses in world data. Keep or remove — currently dead code. |
| Staircase no exit-on-final-floor guardrail | Minor | 🔜 | Validator should assert last floor of every site uses `exitOrStaircase: "exit"`. Add to `siteValidator.ts`. |
| Gated section silent `hieroglyphs` default | Minor | ✅ | Assembler fallback is intentional; documented. |
| Tomb ID references unvalidated | Design debt | 🔜 | `mapPiece.tombId` strings not cross-checked against `journeys.ts` at generation time. Add to `scripts/worldGen` validation pass. |

---

## Phase 1 — Site Map Generator, Renderer, and Interaction Shell ✅

Types, validator, assembler, nav hook, SVG renderer, explorer dot. Foundation for everything else.

See original plan for full spec. No changes.

---

## Phase 2 — Sumplete Puzzle ✅

Seeded generator, uniqueness verifier, board component with Storybook stories.

See original plan for full spec. No changes.

---

## Phase 2b — Puzzle Plugin System 🔜

**Goal:** Replace the hardcoded `SumpleteBoard` + `renderPuzzle` escape hatch with a typed plugin registry. Adding a new puzzle type = one self-contained file. No changes to `SiteMapScreen`.

### Problem

Currently `SiteMapScreen` hardcodes sumplete generation and rendering, with a `renderPuzzle?: (floor, onSolved, onCancel) => ReactNode` prop as an escape hatch for tomb tableau puzzles. This is already messy with two puzzle types; it won't scale.

### Design

Each puzzle family is a self-contained plugin object:

```typescript
// src/game/puzzlePlugin.ts
export type PuzzlePlugin<TPuzzle> = {
  family: string
  generate: (seed: number) => TPuzzle
  Component: FC<{ puzzle: TPuzzle; onSolved: () => void }>
}
```

A central registry maps family name → plugin:

```typescript
// src/game/puzzleRegistry.ts
const registry = new Map<string, PuzzlePlugin<unknown>>()
export const registerPuzzle = <T>(plugin: PuzzlePlugin<T>) => registry.set(plugin.family, plugin)
export const getPuzzlePlugin = (family: string) => registry.get(family)
```

Each family registers itself at module load:

```typescript
// src/app/PuzzleFamilies/Sumplete/plugin.ts
registerPuzzle({
  family: "sumplete",
  generate: seed => generateSumplete(3, seed, { allowZeroTargets: false }),
  Component: SumpleteBoard,
})
```

```typescript
// src/app/PuzzleFamilies/Tableau/plugin.ts
registerPuzzle({
  family: "tableau",
  generate: seed => generateTableau(seed),   // existing logic
  Component: TableauBoard,
})
```

### `SiteMapScreen` changes

Remove `renderPuzzle` prop entirely. Replace hardcoded sumplete call with:

```typescript
const plugin = getPuzzlePlugin(floorConfig.puzzleFamily ?? "sumplete")
const puzzle = useMemo(() => plugin?.generate(hashString(journeyId + edgeId)), [plugin, journeyId, edgeId])
// render: <plugin.Component puzzle={puzzle} onSolved={handlePuzzleComplete} />
```

### `siteAssembler.ts` fix

Pass `config.puzzleFamily` through to room specs (fixes the DSL gap where `puzzleFamily` was ignored).

### Build sequence

1. Define `PuzzlePlugin<T>` type and registry (`src/game/puzzleRegistry.ts`)
2. Create `src/app/PuzzleFamilies/Sumplete/plugin.ts` — wraps existing generator + board
3. Remove `renderPuzzle` prop from `SiteMapScreen`; use registry lookup instead
4. Fix `siteAssembler` to pass `config.puzzleFamily` to puzzle room nodes
5. Phase 7 adds `src/app/PuzzleFamilies/Tableau/plugin.ts` — tableau registers itself, no other files change

---

## Phase 3 — V3 State + Wire Sumplete into Site Map 🔜

**Goal:** New state shapes live. Sumplete puzzle nodes work inside the site map shell. Tested via `SiteMapScreen` in Storybook / dev route.

### `src/app/state/useProgression.ts` (new)

```typescript
type ProgressionState = {
  hieroglyphFragments: Record<string, number>  // hieroglyphId → fragments found
  tombKeys: Record<string, true>               // treasureId → collected (ward keys)
  discoveredTombs: string[]                    // tombJourneyIds revealed by location keys
  mosaicPieces: string[]                       // pyramid journey IDs
}
```

Key derived queries:
```typescript
// Fragment threshold: starter/junior = 2, expert/master/wizard = 3
isHieroglyphComplete(hieroglyphId: string): boolean
hieroglyphProgress(hieroglyphId: string): { found: number; required: number }
hasTombKey(treasureId: string): boolean
isTombDiscovered(tombJourneyId: string): boolean
```

Backed by `useGameStorage` under `"pyramid-scheme-progression"`.

### `src/app/state/useJourneys.ts` — V3 shape

```typescript
type StoredJourneyStateV3 = {
  journeyId: string
  completionCount: number
  foundMapPiece: boolean
  active: boolean
  solvedEdges: string[]    // edge IDs solved in the site map — permanent
  position: string | null  // current node ID
}
```

- Version bump to `storageVersion === 3`
- On version mismatch: hard reset (no migration)
- New API: `markEdgeSolved(edgeId)`, `getSolvedEdges(journeyId)`, `updatePosition(journeyId, nodeId)`

### `src/data/journeys.ts` — extend `PyramidJourney`

Add `siteConfig?: SiteConfig` (additive, backward compatible).

### `src/app/SiteMap/SiteMapScreen.tsx` (new)

- Wires `SiteMapView` + `ExplorerDot` + puzzle launch
- Puzzle node → launch `SumpleteBoard`
- Exit node → `onSiteComplete`
- On puzzle solve: `markEdgeSolved` + advance dot
- Treasure node dispatch: hieroglyph fragment → `addFragment`, mosaic → `collectMosaicPiece`, ward key → `addTombKey`

---

## Phase 4 — Entrance Seal + Feature-Flag Seam

**Goal:** A real pyramid journey runs the entrance seal then opens the site map.

### Flow

1. Player taps pyramid → `PyramidExpedition`
2. If `journey.siteConfig` set: run number-grid as entrance seal
3. On seal solved: render `SiteMapScreen` with generated layout
4. On site complete: call `completeLevel()` / `onJourneyComplete`

### `src/data/siteConfigs.ts` (new)

Authored `SiteConfig` entries for all 20 pyramid journeys. For Phase 4, every config is `floors: 1`, `maxBranchFactor: 0` (linear spine). Ward gate entries left empty — filled in Phase 5d.

**Note:** these configs will eventually be replaced by `src/data/generatedWorld.ts` output (Phase 9). Author them manually now; the generator will reproduce them deterministically later.

### `src/app/PyramidExpedition.tsx` — feature-flag fork

```typescript
if (journey.siteConfig) → SiteMapScreen path
else → existing flat-level loop  // kept intact until all 20 have siteConfig
```

---

## Phase 5 — Structural Complexity

Each structural verb debuts in easy-math territory. Sub-phases are individually shippable.

### 5a — Forks

- Assembler handles `maxBranchFactor > 0`
- `useSiteNavigation` computes branch silhouettes at fork nodes
- `SiteMapView` renders silhouette node types
- Property test: all outputs satisfy `noAllBlandFork`
- Update `siteConfigs.ts`: enable forks for junior+ pyramids

### 5b — Seals (local chest keys)

- Assembler places seal locks solvable-by-construction (key always reachable before gate)
- `useSiteNavigation` checks `sealKeys` (per-site inventory) for gate traversal
- `useJourneys` V3: `collectSealKey(siteId, keyId)` / `hasSealKey(siteId, keyId)` — seal keys are per-site, discarded on exit
- Update `siteConfigs.ts`: enable seal gates for expert+ pyramids

### 5c — Floors and Stairheads

- Assembler handles `floors > 1`; stairhead nodes connect floors
- `SiteMapScreen` animates camera pan downward on stairhead tap
- Update `siteConfigs.ts`: enable multi-floor for expert+ pyramids

### 5d — Wards (cross-site keys)

- `SiteEdge.gateType: "ward"` + `requiredKeyId` points to a `treasureId` in `useProgression.tombKeys`
- `useSiteNavigation` checks `tombKeys` from `useProgression` for ward traversal
- `SiteMapView` renders ward gate with locked-door icon + category label
- Ward visibility rule: category shown always; specific treasure name shown when player is within one tier
- Validator `wardSatisfiability` property-tested across multi-site sequences
- Update `siteConfigs.ts`: add ward gates to branch endpoints for junior+ pyramids

---

## Phase 6 — Pyramid Reward Economies

**Goal:** All three pyramid reward types live and correct. Fragment system replaces probabilistic hieroglyph drops.

### Hieroglyph fragment nodes

Treasure node variant `{ type: "treasure", reward: { fragment: { hieroglyphId: string } } }`.

`SiteMapScreen` on treasure collect: `useProgression.addFragment(hieroglyphId)`. If `isHieroglyphComplete(id)` becomes true → show completion moment in UI.

Remove `src/app/PyramidLevel/inventoryLootLogic.ts` — fully replaced by authored fragments.

### Map pieces

`PyramidExpedition` on site complete: check if this site is the authored map-piece carrier for the journey (`siteConfig.mapPiece === true`). If so, `useJourneys.findMapPiece(journeyId)`.

Remove `src/app/PyramidLevel/mapPieceLogic.ts` — probabilistic system replaced.

### Mosaic tiles

`SiteMapScreen` on treasure collect: `{ reward: { mosaicTiles: number } }` → `useProgression.collectMosaicTiles(pyramidJourneyId, count)`.

Critical path always ends in a mosaic tile node. Branch endpoints without fragments or seal keys get mosaic tile nodes.

### Ward keys

`SiteMapScreen` on treasure collect: `{ reward: { wardKey: treasureId } }` → `useProgression.addTombKey(treasureId)`.

**Note:** ward key treasures are in tombs, not pyramids. This wiring is used in Phase 7 when tomb interiors ship.

---

## Phase 7 — Tomb Interiors as Site Maps

**Goal:** Tomb journeys use the same `SiteLayout` system as pyramids. Tableau puzzle rooms are puzzle nodes. Treasure rooms are treasure nodes.

### Site map for tombs

Tomb site maps differ from pyramid site maps:
- No entrance seal (tomb is opened by map pieces, not a puzzle)
- `puzzle` nodes run tableau formula puzzles (existing `TombLevel` system), not Sumplete
- `puzzle` node locked if required hieroglyph is incomplete → `NodeState: "revealed-unreachable"` with reason `"incomplete-hieroglyph"`
- `treasure` nodes grant tomb treasures (ward keys or location keys)
- Sections map to linear branches; internal seal gates connect sections

### New node/treasure types

```typescript
// Add to NodeType
export type NodeType = "puzzle" | "fork" | "gate" | "treasure" | "stairhead" | "exit" | "tableau"

// Treasure reward variant
type TreasureReward =
  | { fragment: { hieroglyphId: string } }
  | { mosaicTiles: number }
  | { mapPiece: true }
  | { wardKey: string }       // treasureId — opens a pyramid floor
  | { locationKey: string }   // tombJourneyId — reveals a new tomb

// Tableau node requires hieroglyphs to be complete
type TableauNode = SiteNode & {
  type: "tableau"
  requiredHieroglyphs: string[]  // hieroglyphIds
}
```

### `src/data/tombSiteConfigs.ts` (new)

Authored `SiteConfig` entries for all 9 tombs. Each config specifies sections (as branch structure), tableau counts per section, gating type, and which treasure is the location key (if any).

### State

Tomb sites use the same `solvedEdges` + `position` tracking as pyramid sites — already in `useJourneys` V3.

`useProgression.isTombDiscovered(tombJourneyId)` controls whether the tomb appears on the Travel screen. Starter/junior tombs start as `discovered`. Expert/master/wizard second and third tombs start undiscovered.

### Tomb entry gate

Tomb entry check: `mapPiecesFound >= piecesRequired`. `piecesRequired` authored on `TreasureTombJourney`. Currently the same 4-piece logic, but now per-tomb.

---

## Phase 8 — Multi-Tomb Progression + Location Keys

**Goal:** Location key treasures reveal new tombs. Map pieces for later tombs appear on deep floors. `piecesRequired` is flexible per tomb.

### Location keys

When `SiteMapScreen` collects a `{ locationKey: tombJourneyId }` treasure:
- `useProgression.discoverTomb(tombJourneyId)`
- Travel screen updates to show the new tomb (with a "discovered" reveal animation)

### Map pieces on deep floors

`SiteConfig` treasure nodes can carry `{ mapPiece: { forTomb: tombJourneyId } }`.

`useProgression` tracks map pieces per tomb: `mapPiecesFound: Record<tombJourneyId, number>`.

Tomb entry check becomes: `useProgression.mapPiecesFound[tombId] >= tomb.piecesRequired`.

### `TreasureTombJourney.piecesRequired`

Field already exists in `journeys.ts` semantically; make it explicit in the type:

```typescript
export type TreasureTombJourney = {
  // ... existing fields
  piecesRequired: number   // new — defaults to 4 if absent
}
```

Starter/junior tombs: `piecesRequired: 4`. Later tombs in expert/master/wizard: `piecesRequired: 2–3`.

---

## Phase 9 — World Generator

**Goal:** Replace hand-authored `siteConfigs.ts` and `tombSiteConfigs.ts` with a deterministic, validated generated world.

### `scripts/generateWorld.ts`

```
yarn generate-world
  → reads TIER_TEMPLATES, FRAGMENT_SPREAD, WARD_MIX, TOMB_TEMPLATES (authored rule files)
  → generates: site layouts, fragment placements, ward assignments, map piece placements
  → runs global reachability solver (forward-pass BFS from initial state)
  → if solver fails: reports broken constraint + tries next seed
  → writes src/data/generatedWorld.ts
```

### Authored rule files

**`src/data/generatorRules.ts`** — single file containing:
- `TIER_TEMPLATES`: spine ratio, fork count range, branch depth, allowed gates, max floors per tier
- `FRAGMENT_SPREAD`: fragments per hieroglyph by tier, allowed pyramid tiers, max per journey/site
- `WARD_MIX`: treasure tier → target pyramid tier distribution (totals must sum to 36 ward keys)

**`src/data/tombTemplates.ts`** — tomb section structure:
- Section count, tableau count per section, gating type per section
- `piecesRequired` per tomb
- Hieroglyph pool read from existing `TOMB_SYMBOLS` in `tableaus.ts` — not duplicated here

### `src/data/generatedWorld.ts` (generated file)

```typescript
// Generated by scripts/generateWorld.ts — do not edit by hand
// Seed: 0x4E696C65 · Generated: <date>
export const SITE_LAYOUTS: Record<string, SiteLayout> = { ... }
export const FRAGMENT_PLACEMENTS: FragmentPlacement[] = [ ... ]
export const WARD_ASSIGNMENTS: WardAssignment[] = [ ... ]
export const MAP_PIECE_PLACEMENTS: MapPiecePlacement[] = [ ... ]
```

### Global reachability solver

```typescript
// src/game/worldValidator.ts
export const validateWorld = (world: GeneratedWorld): ValidationResult
// Forward-pass BFS: start from initial state, collect all reachable content,
// assert: all fragments reachable, no circular unlock chains, no dead ends
```

**CI:** `yarn validate-world` re-runs the solver against the committed `generatedWorld.ts`. Fails if rules changed without regenerating.

---

## Phase 10a — Exterior Journey Path Map (Bezier Curve)

**Goal:** Each journey (pyramid or tomb) is displayed as a bezier curve with site nodes along it. Replaces or supplements the current tile-based journey progress display.

### Concept

A bezier path represents the physical route of a journey through the landscape. Individual sites (pyramids/tomb floors) appear as nodes along the curve. The explorer dot follows the curve between sites as levels are completed.

### `src/app/JourneyMap/JourneyPathView.tsx` (new)

- SVG component: renders a cubic bezier path for a single journey
- Control points: authored per journey (or procedurally derived from tier/index)
- Site nodes: spaced along the curve by `t` parameter
- Explorer dot: interpolated `t` value between `completionCount` and `completionCount+1`
- Current node: highlighted; completed nodes: filled; future nodes: faded

### Data

Control points for each journey path can be authored as `[p0, p1, p2, p3]` in `journeyStructure.ts` or as a separate authored data file. No worldGen involvement needed — these are layout-only.

### `src/app/JourneyMap/WorldMapView.tsx` (new)

- All journey paths rendered simultaneously on a shared canvas/SVG
- Pan + zoom for navigation between tiers
- Tapping a site node on a completed/active journey launches that expedition

---

## Phase 10 — Journey Map + Hub + Fast-Travel

**Goal:** The journey map is the full exploration hub. New-paths badge surfaces when a newly acquired tomb key unlocks previously blocked ward gates.

### `src/app/JourneyMap/JourneyMapView.tsx`

Sites as nodes, expedition path as edges — reuses `SiteMapView` primitive at one zoom out.
- First run: only next site is `reachable`
- After `completionCount > 0`: hub mode — all sites directly reachable

### `src/app/JourneyMap/NewPathsBadge.tsx`

Per-journey badge when a newly acquired tomb key satisfies a previously blocked ward in that journey. Data: validator forward-pass diffed before/after key acquisition.

### `src/app/pages/Travel.tsx`

Replace `MapButton` with `JourneyMapView` for V3 journeys.

---

## What's explicitly out of scope for this build

- **Carry-forward** — dropped; reintroduce only if a time-based puzzle family genuinely needs it
- **Shortcut gates** — `maxBranchFactor` generates trees only; reconnecting branches deferred
- **Additional puzzle families** — Sumplete only for pyramid puzzles; balance scale, nonogram, etc. are a separate future track
- **Puzzle family difficulty scaling** — Sumplete parameters authored per `siteConfig`; no dynamic curve
- **Treasure passive effects redesign** — effects currently use old loot model; redesign to theme-based effects deferred (see `docs/pyramid-interior-design.md` §11 Q8)

---

## Build order summary

| Phase | Deliverable | Status | Key output |
|-------|------------|--------|------------|
| 1 | Site types, validator, assembler, nav hook, SVG, explorer dot | ✅ | `siteTypes.ts`, `siteValidator.ts`, `siteAssembler.ts`, `useSiteNavigation.ts`, `SiteMapView.tsx` |
| 2 | Sumplete generator + board | ✅ | `generateSumplete.ts`, `SumpleteBoard.tsx` |
| 2b | Puzzle plugin system | 🔜 | `puzzleRegistry.ts`, `Sumplete/plugin.ts`; removes `renderPuzzle` prop; fixes assembler ignoring `puzzleFamily` |
| 3 | V3 state (fragments, tomb keys, mosaic), `SiteMapScreen` | ✅ | `useProgression.ts`, `useJourneys.ts` V3, `SiteMapScreen.tsx` |
| 4 | Entrance seal, feature-flag fork, 20 linear `siteConfig` entries | ✅ | `generatedWorld.ts` (replaced `siteConfigs.ts`), `PyramidExpedition.tsx` fork |
| 5a | Forks — fork nodes at branch junctions; junior+ journeys get branches | ✅ | Assembler tracks `attachedAt`, corridor junctions → fork; `SideSection.endReward`; generator adds branches |
| 5b | Seals — floor-key gates for expert+ pyramids | ✅ | Generator: key-holder + mapPiece + gated section per expert+ journey |
| 5c | Floors + stairheads — SiteConfig = FloorConfig[], floor-aware edge IDs | ✅ | SiteMapScreen multi-floor state; stairhead tap advances floor; expert+ get floor 2 |
| 5d | Wards — tombKeys wired into gridNavigation | ✅ | completeCell externalKeys param; SiteMapScreen passes wardKeys; tombKeyIds on ProgressionAPI |
| 6 | Pyramid reward economies | ✅ | Fragment nodes, mosaic tiles, map pieces (tombId), ward key wiring; `inventoryLootLogic.ts`+`mapPieceLogic.ts` still present for legacy flat-level fallback |
| 7 | Tomb interiors as site maps | ✅ | `journeyStructure.ts` (single source of truth), `buildTombConfigs()`, `renderPuzzle` prop on SiteMapScreen → replaced by plugin registry in 2b; TombExpedition V3 fork; 9 tombs in generatedWorld; **add ward key chest rewards to tomb site configs** |
| 8 | Multi-tomb progression + location keys | 🔜 | `piecesRequired` per tomb (done), map pieces on deep floors, tomb discovery flow |
| 9 | World generator | ✅ | `scripts/worldGen/` DSL+constraintResolver+worldSpec+configBuilder+fragmentAssigner; `generatedWorld.ts` (20 map pieces, 20 mosaic, 157 fragments); WORLD_TARGETS in worldSpec; **add tomb ID cross-validation + staircase exit guardrail** |
| 10a | Exterior journey path map (bezier curve) | 🔜 | `JourneyPathView.tsx`, `WorldMapView.tsx`, bezier-spaced site nodes, explorer dot interpolation |
| 10 | Journey map + hub + fast-travel + new-paths badge | 🔜 | `JourneyMapView.tsx`, `NewPathsBadge.tsx`, `useFastTravel.ts` |
