# Expedition Redesign — Implementation Plan

Companion to: `EXPEDITION_REDESIGN.md` (design), `PUZZLE_FAMILIES.md` (puzzle families)  
Status: active plan · decisions resolved via grilling session 2026-06-23

---

## Resolved Decisions

| Decision | Resolution |
|----------|-----------|
| Save migration | Hard reset on V3 version bump — no migration code |
| Hieroglyphs | Existing `useInventory` — no duplicate state |
| Map pieces | Existing per-journey `foundMapPiece: boolean` — unchanged semantics |
| Tomb keys | New global `useProgression` hook — separate from inventory |
| Mosaic pieces | Same `useProgression` hook — permanent collectibles keyed by pyramid journey ID |
| Exploration state | `solvedEdges: string[]` per journey in `useJourneys` V3 |
| Entrance seal | Number-grid re-solved every visit — no seal state needed |
| Puzzle family | Sumplete only for initial build |
| Site map scope | Pyramids only — tombs keep existing system for now |
| Rollout | All 20 pyramid journeys at once |
| Carry-forward | Dropped entirely — reintroduce only if a time-based family needs it |
| Shortcut gates | Deferred — `maxBranchFactor` tree-only for now |

---

## Phase 1 — Site Map Generator, Renderer, and Interaction Shell

**Goal:** A standalone, fully testable site map system — types, seeded generator, validator, SVG renderer, and interaction hook — with no connection to the live game yet. Validated through unit tests and Storybook stories. This is the foundation everything else plugs into.

### 1a — Types (`src/game/siteTypes.ts`)

Pure data shapes, no React. Keep it minimal — no carry-forward fields, no shortcut-gate fields.

```typescript
export type NodeType = "puzzle" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

export type PuzzleFamily = "sumplete"  // extend when new families are added

export type SiteNode = {
  id: string
  type: NodeType
  floor: number          // 0 = ground floor (entrance level)
  gridX: number          // column in the floor grid for layout
  family?: PuzzleFamily  // only when type === "puzzle"
}

export type GateType = "seal" | "ward"

export type SiteEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  gateType?: GateType
  requiredKeyId?: string  // seal: chest key ID; ward: tomb key ID
}

export type SiteLayout = {
  siteId: string
  nodes: SiteNode[]
  edges: SiteEdge[]
  entranceNodeId: string
  exitNodeId: string
  criticalPath: string[]  // ordered node IDs entrance → exit
}

export type SiteConfig = {
  floors: number
  allowedNodeTypes: NodeType[]
  maxBranchFactor: number    // 0 = linear spine only
  gates: "none" | "seal-only" | "seal+ward"
  puzzleBudget: number       // number of puzzle nodes
  puzzlePlacement: "spine-heavy" | "balanced" | "branch-heavy"
  mapPiece: boolean          // exactly one site per journey has this true
  rewards: {
    hieroglyphNodes: number  // treasure nodes that grant hieroglyphs
    mosaicDepth: number      // floor depth of the mosaic piece node (0 = entrance floor)
  }
  pins?: NodePin[]
}

export type NodePin = {
  nodeType: NodeType
  floor?: number
  gridX?: number
}

export type AssemblerFailure = {
  success: false
  reasons: ValidationReason[]
}

export type AssemblerResult = { success: true; layout: SiteLayout } | AssemblerFailure
```

### 1b — Validator (`src/game/siteValidator.ts` + `siteValidator.spec.ts`)

Pure function — takes a layout + journey context, returns pass/fail with structured reasons. No side effects, no React.

**Per-site checks:**
- `completable` — critical path openable with keys available at this journey position
- `keyBeforeGate` — every seal's chest-key node is reachable before its locked edge
- `noAllBlandFork` — every fork has ≥1 branch end that is treasure/gate/special (not just corridor)
- `mosaicReachable` — mosaic piece node exists and is reachable (may be behind wards — that's fine)

**Journey-level checks (`validateJourney`):**
- `mapPieceCoverage` — exactly one site has `mapPiece: true`; that site's piece is seal-reachable (never behind a ward)
- `mosaicCoverage` — every pyramid index has exactly one mosaic piece node across the journey

```typescript
export type ValidationReason =
  | { type: "criticalPathBlocked"; nodeId: string; missingKeyId: string }
  | { type: "keyAfterGate"; gateEdgeId: string; keyNodeId: string }
  | { type: "allBlandFork"; forkNodeId: string }
  | { type: "mapPieceNotSealReachable"; nodeId: string }
  | { type: "mapPieceMissing" }
  | { type: "mapPieceDuplicate"; siteIds: string[] }
  | { type: "mosaicMissing"; pyramidIndex: number }
  | { type: "mosaicDuplicate"; pyramidIndex: number }

export type ValidationResult = { valid: true } | { valid: false; reasons: ValidationReason[] }
```

**Tests (`siteValidator.spec.ts`):**
- Each invariant: pass case + targeted fail case with correct `ValidationReason` variant
- Journey-level: 0 map pieces → fail; 2 map pieces → fail; 1 behind ward → fail; 1 seal-reachable → pass
- Negative: manually constructed invalid layouts for each check

### 1c — Assembler (`src/game/siteAssembler.ts` + `siteAssembler.spec.ts`)

Seeded generator. Takes `SiteConfig + seed → AssemblerResult`. Calls `validateSite` on every candidate; bad seeds return `AssemblerFailure` with reasons attached — never throws.

**Phase 1 scope** (expand in Phase 4):
- `floors: 1` only
- `maxBranchFactor: 0` only (linear spine)
- `gates: "none"` only
- Solvable-by-construction: generate reachability order first, then place each lock in the already-reachable subtree

```typescript
export const assembleSite = (config: SiteConfig, seed: number): AssemblerResult
```

**Tests (`siteAssembler.spec.ts`):**
- Every output passes `validateSite` (property test: 200 seeds × stone-tier linear config)
- Determinism: same seed → identical layout
- Cosmetic variation: different seeds → different layouts
- Config with impossible budget returns `AssemblerFailure` with legible reason

### 1d — Navigation hook (`src/app/SiteMap/useSiteNavigation.ts` + spec)

Pure computation over `SiteLayout + solvedEdges`. No React context, no storage — fully unit-testable.

```typescript
type NodeState = "fogged" | "revealed-unreachable" | "reachable" | "completed"

export const useSiteNavigation = (
  layout: SiteLayout,
  solvedEdges: string[],
  inventory: { tombKeys: Record<string, number>; sealKeys: string[] }
) => ({
  nodeState: (nodeId: string) => NodeState,
  canTraverse: (edgeId: string) => boolean,
  reachableNodes: string[],
  currentFloor: number,
})
```

**Reveal grammar** (§13): completing a node reveals the **type** (not details) of the next node one step ahead. Branch endpoints at a fork show as silhouettes.

**Tests (`useSiteNavigation.spec.ts`):**
- Entrance is always `reachable` on empty `solvedEdges`
- Completing a node makes the next node `reachable`
- Node behind an unsatisfied ward is `revealed-unreachable`
- Node behind an unsatisfied seal is `revealed-unreachable`
- Node with no path from entrance is `fogged`

### 1e — SVG map component (`src/app/SiteMap/SiteMapView.tsx` + Storybook)

SVG for edges/corridors, DOM nodes for POIs, CSS transitions for fog states. Grid layout: `gridX` × `floor` → SVG coordinates. Floor 0 = widest; each deeper floor tapers (pyramid shape).

**Props:**
```typescript
type SiteMapViewProps = {
  layout: SiteLayout
  solvedEdges: string[]
  currentNodeId: string | null
  onNodeTap: (nodeId: string) => void
  inventory: { tombKeys: Record<string, number>; sealKeys: string[] }
}
```

**Storybook stories:**
- Linear 3-node path — all fogged except entrance
- Linear 3-node path — entrance completed, second node revealed
- Fork — one branch silhouetted behind ward
- Multi-floor (2 floors, stairhead visible)
- All node types visible

### 1f — Explorer dot (`src/app/SiteMap/ExplorerDot.tsx` + Storybook)

Follows node taps with ~250ms glide along the SVG edge path. Tap mid-glide → snap. Never blocks interaction.

**Props:**
```typescript
type ExplorerDotProps = {
  currentNodeId: string
  layout: SiteLayout
  // derives SVG coordinates from node gridX + floor
}
```

**Storybook stories:**
- Dot at entrance
- Dot mid-glide (use Storybook play function to simulate tap)

---

## Phase 2 — Sumplete Puzzle

**Goal:** A complete, standalone Sumplete puzzle — generator, board component, and Storybook stories — before it gets wired into the site map. Built as a self-contained unit.

### Files

**`src/game/generateSumplete.ts` + `generateSumplete.spec.ts`**
- Input: `{ gridSize: number; seed: number }`
- Output: `{ grid: number[][]; rowTargets: number[]; colTargets: number[]; solution: boolean[][] }`
- Uses `mulberry32` seeded RNG — never `Math.random()`
- Calls `uniquenessVerifier` to confirm exactly one solution
- Tests: determinism, uniqueness, all targets satisfied by solution

**`src/game/uniquenessVerifier.ts` + spec**
- Shared by all grid-family generators
- Returns solution count (capped at 2 — we only need "0", "1", or "2+")
- Tests: known-unique → 1; known-ambiguous → 2

**`src/app/PuzzleFamilies/Sumplete/SumpleteBoard.tsx` + Storybook**
- 3-state tap-cycle per cell: included → excluded → included
- Row/column target clue lights green when sum matches
- Props: `grid`, `rowTargets`, `colTargets`, `onSolved: () => void`
- Storybook stories: unsolved, partially solved, solved state

---

## Phase 3 — V3 State + Wire Sumplete into Site Map

**Goal:** New state shapes defined, Sumplete puzzle nodes live inside the site map shell. No connection to real journeys yet — tested via a new `SiteMapScreen` component that can be driven from Storybook or a dev route.

### Files to create

**`src/app/state/useProgression.ts`**
```typescript
// Global permanent progression — tomb keys and mosaic pieces
type ProgressionState = {
  tombKeys: Record<string, number>  // keyId → count
  mosaicPieces: string[]            // pyramid journey IDs collected
}
// Actions: addTombKey, hasTombKey, spendTombKey, collectMosaicPiece, hasMosaicPiece
```
Backed by `useGameStorage` under a new key `"pyramid-scheme-progression"`.

### Files to modify

**`src/app/state/useJourneys.ts`** — V3 shape
```typescript
type StoredJourneyStateV3 = {
  journeyId: string
  completionCount: number
  foundMapPiece: boolean
  active: boolean
  // NEW
  solvedEdges: string[]   // edge IDs solved in the site map
  position: string | null // current node ID
  siteConfig?: SiteConfig // authored per pyramid journey
}
```
- Version bump: `storageVersion === 3`
- On version mismatch: **hard reset** to initial state (no migration code)
- New API: `markEdgeSolved(edgeId)`, `getSolvedEdges(): string[]`, `updatePosition(nodeId)`

**`src/data/journeys.ts`** — extend `PyramidJourney`
- Add `siteConfig?: SiteConfig` (additive, backward compatible)
- Add `mapPiecePyramidIndex?: number` at journey level (which pyramid in the tier carries the map piece — authored, not shown to player)

**`src/app/SiteMap/SiteMapScreen.tsx`** (new)
- Combines `SiteMapView` + `ExplorerDot` + puzzle launch
- When current node is a `puzzle` node: launch `SumpleteBoard`
- When current node is `exit`: call `onSiteComplete`
- On puzzle solve: call `markEdgeSolved` + advance dot to next node
- On treasure node: dispatch reward effect (hieroglyphs → `addItems`, mosaic → `collectMosaicPiece`, tomb key → `addTombKey`)

---

## Phase 4 — Entrance Seal + Feature-Flag Seam

**Goal:** A real pyramid journey runs the entrance seal (existing number-grid) then opens the site map. The feature-flag fork in `PyramidExpedition.tsx` connects everything.

### Flow
1. Player taps pyramid → `PyramidExpedition`
2. If `journey.siteConfig !== undefined`: run number-grid puzzle as entrance seal (existing `Level` component, re-solved every visit)
3. On seal solved: render `SiteMapScreen` with the journey's generated layout
4. On site complete: call existing `completeLevel()` / `onJourneyComplete`

### Files to modify

**`src/app/PyramidExpedition.tsx`** — feature-flag fork
- `if (journey.siteConfig) → SiteMapScreen` path
- `else → existing flat-level loop` (kept intact until all 20 journeys have `siteConfig`)

**`src/data/siteConfigs.ts`** (new) — authored `SiteConfig` entries for all 20 pyramid journeys
- Author all 20 at once before this phase ships
- Stone-tier first authored and smoke-tested; remaining tiers follow
- Each config specifies `floors`, `puzzleBudget`, `puzzlePlacement`, `mapPiece`, `rewards`, and optional `pins`

---

## Phase 5 — Structural Complexity

Each structural verb debuts in **easy-math territory** — the first pyramid that uses it has trivial Sumplete difficulty. Sub-phases are individually shippable.

### 5a — Forks
- Assembler handles `maxBranchFactor > 0`
- `useSiteNavigation` computes branch silhouettes on fork completion
- `SiteMapView` renders silhouette node types (greyed-out icons)
- Property test: all outputs satisfy `noAllBlandFork`

### 5b — Seals (local chest keys)
- Assembler places seal locks using solvable-by-construction (key in reachable subtree before lock)
- `useSiteNavigation` checks `sealKeys` inventory for gate traversal
- `useJourneys` V3: `collectSealKey(keyId)` / `hasSealKey(keyId)` — seal keys are per-site, not global

### 5c — Floors and Stairheads
- Assembler handles `floors > 1`; stairhead nodes connect floors
- `SiteMapScreen` animates camera pan downward on stairhead tap
- Validator: no carry-forward (field doesn't exist — enforced by types)

### 5d — Wards (cross-site keys)
- `SiteEdge.gateType: "ward"` + `requiredKeyId` points to a tomb key ID in `useProgression`
- `useSiteNavigation` checks `tombKeys` from `useProgression` for ward traversal
- `SiteMapView` renders ward silhouette at fork branch ends (§13: "warded door that way")
- Validator `wardSatisfiability` property-tested against multi-site journey sequences

---

## Phase 6 — Reward Economies

**Goal:** The three economies (room / journey / game) are live and correct.

| Reward | Scope | Source | State |
|--------|-------|--------|-------|
| Hieroglyphs | Room | Treasure node `onComplete` | `useInventory.addItems()` |
| Map piece | Journey | Authored pyramid, seal-reachable treasure node | `useJourneys.findMapPiece()` (existing) |
| Mosaic piece | Game | Deepest reachable node per pyramid | `useProgression.collectMosaicPiece(pyramidId)` |

**`src/data/journeys.ts`** — `mapPiecePyramidIndex` is read here to wire the right pyramid's treasure node as the map piece source. The validator enforces it is seal-reachable.

**`src/app/PyramidLevel/mapPieceLogic.ts`** — replace probabilistic drop with authored lookup:
```typescript
// Old: random chance per level
// New: deterministic — this pyramid has the piece or it doesn't
export const pyramidHasMapPiece = (journeyId: string, journeys: Journey[]): boolean =>
  journeys.some(j => j.type === "pyramid" && j.mapPiecePyramidIndex !== undefined && j.id === journeyId)
```

---

## Phase 7 — Journey Map + Hub + Fast-Travel

**Goal:** The journey map is the same `SiteMapView` primitive one zoom out. First run: linear march (one site live at a time). Post-completion: full hub with direct fast-travel to any site.

### Files to create

**`src/app/JourneyMap/JourneyMapView.tsx`**
- Sites as nodes, expedition path as edges — reuses `SiteMapView`
- First run: only next site is `reachable`
- After `completionCount > 0`: all sites `reachable` (hub mode)

**`src/app/JourneyMap/NewPathsBadge.tsx`**
- Per-journey badge: "new paths reachable" when a newly acquired tomb key satisfies a previously blocked ward
- Data: `validateJourney` forward pass diffed before/after key acquisition — free byproduct of the validator

**`src/app/JourneyMap/useFastTravel.ts`**
- Only active when `completionCount > 0`
- Reconstructs destination state from `solvedEdges` (works because save is site-addressable)

### Files to modify

**`src/app/pages/Travel.tsx`** — replace `MapButton` with `JourneyMapView` for V3 journeys

**`src/app/state/useJourneys.ts`** — `isHubMode(journeyId): boolean` (`completionCount > 0`)

---

## What's explicitly out of scope for this build

- **Tombs as site maps** — tombs keep the existing flat tableau system until a follow-up
- **Carry-forward** — dropped; reintroduce only if a time-based puzzle family genuinely needs it
- **Shortcut gates** — `maxBranchFactor` generates trees only; reconnecting branches deferred
- **Additional puzzle families** — Sumplete only; balance scale, nonogram, sundial etc. are a separate future track
- **Puzzle family difficulty scaling** — Sumplete difficulty parameters authored per siteConfig; no dynamic curve

---

## Build order summary

| Phase | Deliverable | Tests | Storybook |
|-------|------------|-------|-----------|
| 1 | Site types, validator, assembler, nav hook, SVG map, explorer dot | `siteValidator.spec.ts`, `siteAssembler.spec.ts`, `useSiteNavigation.spec.ts` | `SiteMapView.stories`, `ExplorerDot.stories` |
| 2 | Sumplete generator + board | `generateSumplete.spec.ts`, `uniquenessVerifier.spec.ts` | `SumpleteBoard.stories` |
| 3 | V3 state, `useProgression`, `SiteMapScreen` | `useJourneys.spec.ts` | `SiteMapScreen.stories` |
| 4 | Entrance seal flow, feature-flag fork, all 20 `siteConfig` entries | Integration smoke test | — |
| 5a–d | Forks, seals, floors, wards | Property tests per sub-phase | Updated `SiteMapView.stories` |
| 6 | Reward economies | Validator coverage tests | — |
| 7 | Journey map, hub, fast-travel, new-paths badge | `useFastTravel.spec.ts` | `JourneyMapView.stories` |
