# Technical Debt Audit — Rule Compliance

Audited against `AGENTS.md` (sections 8–9), `docs/instructions/architecture.md`,
`docs/instructions/testing.md`, `docs/instructions/storybook.md`, and
`docs/instructions/state-models.md`. Snapshot as of 2026-07-07 — re-scan
periodically, this list will drift as files change.

---

## A. Layer boundary violations (`docs/instructions/architecture.md`)

**~49 findings total** (12 in `src/ui/`, 7 in `src/game/`/`src/data/`, 30 pre-existing `className` cases in `src/app/`).

### A1. `src/ui/` components using disallowed hooks (12 files)

Rule: `src/ui/` components must be stateless — no `useState`, `useEffect`, or `useTranslation`; `useRef` is allowed only for DOM ops.

Production components (highest priority — these ship):

| File | Violation |
|---|---|
| `src/ui/molecules/HieroglyphUnlockPanel.tsx` | Imports `useState`; two `useState()` calls |
| `src/ui/molecules/InputBlock.tsx` | Imports `useEffect`; two `useEffect()` calls |
| `src/ui/atoms/LootPopup.tsx` | Imports `useState`/`useEffect`; `useState(false)`, `useState("hidden")`, two `useEffect()` calls |

Storybook files under `src/ui/` (lower priority — storybook.md explicitly allows local `useState` in *stories*, so these are likely false positives against architecture.md, not real violations — flagged for triage):

- `src/ui/molecules/NumberChest.stories.tsx`
- `src/ui/atoms/StainedGlassMosaic.stories.tsx`
- `src/ui/atoms/LootPopup.stories.tsx`
- `src/ui/atoms/EntranceTransitionOverlay.stories.tsx`
- `src/ui/organisms/SumpleteBoard.stories.tsx`

No `useTranslation` usage and no `src/game/`/`src/data/`/`src/app/` imports found anywhere under `src/ui/` — clean on those two sub-rules.

### A2. Domain layer (`src/game/`, `src/data/`) purity violations (7 files)

Rule: no React/DOM imports, no imports from `src/app/` or `src/ui/`.

Real runtime React/i18n dependencies in `src/data/` (highest severity — hooks, not stray types):

| File | Violation |
|---|---|
| `src/data/useTableauTranslations.ts` | `useTranslation("tableaus")` hook |
| `src/data/useInventoryTranslations.ts` | `useTranslation("inventory")` hook |
| `src/data/useJourneyTranslations.ts` | `useTranslation("journeys")`/`useTranslation("common")` hooks |
| `src/data/useTreasureTranslations.ts` | `useTranslation("treasures")` hook |

Type-only React imports in `src/game/` (lower severity — no runtime dependency, but still a literal rule violation):

| File | Violation |
|---|---|
| `src/game/trapPlugin.ts:1` | `import type { FC } from "react"` for a `Component: FC<...>` field |
| `src/game/puzzlePlugin.ts:1` | Same pattern |

Cross-layer dependency cycle — `src/game/` importing from `src/app/`:

| File | Violation |
|---|---|
| `src/game/generateCompareLevel.ts:1` | Imports `createVerifiedFormula`, `Formula`, `Operation` from `../app/Formulas/formulas` |
| `src/game/generateRewardCalculation.ts:8` | Same import target |
| `src/game/generateCompareLevel.spec.ts` | Same import |
| `src/game/generateRewardCalculation.spec.ts` | Same import |

Most notable finding in category A: `src/app/Formulas/formulas.ts` contains what is really domain logic (`createVerifiedFormula`, `formulaToString`, `Formula`/`Operation` types) but lives under `src/app/`, while `src/game/` depends on it back — an actual upward-then-downward dependency cycle (`formulas.ts` itself imports `src/game/random`). Recommended fix: relocate `Formulas/` into `src/game/` or `src/data/`.

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

**27 findings total** (18 in `src/game`/`src/data`, 5 in `src/support`, 2 in `src/worldGen`, 1 in `src/app/state`, 1 `*Logic.ts`/`*Calc.ts`).

### C1. `src/game/` and `src/data/` (18)

`src/data/` (12):

- `src/data/difficultyLevels.ts` — exports `difficultyCompare()`, no spec
- `src/data/generatedWorld.ts` — large auto-generated world config, no structural-invariant spec (compare `journeys.spec.ts`)
- `src/data/itemLevelLookup.ts` — exports `getItemFirstLevel()`, no spec
- `src/data/journeyStructure.ts` — `PYRAMID_STRUCTURES`/`TOMB_STRUCTURES`, no spec
- `src/data/resolveHieroglyphSymbol.ts` — exports `resolveHieroglyphSymbol()`, no spec
- `src/data/siteConfigs.ts` — `pyramidSiteConfigs`, no invariant spec
- `src/data/treasurePerks.ts` — cross-referencing perk tables, no spec asserting cross-refs hold
- `src/data/treasures.ts` — large treasure tables + mapping functions, no spec
- `src/data/useInventoryTranslations.ts` — branching hooks, no spec
- `src/data/useJourneyTranslations.ts` — branching hooks, no spec
- `src/data/useTableauTranslations.ts` — branching hooks, no spec
- `src/data/useTreasureTranslations.ts` — branching hooks, no spec

(The last four also appear in A2 — same files, two different rule breaks.)

`src/game/` (6):

- `src/game/generateJourneyLevel.ts` — core level-generation logic, no dedicated spec
- `src/game/puzzleRegistry.ts` — `registerPuzzle()`/`getPuzzlePlugin()`, no spec (borderline: small registry wrapper)
- `src/game/random.ts` — `mulberry32()`, `generateNewSeed()`, `shuffle()` — the deterministic-seed backbone of the whole world, no spec
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

## D. Puzzle state not following the DDD pattern (`docs/instructions/state-models.md`)

**2 findings.**

### D1. `src/app/TombLevel/ComparePuzzle.tsx` + `src/app/TombLevel/useComparePuzzleControls.ts` — abandoned duplicate of Crocodile

A second, still-live implementation of the same comparison-puzzle mechanic that `src/game/crocodileState.ts` already models, and that `src/app/PuzzleFamilies/Crocodile/plugin.tsx` already consumes. This older file was never switched over — a partial/abandoned migration, not dead code (still rendered from `src/app/TombExpedition.tsx`).

- State shape (`useComparePuzzleControls.ts:22-24,93`) hand-duplicates `CrocodileState = { focus, answers }`:
  ```ts
  const [answers, setAnswers] = useState<{
    [key: number]: "left" | "right" | "noneLeft" | "noneRight"
  }>({})
  const [focus, setFocus] = useState(0)
  ```
- Inline mutation instead of named actions (`useComparePuzzleControls.ts:159-162`), plus a manual double-reset (`handleIDontKnow`, lines 95-98) instead of `resetCrocodileState`.
- Fix: replace with `previewLeft`/`commitLeft`/`previewRight`/`commitRight`/`advanceFocus`/`resetCrocodileState` from `src/game/crocodileState.ts`, same as the Crocodile plugin wrapper.

### D2. `src/app/PyramidLevel/Level.tsx` — pyramid block answers never migrated

The core Pyramid Level fill-in-the-blanks puzzle stores in-progress answers as a block-id → value map in a plain storage-backed `useState` wrapper, mutated via hand-rolled spread.

- State shape (`Level.tsx:16-19`):
  ```ts
  const [storedAnswers, setAnswers] = useGameStorage<{
    key: string
    values: Record<string, number | undefined>
  }>("levelAnswers", { key: storageKey ?? "dummy", values: {} })
  ```
- Inline mutation (`Level.tsx:54-62`) spreads `prev.values` by hand instead of calling a named action.
- `src/game/state.ts` already has the *check* half of the pattern (`isComplete`, `isValid`, `getAnswers`, `getBlockChildIndices`) but no state type/factory/named actions (e.g. a `setBlockAnswer` action) — a half-migrated domain module, missing the action layer.

### Checked, compliant — no action needed

`src/app/PuzzleFamilies/Sumplete/*`, `src/app/PuzzleFamilies/Crocodile/plugin.tsx`, `src/app/TombLevel/TombPuzzle.tsx` (Tableau) — correctly wired to their `src/game/*State.ts` modules. `src/app/TrapFamilies/ArithmeticReflex/plugin.tsx`, `PyramidLevel/LevelCompletionHandler.tsx`, `PyramidExpedition.tsx`, `TombExpedition.tsx`, `SiteMap/SiteMapScreen.tsx`, `SiteMap/SiteMapView.tsx`, `SiteMap/ChestRewardFlow.tsx` — local state found is flat primitives/booleans, exempt per state-models.md's "single primitive" carve-out. `src/app/SiteMap/useAssembledFloor.ts` — derived `useMemo` over domain-owned grid data, nothing to migrate. `src/app/state/useDetector.ts`, `useJourneys.ts`, `useProgression.ts` — no complex inline mutation found.

---

## Summary

| Category | Findings |
|---|---|
| A — Layer boundary violations | ~49 (12 ui/, 7 game+data, 30 pre-existing app/ className — low priority) |
| B — Missing Storybook stories | 0 |
| C — Missing tests | 27 (18 game/data, 5 support, 2 worldGen, 1 app/state, 1 Logic/Calc) |
| D — DDD puzzle-state violations | 2 (ComparePuzzle/Crocodile duplicate, PyramidLevel Level.tsx) |

Highest-signal items for prioritization: the `src/data/use*Translations.ts` files (4 files, real React/i18n hooks in the domain layer — breaks both A and C simultaneously), the `src/game/` ↔ `src/app/Formulas/formulas.ts` dependency cycle (architectural, not just a lint nit), `src/game/random.ts` having zero tests despite being the seed backbone for the entire generated world, and the two D-category findings (both are concrete, scoped refactors following an existing template).
