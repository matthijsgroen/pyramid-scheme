# Expedition Redesign — Implementation Plan

Companion to: `EXPEDITION_REDESIGN.md`, `PUZZLE_FAMILIES.md`, `docs/game-loop.md`, `docs/pyramid-interior-design.md`  
Status: active plan · updated 2026-06-29

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

## Gameplay Completeness Audit (2026-06-29)

Full end-to-end audit of what a player can actually do.

| Feature | Status | Notes |
|---------|--------|-------|
| Pyramid start → site map → puzzles → exit → complete | ✅ | Full flow works |
| Tomb discovery via map pieces | ✅ | First tomb of each tier auto-discovered; later via location keys (Phase 8) |
| Tomb site map flow (V3) | ✅ | Multi-floor, stairheads, exit all wired |
| Ward gates (tomb keys gate pyramid sections) | ✅ | `completeCell` checks `wardKeys` from `useProgression` |
| Ward key delivery from completed tomb | ✅ | Fixed 2026-06-29 — `buildTombConfigs` now sets `mainEndReward: { type: "tombKey" }` on last floor |
| Multi-floor descent (stairheads) | ✅ | Works; no floor transition animation yet |
| Hieroglyph fragments, mosaic pieces, map pieces tracked | ✅ | All collected and persisted |
| Interior re-entry after back-out | ✅ | `interiorLevelNr` persists through `completeLevel`; re-entry check works |
| Location keys → discover later tombs | ✅ | Works via mapPiece — first collection triggers discoverTomb; all secondary tombs covered in worldSpec |
| Map pieces on deep pyramid floors | ✅ | Map pieces authored as site nodes in worldSpec (not loot drops); gated behind ward keys |
| Floor-key gates used in world data | ❌ | Phase 8+ — `floor-key` gate type exists and fully implemented in assembler/gameplay but world generator doesn't emit any yet; used only in Storybook |

## World Builder Gaps (audit 2026-06-27, updated 2026-06-29)

Gaps found between what the DSL can express, what the world generator produces, and what the game actually uses.

| Gap | Severity | Status | Notes |
|-----|----------|--------|-------|
| Ward key never placed in any tomb site config | **Blocker** | ✅ | Fixed 2026-06-29: `buildTombConfigs` now places `{ type: "tombKey", keyId }` as `mainEndReward` on last floor |
| `puzzleFamily` field ignored by assembler | **Blocker** | ✅ | Fixed in Phase 2b — assembler passes `config.puzzleFamily` through to room nodes |
| Floor-key gate type dormant in world data | Minor | 🔜 | Fully implemented in engine; zero uses in generated world. Add to expert+ pyramid configs in Phase 8+. |
| Staircase no exit-on-final-floor guardrail | Minor | ✅ | `validateRewardCounts` now asserts last floor of every site uses `exitOrStaircase: "exit"` |
| Gated section silent `hieroglyphs` default | Minor | ✅ | Assembler fallback is intentional; documented. |
| Tomb ID references unvalidated | Design debt | ✅ | `validateRewardCounts` cross-checks every `mapPiece.tombId` against known journey IDs |

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

Per-room puzzle settings live in the site config and flow through to the plugin:

```typescript
// src/game/siteTypes.ts — extend RoomSpec / FloorConfig
export type PuzzleSettings = {
  difficulty?: "easy" | "medium" | "hard"   // controls generator parameters
  theme?: string                             // passed to Component for visual styling
  // family-specific overrides can be added here without changing the plugin contract
}
```

Each puzzle family is a self-contained plugin object typed on its own puzzle format and settings:

```typescript
// src/game/puzzlePlugin.ts
export type PuzzlePlugin<TPuzzle, TSettings extends PuzzleSettings = PuzzleSettings> = {
  family: string
  generate: (seed: number, settings: TSettings) => TPuzzle
  Component: FC<{ puzzle: TPuzzle; settings: TSettings; onSolved: () => void }>
}
```

A central registry maps family name → plugin:

```typescript
// src/game/puzzleRegistry.ts
const registry = new Map<string, PuzzlePlugin<unknown, PuzzleSettings>>()
export const registerPuzzle = <T, S extends PuzzleSettings>(plugin: PuzzlePlugin<T, S>) =>
  registry.set(plugin.family, plugin as PuzzlePlugin<unknown, PuzzleSettings>)
export const getPuzzlePlugin = (family: string) => registry.get(family)
```

Each family registers itself at module load:

```typescript
// src/app/PuzzleFamilies/Sumplete/plugin.ts
registerPuzzle({
  family: "sumplete",
  generate: (seed, settings) => generateSumplete(
    settings.difficulty === "hard" ? 4 : 3,
    seed,
    { allowZeroTargets: false }
  ),
  Component: ({ puzzle, onSolved }) => <SumpleteBoard {...puzzle} onSolved={onSolved} />,
})
```

```typescript
// src/app/PuzzleFamilies/Tableau/plugin.ts
registerPuzzle({
  family: "tableau",
  generate: (seed, settings) => generateTableau(seed, settings),
  Component: ({ puzzle, settings, onSolved }) => <TableauBoard {...puzzle} theme={settings.theme} onSolved={onSolved} />,
})
```

### `SiteMapScreen` changes

Remove `renderPuzzle` prop entirely. Replace hardcoded sumplete call with:

```typescript
const plugin = getPuzzlePlugin(floorConfig.puzzleFamily ?? "sumplete")
const settings = activePuzzlePos ? getPuzzleSettings(grid, activePuzzlePos) : null
const puzzle = useMemo(
  () => plugin?.generate(hashString(journeyId + edgeId), settings ?? {}),
  [plugin, journeyId, edgeId, settings]
)
// render: <plugin.Component puzzle={puzzle} settings={settings} onSolved={handlePuzzleComplete} />
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

## Phase 9 — World Generator (DSL + Constraint Solver)

**Goal:** The worldSpec DSL is the single source of truth. The solver fills in what isn't authored, validates the result, and fails loudly with precise diagnostics when constraints can't be satisfied.

### Core design principle

- **Authored = hard constraint.** Every value you write in `worldSpec.ts` must be honoured or the solver exits with an error naming the exact rule and the location where it failed.
- **Unspecified = solver fills in freely.** The solver makes the simplest valid choice for any unspecified field.
- **Cascade = provenance.** Every resolved value tracks which rule set it (global → tier → journey → pyramid → floor). Errors cite the source rule, e.g.: *"Fragment budget exhausted on `starter_1` pyramid 3 — loosen `pathPuzzles` or `sideSections` at `tier("starter").pyramid(3)`"*.
- **No silent auto-correct.** The current `autoCorrect` phase that silently adds chest paths is replaced by an explicit error if the fragment budget can't be met within authored constraints.

### DSL scope matrix (full orthogonality)

Every property is specifiable at every level. Specificity (lower = overridable):

| Rank | Scope |
|------|-------|
| 1 | `global` |
| 2 | `global + floor` |
| 3 | `tier` |
| 4 | `tier + floor` |
| 5 | `journey` |
| 6 | `journey + floor` |
| 7 | `tier + pyramid` |
| 8 | `tier + pyramid + floor` |
| 9 | `journey + pyramid` |
| 10 | `journey + pyramid + floor` |

Missing scopes to add to `dsl.ts`: `global().floor()`, `tier(x).floor()`, `journey(x).floor()`.

### Gate spec: tomb reference, not key ID

```typescript
// Before (brittle, key ID hardcoded):
gate: { type: "tomb-key", wardKeyId: "starter_ward" }
// After (solver picks which key from that tomb):
gate: { type: "tomb-key", tombId: "starter_treasure_tomb" }
```

If a tomb issues multiple keys, the solver selects which satisfies the gate based on the forward-reachability pass.

### Density → branch count

`sideSections: "sparse" | "normal" | "dense"` translates to a number of side branches. Solver fills in puzzle count and reward per branch.

### Ward key delivery (tomb final floor)

Tomb final floor authors `puzzleFamily: "crocodiles"` (the compare/crocodile-lake puzzle, registered as a plugin). After that puzzle, a chest node contains the ward key treasure. Authored via:

```typescript
journey("starter_treasure_tomb").pyramid("last").floor(1, {
  puzzleFamily: "crocodiles",
  mainEndReward: { type: "tombKey", tombId: "starter_treasure_tomb" },
})
```

### Solver pipeline

```
yarn generate-world
  1. Resolve all constraints (cascade, specificity)
  2. Validate hard constraints are mutually satisfiable — exit with error if not
  3. Fill in solver decisions for unspecified fields
  4. Assign fragments to chest slots — error if budget can't fit
  5. Forward-pass BFS reachability check — error if anything unreachable
  6. Write src/data/generatedWorld.ts
```

**CI:** `yarn validate-world` re-runs step 5 against the committed `generatedWorld.ts`. Fails if reachability breaks.

### `src/data/generatedWorld.ts` (generated file)

```typescript
// Generated by scripts/generateWorld.ts — do not edit by hand
export const SITE_CONFIGS: Record<string, SiteConfig[]> = { ... }
export const FRAGMENT_PLACEMENTS: FragmentPlacement[] = [ ... ]
```

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

## SiteMapScreen Refactor Plan

`SiteMapScreen` currently handles six concerns in one component (~280 lines). As Phase 8 adds tomb discovery flow and Phase 10 adds journey-map entry, these will grow the file further. This plan decomposes it into focused units.

### Current responsibilities

| Concern | Lines | Proposed home |
|---------|-------|---------------|
| Floor assembly + edge replay | 67–83 | `useAssembledFloor(journeyId, floorConfig, seed, floor, allEdges, wardKeys)` |
| Explorer position derivation | 84–91 | Inline → input to `useArrival` |
| Arrival scheduling | 95–108 | `useArrival(explorerPos, grid)` → `scheduleArrival(path, cb)` |
| Puzzle plugin lookup + generate | 110–124 | `usePuzzle(grid, activePuzzlePos, journeyId, floor, floorConfig)` |
| Cell-click routing | 126–175 | Keep in screen; calls hooks above |
| Chest/loot 3-state machine | 97–99, 239–270 | `<ChestRewardFlow reward onDismiss />` sub-component |
| Exit iris transition | 100, 214 | Stays inline (two lines) |

### Proposed hooks

```
useAssembledFloor(journeyId, floorConfig, seed, floor, allEdges, wardKeys)
  → { grid, explorerPos }

useArrival(explorerPos, grid)
  → scheduleArrival(path, cb)   // owns arrivalTimerRef

usePuzzle(grid, activePuzzlePos, journeyId, floor, floorConfig)
  → { puzzlePlugin, activePuzzle, ActivePuzzleComponent, useRenderPuzzleFallback }
```

### Proposed sub-component

```tsx
<ChestRewardFlow
  reward={pendingReward}         // null = hidden
  onDismiss={() => setPendingReward(null)}
/>
```
Owns `chestOpened`, `showLoot`, `lootTimerRef` — removes the 3-state machine from the screen.

### Migration order

1. Extract `useAssembledFloor` — pure derivation, no side effects, easy to test.
2. Extract `<ChestRewardFlow>` — self-contained, reduces screen JSX by ~35 lines.
3. Extract `usePuzzle` — depends on grid from step 1.
4. Extract `useArrival` — wraps `arrivalTimerRef`; migration is mechanical.
5. Screen body becomes ~120 lines of routing + JSX wiring.

**Do this before Phase 10** — journey-map entry will add a sixth panel to the screen and is much easier to slot in after step 5.

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
| 2b | Puzzle plugin system | ✅ | `puzzleRegistry.ts`, `Sumplete/plugin.tsx`; `renderPuzzle` prop kept as fallback; assembler now uses `config.puzzleFamily` |
| 3 | V3 state (fragments, tomb keys, mosaic), `SiteMapScreen` | ✅ | `useProgression.ts`, `useJourneys.ts` V3, `SiteMapScreen.tsx` |
| 4 | Entrance seal, feature-flag fork, 20 linear `siteConfig` entries | ✅ | `generatedWorld.ts` (replaced `siteConfigs.ts`), `PyramidExpedition.tsx` fork |
| 5a | Forks — fork nodes at branch junctions; junior+ journeys get branches | ✅ | Assembler tracks `attachedAt`, corridor junctions → fork; `SideSection.endReward`; generator adds branches |
| 5b | Seals — floor-key gates for expert+ pyramids | ✅ | Generator: key-holder + mapPiece + gated section per expert+ journey |
| 5c | Floors + stairheads — SiteConfig = FloorConfig[], floor-aware edge IDs | ✅ | SiteMapScreen multi-floor state; stairhead tap advances floor; expert+ get floor 2 |
| 5d | Wards — tombKeys wired into gridNavigation | ✅ | completeCell externalKeys param; SiteMapScreen passes wardKeys; tombKeyIds on ProgressionAPI |
| 6 | Pyramid reward economies | ✅ | Fragment nodes, mosaic tiles, map pieces (tombId), ward key wiring; `inventoryLootLogic.ts`+`mapPieceLogic.ts` still present for legacy flat-level fallback |
| 7 | Tomb interiors as site maps | ✅ | `journeyStructure.ts` (single source of truth), `buildTombConfigs()`, `renderPuzzle` prop on SiteMapScreen → replaced by plugin registry in 2b; TombExpedition V3 fork; 9 tombs in generatedWorld; **add ward key chest rewards to tomb site configs** |
| 8 | Multi-tomb progression + location keys | 🔜 | `piecesRequired` per tomb (done), map pieces on deep floors, tomb discovery flow |
| 9a | DSL full orthogonality | 🔜 | Add `global().floor()`, `tier().floor()`, `journey().floor()` scopes; specificity rank 1–10; gate spec uses `tombId` not `wardKeyId` |
| 9b | Solver hard constraints + error reporting | 🔜 | Replace silent autoCorrect with errors citing source rule + location; provenance tracking per resolved value |
| 9c | Density → branch count | 🔜 | `"sparse"\|"normal"\|"dense"` → branch count in configBuilder |
| 9d | Crocodiles plugin + tomb chest node | 🔜 | `Crocodiles/plugin.tsx`; assembler emits chest after final tomb-floor puzzle; worldSpec authors `puzzleFamily:"crocodiles"` + ward key reward |
| 9e | Re-run world gen + reachability check | 🔜 | Updated worldSpec with ward keys, re-generate `generatedWorld.ts`; `yarn validate-world` passes |
| 10a | Exterior journey path map (bezier curve) | 🔜 | `JourneyPathView.tsx`, `WorldMapView.tsx`, bezier-spaced site nodes, explorer dot interpolation |
| 10 | Journey map + hub + fast-travel + new-paths badge | 🔜 | `JourneyMapView.tsx`, `NewPathsBadge.tsx`, `useFastTravel.ts` |
