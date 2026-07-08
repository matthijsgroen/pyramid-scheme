# Technical Debt Audit — Rule Compliance

Audited against `AGENTS.md` (sections 8–9), `docs/instructions/architecture.md`,
`docs/instructions/testing.md`, `docs/instructions/storybook.md`, and
`docs/instructions/state-models.md`. Snapshot as of 2026-07-07 — re-scan
periodically, this list will drift as files change.

---

## A. Layer boundary violations (`docs/instructions/architecture.md`)

**~44 findings total** (12 in `src/ui/`, 2 in `src/game/`/`src/data/`, 30 pre-existing `className` cases in `src/app/`).

### A1. `src/ui/` components using disallowed hooks (12 files)

Rule: `src/ui/` components must be stateless — no `useState`, `useEffect`, or `useTranslation`; `useRef` is allowed only for DOM ops.

Production components (highest priority — these ship):

| File                                         | Violation                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/ui/molecules/HieroglyphUnlockPanel.tsx` | Imports `useState`; two `useState()` calls                                                       |
| `src/ui/molecules/InputBlock.tsx`            | Imports `useEffect`; two `useEffect()` calls                                                     |
| `src/ui/atoms/LootPopup.tsx`                 | Imports `useState`/`useEffect`; `useState(false)`, `useState("hidden")`, two `useEffect()` calls |

Storybook files under `src/ui/` (lower priority — storybook.md explicitly allows local `useState` in _stories_, so these are likely false positives against architecture.md, not real violations — flagged for triage):

- `src/ui/molecules/NumberChest.stories.tsx`
- `src/ui/atoms/StainedGlassMosaic.stories.tsx`
- `src/ui/atoms/LootPopup.stories.tsx`
- `src/ui/atoms/EntranceTransitionOverlay.stories.tsx`
- `src/ui/organisms/SumpleteBoard.stories.tsx`

No `useTranslation` usage and no `src/game/`/`src/data/`/`src/app/` imports found anywhere under `src/ui/` — clean on those two sub-rules.

### A2. Domain layer (`src/game/`, `src/data/`) purity violations (2 files remaining)

Rule: no React/DOM imports, no imports from `src/app/` or `src/ui/`.

The React/i18n hooks previously in `src/data/` moved to `src/app/translations/`, and the `src/game/` ↔ `src/app/Formulas/formulas.ts` dependency cycle is gone (`Formulas/` relocated to `src/game/formulas/`).

Type-only React imports in `src/game/` (lower severity — no runtime dependency, but still a literal rule violation):

| File                         | Violation                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/game/traps/trapPlugin.ts:1`   | `import type { FC } from "react"` for a `Component: FC<...>` field |
| `src/game/puzzles/puzzlePlugin.ts:1` | Same pattern                                                       |

### A3. `src/app/` raw `className=` usage — pre-existing carve-out (30 files, 303 occurrences)

Per architecture.md's explicit carve-out ("some app/ components still contain className from before this rule was established... fix when you naturally touch the file"), these are **low-priority / fix-when-touched**, not action items.

<details>
<summary>Full list</summary>

- `src/app/SiteMap/JourneyInspector.stories.tsx` — 37
- `src/app/pages/Collection.tsx` — 25
- `src/app/pages/Travel.tsx` — 23
- `src/app/TombExpedition.tsx` — 17
- `src/app/SettingsModal.tsx` — 17
- `src/app/PuzzleFamilies/Crocodile/plugin.tsx` — 17
- `src/app/TombLevel/ComparePuzzle.tsx` — 18
- `src/app/PyramidExpedition.tsx` — 13
- `src/app/SiteMap/SiteMapBuilder.stories.tsx` — 14
- `src/app/PyramidExpedition/ExpeditionCompletionOverlay.tsx` — 11
- `src/app/PyramidLevel/PyramidDisplay.tsx` — 11
- `src/app/SiteMap/HiddenPassage.stories.tsx` — 11
- `src/app/SiteMap/SiteMapScreen.tsx` — 10
- `src/app/TombLevel/TombTreasures.stories.tsx` — 8
- `src/app/fez/Fez.tsx` — 7
- `src/app/SiteMap/TrapWarningScreen.tsx` — 7
- `src/app/pages/TableauInventory.tsx` — 7
- `src/app/JourneySelection.tsx` — 6
- `src/app/TrapFamilies/ArithmeticReflex/plugin.tsx` — 6
- `src/app/SiteMap/ChestRewardFlow.tsx` — 6
- `src/app/PyramidLevel/GameLevel.stories.tsx` — 6
- `src/app/PyramidLevel/PyramidLevel.stories.tsx` — 6
- `src/app/SiteMap/SiteMapView.stories.tsx` — 4
- `src/app/Base.tsx` — 3
- `src/app/pages/MosaicPage.tsx` — 3
- `src/app/PyramidLevel/LevelCompletionHandler.tsx` — 3
- `src/app/TrapFamilies/TrapEncounter.tsx` — 2
- `src/app/SiteMap/SiteMapView.tsx` — 2
- `src/app/PyramidLevel/Level.tsx` — 2
- `src/app/PyramidLevel/LevelCompletedOverlay.tsx` — 1

</details>

---

## B. Missing Storybook stories (`docs/instructions/storybook.md`)

**0 findings.** Every `*.tsx` component file directly under `src/ui/atoms/`, `src/ui/molecules/`, and `src/ui/organisms/` (39 components checked) has a matching sibling `*.stories.tsx`. `src/ui/principles/` contains only a README, no components.

**Shadow-logic spot-check (14 story files checked): no genuine violations.** All spot-checked stories touching scoring, selection, puzzle grids, rewards, or seeded generation correctly call real `src/game/` functions. One item worth a second look, not a rule violation:

- `src/ui/organisms/TombTableau.stories.tsx` — local `fillPositions` helper synthesizes a fake "% filled" ratio to drive a Storybook slider. Doesn't clone a real algorithm, but is a synthetic stand-in for game-derived fill state — candidate for extraction if the game ever gains a real "position fill ratio" computation.

---

## C. Missing tests (`docs/instructions/testing.md`)

**26 findings total** (17 in `src/game`/`src/data`, 5 in `src/support`, 2 in `src/worldGen`, 1 in `src/app/state`, 1 `*Logic.ts`/`*Calc.ts`). `src/game/random.ts` now has `random.spec.ts` — no longer a finding.

### C1. `src/game/` and `src/data/` (17)

`src/data/` (12):

- `src/data/difficultyLevels.ts` — exports `difficultyCompare()`, no spec
- `src/data/generatedWorld.ts` — large auto-generated world config, no structural-invariant spec (compare `journeys.spec.ts`)
- `src/data/itemLevelLookup.ts` — exports `getItemFirstLevel()`, no spec
- `src/data/journeyStructure.ts` — `PYRAMID_STRUCTURES`/`TOMB_STRUCTURES`, no spec
- `src/data/resolveHieroglyphSymbol.ts` — exports `resolveHieroglyphSymbol()`, no spec
- `src/data/siteConfigs.ts` — `pyramidSiteConfigs`, no invariant spec
- `src/data/treasurePerks.ts` — cross-referencing perk tables, no spec asserting cross-refs hold
- `src/data/treasures.ts` — large treasure tables + mapping functions, no spec
- `src/app/translations/useInventoryTranslations.ts` / `useJourneyTranslations.ts` / `useTableauTranslations.ts` / `useTreasureTranslations.ts` — no dedicated specs (moved from `src/data/`, no longer a layer violation, but still untested)

`src/game/` (5):

- `src/game/generateJourneyLevel.ts` — core level-generation logic, no dedicated spec
- `src/game/puzzleRegistry.ts` — `registerPuzzle()`/`getPuzzlePlugin()`, no spec (borderline: small registry wrapper)
- `src/game/tombTreasureSelection.ts` — `eligibleTreasures()`, `treasureSelectionSeed()`, `treasureForRun()`, `collectedTreasureIds()`, no spec
- `src/game/trapRegistry.ts` — `registerTrap()`/`getTrapPlugin()`, no spec (borderline, same pattern as puzzleRegistry)
- `src/game/test-utils/pyramidfactory.ts` — `createPyramid()` test-fixture factory, no spec (borderline/low priority — itself test infrastructure)

Skipped as trivial (type-only, empty, or pure data literals with zero functions): `generateJourney.ts`, `generateLevelSettings.ts` (both empty), `puzzlePlugin.ts`, `siteTypes.ts`, `trapPlugin.ts`, `types.ts`, `trapConfig.ts`, `hieroglyphs.ts`, `objectsForStories.ts`.

### C2. `src/support/` (5) — testing.md's strictest layer ("every function, no implicit coverage")

- `src/support/hashString.ts` — `hashString()`, no spec
- `src/support/revealText.ts` — seeded pseudo-random obfuscation algorithm, no spec
- `src/support/useGameStorage.ts` — `useGameStorage()`/`clearGameData()`, no spec
- `src/support/useOfflineStorage.ts` — full persistence/subscription layer, no spec at all
- `src/support/useTimeout.ts` — schedule/cancel with unmount cleanup, no spec

### C3. `src/worldGen/` (2) — testing.md's highest-bar layer

- `src/worldGen/data.ts` — `chestEveryFor()`, `chestCountFor()`, computed `HIEROGLYPH_REQUIRED`, no spec
- `src/worldGen/serializer.ts` — `generateFile()` (code-gen producing `generatedWorld.ts`), `printStats()`, no spec — a bug here would silently corrupt the entire generated world

Skipped as trivial: `src/worldGen/spec/*.ts` (declarative `Rule[]` literals), `types.ts`, `worldSpec.ts`.

### C4. `src/app/state/` hooks (1)

- `src/app/state/useProgression.ts` — exports `trapDamage()`, `canAttemptTrap()`, plus the 243-line `useProgression()` state-machine hook, no spec at all. (`useDetector.ts` and `useJourneys.ts` already have specs.)

### C5. `src/app/*Logic.ts` / `*Calc.ts` (1)

- `src/app/PyramidLevel/inventoryLootLogic.ts` — `determineInventoryLootForCurrentRuns()`, a multi-branch algorithm (urgency scoring, seeded fallback selection, chance-multiplier capping), no test. Outlier: the other four `*Logic.ts` files in the same directory already have specs.

---

## D. State not following the DDD pattern (`docs/instructions/state-models.md`)

**2 findings fixed, 4 new candidates exposed after broadening the rule beyond puzzle/trap families (2026-07-07).**

### D1. `src/app/TombLevel/ComparePuzzle.tsx` + `src/app/TombLevel/useComparePuzzleControls.ts` — abandoned duplicate of Crocodile — **fixed**

`useComparePuzzleControls.ts` now uses `previewLeft`/`commitLeft`/`previewRight`/`commitRight`/`advanceFocus`/`resetCrocodileState` from `src/game/puzzles/crocodile/crocodileState.ts`, same as the Crocodile plugin wrapper, instead of hand-duplicating the `{ focus, answers }` shape.

### D2. `src/app/PyramidLevel/Level.tsx` — pyramid block answers never migrated — **fixed**

`src/game/state.ts` gained `PyramidAnswers`, `createPyramidAnswers()`, and a `setBlockAnswer()` action (with spec coverage); `Level.tsx` now calls `setBlockAnswer()` instead of hand-rolled spreading.

### D3. `src/app/state/useJourneys.ts` — journey progress, no domain module

State: `StoredJourneyStateV3[]` — array of nested objects, each with `exploredSections: Record<string, string[]>`, `disabledTraps?: string[]`, `skippedConsumables?: string[]`.

- 10+ functions (`startJourney`, `completeJourney`, `visitLevel`, `cancelJourney`, `completeLevel`, `markCellExplored`, `updatePosition`, `setInteriorLevel`, `markTrapDisabled`, `markConsumableSkipped`, `clearConsumableSkipped`) all do inline `setJourneys(prev => prev.map(j => j.journeyId === id ? {...j, ...} : j))` spread chains.
- No `src/game/*State.ts` module backs this at all — clearest violation of the broadened rule (array + record-of-arrays, many distinct mutation kinds).
- Previously marked "no complex inline mutation found" under the old puzzle-only rule — that call is superseded.

### D4. `src/app/state/useProgression.ts` — 243-line state machine, no domain module

State: `ProgressionState` — nested object with `collectedFragments: string[]`, `tombKeys: Record<string, true>`, `discoveredTombs: string[]`, `collectedMapPieces: Record<string, number>`, `mapPieceJourneys: string[]`, `consumables: {...}`, `perks: PerkState` (7 fields).

- ~15 API methods (`addTombKey`, `applyTreasurePerk`, `discoverTomb`, `collectMapPiece`, `markMapPieceFound`, `takeTrapDamage`, `heal`, `addConsumable`, `useConsumable`, etc.) each do inline `setState(prev => ({...prev, nested: {...prev.nested, ...}}))`, including a large `switch` inside `applyTreasurePerk`.
- Same "no complex inline mutation found" call as D3, now superseded.

### D5. `src/app/Inventory/useInventory.ts` — inventory counts, no domain module

State: `Record<string, number>`.

- `addItem`, `removeItem`, `addItems`, `removeItems` each hand-roll `setInventory(prev => ({...prev, [id]: ...}))` or a manual loop-copy for the batch versions — a Record with multiple entries and multiple distinct mutation kinds (add/remove/batch-add/batch-remove).
- Consumed by `useComparePuzzleControls.ts` and `TombPuzzle.tsx`.

### D6. `src/app/TombLevel/TombPuzzle.tsx` — `annotations` state (minor)

State: `useState<Record<string, string>>({})`, separate from the already-compliant Tableau puzzle domain state (`createTableauPuzzleState`/`toggleTableauTile`) in the same file.

- Single `handleAnnotationChange` does `setAnnotations(prev => ({...prev, [symbolId]: value}))`.
- Technically a Record with multiple entries per the rule, but only one mutation kind exists — lowest priority of the four, candidate for folding into the same domain module or documenting as an accepted exception.

### Checked, still compliant — no action needed

`src/app/PuzzleFamilies/Sumplete/*`, `src/app/PuzzleFamilies/Crocodile/plugin.tsx`, `src/app/TombLevel/TombPuzzle.tsx`'s puzzle state (Tableau, not its `annotations` — see D6) — correctly wired to their `src/game/*State.ts` modules. `src/app/state/useDetector.ts` — two independent flat `useState` (`DetectorMode`, `compassTarget`), rest derived via `useMemo`. `src/app/SiteMap/SiteMapScreen.tsx`'s `pendingReward` — always replaced wholesale, never incrementally spread. `src/app/TrapFamilies/ArithmeticReflex/plugin.tsx`, `PyramidLevel/LevelCompletionHandler.tsx`, `PyramidExpedition.tsx`, `TombExpedition.tsx`, `SiteMap/SiteMapView.tsx`, `SiteMap/ChestRewardFlow.tsx`, `FezCompanion.tsx`, `Travel.tsx`, `Collection.tsx`, `usePyramidNavigation.ts`, `ExplorerDot.tsx` — flat primitives/whole-value replacement, exempt per state-models.md's "single primitive" carve-out. `src/app/SiteMap/useAssembledFloor.ts` — derived `useMemo` over domain-owned grid data, nothing to migrate. `src/support/useGameStorage.ts`/`useOfflineStorage.ts` — generic persistence wrappers, not domain logic themselves (though they're the mechanism storing D3–D5's non-compliant state).

Priority order for remediation: D3 (`useJourneys`) > D4 (`useProgression`) > D5 (`useInventory`) > D6 (`TombPuzzle` annotations).

---

## Summary

| Category                      | Findings                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| A — Layer boundary violations | ~44 (12 ui/, 2 game+data, 30 pre-existing app/ className — low priority)            |
| B — Missing Storybook stories | 0                                                                                   |
| C — Missing tests             | 26 (17 game/data, 5 support, 2 worldGen, 1 app/state, 1 Logic/Calc)                 |
| D — DDD state violations      | 2 fixed + 4 new (useJourneys, useProgression, useInventory, TombPuzzle annotations) |

Previously highest-signal items — the `src/data/use*Translations.ts` React/i18n hooks in the domain layer, the `src/game/` ↔ `src/app/Formulas/formulas.ts` dependency cycle, and `src/game/random.ts` having zero tests — are now resolved. Remaining highest-signal items: D3/D4 (`useJourneys`, `useProgression`), the largest and most load-bearing state modules still missing domain actions.
