# Expedition Redesign — Implementation Plan

Companion to: `EXPEDITION_REDESIGN.md`, `PUZZLE_FAMILIES.md`, `docs/game-loop.md`, `docs/pyramid-interior-design.md`  
Status: active plan · updated 2026-06-30

---

## Resolved Decisions

| Decision | Resolution |
|----------|-----------|
| Save migration | Hard reset on V3 version bump — no migration code |
| Hieroglyphs | **Fragment model** — `hieroglyphFragments: Record<id, count>` in `useProgression`; completion derived from count ≥ per-hieroglyph threshold (varies 2–8 by tier × first-blocking tomb section; see `docs/pyramid-interior-design.md §3`) |
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
| Consumable density | 0% / 5% / 20% / 25% / 30% per tier (starter→wizard); authored via `consumableDensity()` in DSL |
| Hidden path density | Composable `hiddenPaths(level).settings(...)` declarations per tier; same density vocabulary as `sidePaths`; none=0, low=1, medium=2–3, dense=4–5 paths per pyramid |
| Side path DSL | Composable `sidePaths(level).settings(...)` — multiple density levels stack, each with own `pathPuzzles` and `end` reward type |
| Trap rooms | `RoomType: "trap"` — same nav as puzzle rooms, time-based encounter; skull icon; no warning node; health floor 1 half-heart; `canAttemptTrap()` = `currentHealth > 1`; `trapped?: boolean` flag on DSL settings() |
| PathEndHint | `"fragment" \| "treasure" \| "mosaic" \| "consumable"` — consumable type resolved by generator (Phase 14) |

---

## Gameplay Completeness Audit (2026-06-29)

Full end-to-end audit of what a player can actually do.

| Feature | Status | Notes |
|---------|--------|-------|
| Pyramid start → site map → puzzles → exit → complete | ✅ | Full flow works |
| Tomb discovery via map pieces | ✅ | First tomb of each tier auto-discovered; later via mapPiece rewards gated behind ward keys |
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

## Phases 1–9f — Completed ✅

All delivered. See git history for implementation details. Summary in build order table below.

**Known gap — per-pyramid site variation (future work):**
`generatedWorldConfigs` currently stores one `SiteConfig` per journey, not one per pyramid.
To enable distinct layouts per pyramid within a journey:
- `generatedWorldConfigs` type: `Record<string, SiteConfig[]>` (array per journey)
- `PyramidJourney.siteConfigs`: `SiteConfig[]` (was `siteConfig?: SiteConfig`)
- `SiteMapScreen` props: add `pyramidIndex: number`
- World builder: generate `levelCount` configs per journey instead of one

---

## DSL — Path density syntax (Phase 9 extension)

The existing `sideSections: "sparse" | "normal" | "dense"` scalar is replaced by composable density declarations. Multiple calls at different density levels stack — the generator creates both populations of paths.

### Density → path count

| Level | Paths per pyramid |
|---|---|
| `none` | 0 |
| `low` | 1 |
| `medium` | 2–3 |
| `dense` | 4–5 |

### `sidePaths` and `hiddenPaths`

```typescript
tier("starter").set({ consumableDensity: 0 })
  .sidePaths('low').settings({ pathPuzzles: 0, end: 'fragment' })

tier("junior").set({ consumableDensity: 0.05 })
  .sidePaths('low').settings({ pathPuzzles: 0, end: 'treasure' })
  .sidePaths('medium').settings({ pathPuzzles: 1, end: 'fragment' })
  .hiddenPaths('low').settings({ pathPuzzles: 0, end: 'treasure' })

tier("expert").set({ consumableDensity: 0.20 })
  .sidePaths('low').settings({ pathPuzzles: 0, end: 'treasure' })
  .sidePaths('medium').settings({ pathPuzzles: 1, end: 'fragment' })
  .hiddenPaths('low').settings({ pathPuzzles: 0, end: 'treasure' })

tier("master").set({ consumableDensity: 0.25 })
  .sidePaths('medium').settings({ pathPuzzles: 1, end: 'fragment' })
  .hiddenPaths('medium').settings({ pathPuzzles: 0, end: 'treasure' })

tier("wizard").set({ consumableDensity: 0.30 })
  .sidePaths('medium').settings({ pathPuzzles: 1, end: 'fragment' })
  .sidePaths('low').settings({ pathPuzzles: 0, end: 'treasure' })
  .hiddenPaths('medium').settings({ pathPuzzles: 0, end: 'treasure' })
  .hiddenPaths('low').settings({ pathPuzzles: 1, end: 'mosaic' })
```

`hiddenPaths` produces paths with `hidden: true` on the edge — invisible without Detection L1. Starter hidden paths exist in the world from generation but are never visible until the player earns Detection L1 (Master B treasure 28).

### Implementation notes

- `consumableDensity` is a fraction (0–1) of chest slots in that tier that become consumable rewards; the generator fills them proportionally across bandage / oil / trap-tool (relative weights authored separately)
- `sidePaths(level)` and `hiddenPaths(level)` calls accumulate into an array; the generator processes each entry independently and sums path counts
- Path count from `medium` is a range `[2, 3]` — generator picks per-pyramid within the range using the site seed

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

## Phase 11 — Health System

**Goal:** Session-persistent health state, half-heart UI, damage and healing plumbing. No traps yet — just the foundation.

### State — `useProgression`

```typescript
// Add to ProgressionState
currentHealth: number   // half-hearts; default 6 (3 hearts)
maxHealth: number       // half-hearts; default 6; grows with treasure perks
```

Both fields persisted to disk via `useGameStorage`. No time-based regen.

### Derived helpers

```typescript
canAttemptTrap(): boolean   // currentHealth >= 2 (at least 1 full heart)
takeTrapDamage(armorStacks: number): void
  // damage = max(1, 2 - armorStacks)  half-hearts; never below 1
heal(halfHearts: number): void
  // currentHealth = min(maxHealth, currentHealth + halfHearts)
healToFull(): void
```

### `<HealthDisplay />` (`src/ui/HealthDisplay.tsx`)

- Renders `maxHealth / 2` heart slots (full, half, empty)
- Storybook story covering 0, half, 1, 2½, 3, 6 hearts

### Storybook + unit test

- Story: all heart states
- Test: `takeTrapDamage`, `heal`, `canAttemptTrap` with and without armor stacks

---

## Phase 12 — Trap Plugin System + Arithmetic Reflex

**Goal:** Trap questions are a first-class plugin type (parallel to puzzle plugins). Arithmetic reflex is the first implementation. No trapped corridors yet — just the encounter UI.

### Design reference

`TRAP_FAMILIES.md` — full spec for trap plugin contract, time limits, and upgrade interactions.

### `src/game/trapPlugin.ts`

```typescript
export type TrapPlugin<TQuestion> = {
  family: string
  generate: (seed: number, tier: Tier, settings: TrapSettings) => TQuestion
  Component: FC<{
    question: TQuestion
    timeLimit: number       // seconds, pre-computed with insight upgrades applied
    onPass: () => void
    onFail: () => void
  }>
}
```

### `src/game/trapRegistry.ts`

Mirror of `puzzleRegistry.ts`. `registerTrap` / `getTrapPlugin`.

### Timing constants (`src/game/trapConfig.ts`)

```typescript
// ponytail: all trap timing lives here — tune before playtesting
export const TRAP_TIME_LIMITS_SECONDS: Record<Tier, number> = {
  starter: 0, junior: 0, expert: 12, master: 9, wizard: 6,
}
export const TRAP_TIME_EXTENSION_PER_INSIGHT_STACK = 1  // seconds per stack
```

### Arithmetic reflex plugin (`src/app/TrapFamilies/ArithmeticReflex/plugin.ts`)

- Generator: pick operation + operands within tier range, compute answer, generate 3 distractors (adjacent values, plausible wrong-op results)
- Component: large expression display, 4 tap targets, countdown bar
- Registers as `family: "arithmetic-reflex"`

### `<TrapEncounter />` wrapper (`src/app/TrapFamilies/TrapEncounter.tsx`)

- Looks up plugin by family, generates question with tier seed
- Applies `trapInsightStacks` to time limit before passing to plugin
- `onPass` / `onFail` callbacks bubble to caller
- Storybook story: arithmetic reflex at expert/master/wizard time limits

---

## Phase 13 — Trap Rooms

**Goal:** Trap rooms wired into site navigation and encounter flow. Health damage on fail. Hidden rooms filtered by detection level.

### Design decisions (resolved 2026-06-30)

- Traps are **`RoomType: "trap"`** — same navigation as puzzle rooms, time-based encounter instead of grid puzzle
- **No warning node** — the skull icon on the map is the player's signal; they choose to enter
- **`canAttemptTrap()`** = `currentHealth > 1` (health floor is 1 half-heart — no death, just blocked)
- **Fail:** take damage → encounter closes → room stays reachable for retry if still `canAttemptTrap()`
- **Pass:** room marks `"completed"`, freely walkable on revisit
- **Blocked (health ≤ 1):** skull shows red/locked indicator; tapping shows a game message (not Fez)
- **Trap tool** (permanent disable): deferred to Phase 14 with other consumables
- **`trapped?: boolean`** flag on DSL `settings()` — `pathPuzzles` = count of trap rooms when trapped; no mixed puzzle+trap paths for now
- **`end: 'consumable'`** added to `PathEndHint`

### `src/game/siteTypes.ts`

```typescript
// Add to RoomType
| "trap"              // timed encounter room; skull icon on map

// Add to SideSection / SubSection (worldGen/types.ts already has hidden)
trapped?: boolean     // path rooms are trap rooms (not puzzle rooms)
```

### `src/worldGen/dsl.ts`

```typescript
// Add 'consumable' to PathEndHint
export type PathEndHint = "fragment" | "treasure" | "mosaic" | "consumable"

// Add trapped to PathEntry
export type PathEntry = { density: SideIntensity; pathPuzzles: number; end: PathEndHint; trapped?: boolean }
```

### `SiteMapScreen` — trap encounter flow

```
player taps trap room
  → if canAttemptTrap(): launch <TrapEncounter />
      → onPass: markEdgeSolved(trapRoomEdgeId); room → "completed"
      → onFail: takeTrapDamage(armorStacks); room stays "reachable"
  → if !canAttemptTrap(): show game message "Not enough health"
```

### Hidden rooms — `SideSection.hidden`

`hidden: true` sections (already generated by worldGen) are excluded from the assembled floor until `detectionLevel >= 1`. For Phase 13, detection is always 0 — hidden rooms are simply never shown. Detection unlock comes in Phase 15.

### `generatedWorld.ts` updates

Add `trapped: true` to relevant `sidePaths`/`hiddenPaths` entries in `worldSpec.ts` per design doc §11 (expert+ pyramids only). Re-run `yarn generate-world`.

---

## Phase 14 — Consumables

**Goal:** Consumable inventory with carry cap, chest delivery, and use flow.

### State — `useProgression`

```typescript
// Add to ProgressionState
consumables: {
  bandage: number     // restores 2 half-hearts (1 full heart)
  oil: number         // restores to maxHealth
  trapTool: number    // permanently disables one trapped corridor
}
```

Carry cap enforced on pickup: `totalConsumables() <= consumableCarryCap()`.

```typescript
consumableCarryCap(): number   // packMuleLevel === 0 ? 2 : 4
totalConsumables(): number     // bandage + oil + trapTool
```

### Chest reward variant

```typescript
// Add to TreasureReward
| { consumable: "bandage" | "oil" | "trap-tool" }
```

`SiteMapScreen` on collect: if `totalConsumables() >= consumableCarryCap()` → mark chest as `skipped-full` (stored in per-site state for consumable detector); else add to inventory.

### `<ConsumableBar />` (`src/ui/ConsumableBar.tsx`)

Displays current counts for all three types with use buttons. Use triggers:
- **Bandage:** `heal(2)` — disabled if `currentHealth >= maxHealth`
- **Oil:** `healToFull()` — disabled if at full health
- **Trap tool:** enters "select a trapped corridor" mode — next tap on a trap-blocked warning node calls `markTrapDisabled(edgeId)` and consumes one tool

### `<SkippedChestIndicator />` 

Visual marker on previously visited but inventory-full chests so player knows to return.

---

## Phase 15 — Tomb Treasure Perks + Detector System

**Goal:** All perk effects wired. Detector slot UI. Scribe's Eye annotation in tableau rooms.

### Perk state — `useProgression`

```typescript
// Add to ProgressionState
perks: {
  armorStacks: number           // 0–2
  trapInsightStacks: number     // 0–2
  packMuleLevel: number         // 0–1
  compassLevel: number          // 0–3
  consumableDetectorLevel: number  // 0–3
  detectionLevel: number        // 0–4
  scribesEyeLevel: number       // 0–3
}
```

`applyTreasurePerk(treasureId)` reads the perk table from `docs/pyramid-interior-design.md §14` (encoded in `src/data/treasurePerks.ts`) and mutates the relevant field. Also handles `maxHealth += 1` for health upgrades and tier unlocks.

### `src/data/treasurePerks.ts`

```typescript
// Encoded from §14 perk table
export const TREASURE_PERKS: Record<string, TreasurePerk> = {
  starter_a_1: { type: "tier-unlock", tier: "junior" },
  starter_a_2: { type: "compass", level: 1 },
  starter_a_3: { type: "pack-mule" },
  starter_a_4: { type: "max-health" },
  // ... all 40 entries
}
```

### Detector slot — `useDetector` (`src/app/state/useDetector.ts`)

```typescript
type DetectorMode = "compass" | "consumable" | "hiddenPassageway" | null

// State
activeDetector: DetectorMode
compassTarget: string | null    // hieroglyphId being tracked

// Actions
setDetector(mode: DetectorMode): void
setCompassTarget(hieroglyphId: string): void

// Derived (reads progression + world data)
compassResult(): { pyramidId, floorIndicator, exactPath } | null
consumableResult(): { pyramidId, floorIndicator, exactPath } | null
detectionMarkers(): { floors: string[], pyramids: string[], journeys: string[] }
```

Detection L1 (always-on passive) is checked in `useSiteNavigation` directly — no detector mode needed.

### `<DetectorPanel />` (`src/ui/DetectorPanel.tsx`)

Mode switcher (compass / consumable / detection) with result display appropriate to the active level. Disabled modes grayed out if perk not yet acquired.

### Scribe's Eye — tableau room annotation

Tableau puzzle rooms receive `scribesEyeSlots: number` prop (= `scribesEyeLevel === 3 ? Infinity : scribesEyeLevel`). The tableau component renders that many annotation input slots next to symbol cells. Annotations stored in component state — cleared on unmount (leaving the room).

### Armor + trap insight wiring

- `takeTrapDamage` already takes `armorStacks` — `SiteMapScreen` passes `perks.armorStacks`
- `TrapEncounter` already takes `timeLimit` — `SiteMapScreen` computes `TRAP_TIME_LIMITS_SECONDS[tier] + perks.trapInsightStacks * TRAP_TIME_EXTENSION_PER_INSIGHT_STACK`

### Old treasure effects cleanup (`src/data/treasures.ts`)

The current `TreasureEffects` type contains probabilistic-loot-era fields that are now vestigial: `mapFragmentChance`, `higherLootChance`, `moreLootChance`, `expeditionBonus`, `errorHighlight`, `earlyFeedback`. All 40 treasure definitions carry these.

Replace the entire `TreasureEffects` type and all treasure `effects` fields with the new perk model sourced from `TREASURE_PERKS` in `src/data/treasurePerks.ts`. The `effects` field on `Treasure` is removed; perk lookup goes through `treasurePerks.ts` exclusively. Check for any consumers of the old effect fields (search `TreasureEffects`, `mapFragmentChance`, `higherLootChance`) and remove or replace them.

---

## What's explicitly out of scope for this build

- **Carry-forward** — dropped; reintroduce only if a time-based puzzle family genuinely needs it
- **Shortcut gates** — `maxBranchFactor` generates trees only; reconnecting branches deferred
- **Additional puzzle families** — Sumplete only for pyramid puzzles; balance scale, nonogram, etc. are a separate future track
- **Puzzle family difficulty scaling** — Sumplete parameters authored per `siteConfig`; no dynamic curve
- **Additional trap question families** — pattern recognition, memory, spatial/visual. Arithmetic reflex ships first (Phase 12); remaining families added as plugins later with no system changes

---

## Phase 16 — Introductions & Onboarding

**Goal:** First-encounter explanations for every mechanic that needs one. Collected here so the core game loop ships clean and tutorials are layered on top, not woven in.

### Candidates

- **Puzzle rules** — brief overlay on the player's first encounter with each puzzle family (Sumplete, Tableau, Crocodile). Explain the win condition; skip on revisit.
- **Traps** — first tap on a trap room explains the mechanic (timed challenge, health cost on fail, blocked at 1 half-heart).
- **Consumables** — first time a consumable chest is collected, explain the consumable bar and carry cap.
- **Detector** — first time `detectionLevel >= 1`, explain that suspicious corners will stop the explorer.
- **Hidden passages (reveal)** — first time the reveal prompt appears, explain what a hidden passage is and that some contain rare loot.
- **Ward keys / gated sections** — first encounter with a gate explains that a ward key from a tomb unlocks it.
- **Health and healing** — first time health drops, explain that oil and bandages restore hearts.
- **Map pieces** — first map piece collected, explain that it reveals a new tomb on the travel screen.
- **Hieroglyph fragments** — first fragment collected, explain the hieroglyph collection mechanic.

### Implementation approach

One-shot flags stored in `useProgression` (or a dedicated `useTutorials` slice) — `seenTutorials: Set<string>`. Each mechanic checks its flag before showing; sets it on dismiss. UI is a lightweight modal or slide-in banner, not a Fez conversation (keep Fez for narrative moments).

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
| 8 | Multi-tomb progression + map piece discovery | ✅ | map pieces on deep pyramid floors (worldSpec), tomb discovery via mapPiece, ward keys from tombs |
| 9a | DSL full orthogonality | ✅ | `global().floor()`, `tier().floor()`, `journey().floor()` all implemented; specificity rank 0–9 in constraintResolver; gate spec uses `tombId` |
| 9b | Solver hard constraints + error reporting | ✅ | Provenance per field; assertChestCapacity throws citing rule scope when explicit pathPuzzles is too small |
| 9c | Density → branch count | ✅ | `"sparse"\|"normal"\|"dense"` → branch count via `INTENSITY_PATHS` in configBuilder |
| 9d | Crocodiles plugin + tomb chest node | ✅ | Tableau plugin (`PuzzleFamilies/Tableau/plugin.tsx`) + Crocodile plugin (`PuzzleFamilies/Crocodile/plugin.tsx`); `lastMainPuzzleFamily` in FloorConfig designates last main-path puzzle as croc; tomb worldgen sets `pathPuzzles:2` + `lastMainPuzzleFamily:"crocodile"` on last floor (non-starter tombs) |
| 9e | Re-run world gen + reachability check | ✅ | `yarn validate-world` exists; `yarn generate-world` runs all validators and writes `generatedWorld.ts` |
| 9f | Hieroglyph availability validator | ✅ | `validateAndFixHieroglyphAvailability()` in `configBuilder.ts`; simulates player progression (accessibleTierMax + wardKeys state machine); computes `tableauInventory` via `computeTableauInventory()` in `data.ts` (bit-for-bit match with `src/data/tableaus.ts`); checks each primary tomb's run-1 tableaus; fixes deficits by filling empty ward sections or adding ungated side sections to accessible pyramids of the matching tier |
| 10a | Exterior journey path map (bezier curve) | ✅ | `JourneyPathView.tsx` with arc-length-spaced nodes and bezier path already in place; `onNodeClick` added for per-pyramid revisit; `visitLevel()` in `useJourneys`; `solvedEdges` changed to `Record<string,string[]>` keyed by levelNr so interior state persists across revisits |
| 10 | Journey map + hub + fast-travel + new-paths badge | ⏭ | WorldMapView/JourneyMapView/NewPathsBadge deferred — Travel page map already serves as the hub; new-paths badge and fast-travel not yet needed |
| 11 | Health system | ✅ | `currentHealth`/`maxHealth` in `useProgression`, `<HealthDisplay />`, `trapDamage()`, `takeTrapDamage`/`heal`/`healToFull`/`canAttemptTrap` helpers |
| 12 | Trap plugin system + arithmetic reflex | ✅ | `trapPlugin.ts`, `trapRegistry.ts`, `trapConfig.ts`, `ArithmeticReflex/plugin.tsx`, `<TrapEncounter />`; bug fix: zero timeLimit guard + done dep removed from effect |
| 13 | Trap corridors + hidden paths | 🔜 | `trapped`/`hidden` edge attrs, `warning` node type, encounter flow in `SiteMapScreen`, `markTrapDisabled` |
| 14 | Consumables | 🔜 | `consumables` state, carry cap, chest delivery, `<ConsumableBar />`, skipped-chest tracking |
| 15 | Tomb treasure perks + detector system | 🔜 | `treasurePerks.ts`, perk state, `useDetector`, `<DetectorPanel />`, Scribe's Eye annotations, old `TreasureEffects` removal |
| 16 | Introductions & onboarding | 🔜 | `seenTutorials` state, first-encounter overlays for puzzles, traps, consumables, detector, hidden passages, ward keys, health, map pieces, fragments |
