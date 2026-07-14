# Handover — mod-restructure fidelity work (branch `mods/hieroglyph-currency`)

Branch **pushed** through `2835ffe` (+ an audit-doc commit). Full suite green (**718**),
`yarn build` clean, `yarn generate-world` builds with the economy guard ON and is **byte-identical**,
per-slice toggle-off proven. This branch is executing the gaps in **`docs/mods/FIDELITY-AUDIT.md`** —
read that first; its "Progress" section is the live tracker.

## Read first, in order

1. `docs/mods/FIDELITY-AUDIT.md` — the gap ledger + per-root-cause status (✅ done / ⏳ remaining).
2. `docs/mods/ARCHITECTURE.md` — the two invariants + the as-built seams.
3. `docs/mods/distribution-primitive-design.md` — the loot/encounter primitive (§"As-built refinements").
4. `docs/mods/TARGET.md` — the two rules (mod-agnostic core; toggle-off is the gate).
5. `docs/mods/pyramid-interior-design.md` §8 — the tomb-interior target (needed for §A.2+§G).
6. Auto-memories: `project_distribution_primitive_contract`, `feedback_design_doc_fidelity`,
   `project_mod_restructure_target`, `reference_worldgen_dsl_authoring`.

## Done on this branch

- **§C** — dynamic loot (money/junk/consumables) runs through the `Distribution` primitive
  (`slotAllocator.ts`); mods own placement via `footprint`/`eligible`/`rank`/`fill`; eagerness =
  `FamilyMeta.rewardWeight` (fill order) stamped on slots; `emptyFraction` knob; authored `end:"junk"`
  is an open slot (not a baked sellable). Money+junk = one shop `shopMoneyEconomy` budget.
- **§D** — `TreasureReward` is OPEN (`{type:string}&Record<string,unknown>`); core enumerates no
  reward/currency id. Per-type **zod schemas** (owner-registered) validate every placed reward at boot
  (`rewardSchemas.ts` `validatePlacedRewards`, called from `registerModApps`). Reward effects/display/
  state all mod-owned (fragments → `useHieroglyphProgress`/useModState; ledger generic get/grant/spend;
  `ConsumableType`/`rollConsumable` → trap; serializer generic; hieroglyph `pieceIndex`+cap → the mod's
  finalize; baked mod data rides a generic `modExports` channel). `skip` vs `canAccept` are distinct
  (owned fragment silently skips; full pack refuses-come-back).
- **§A.1** — movable mechanics relocated to mods: `src/game/traps/*`, `src/game/puzzles/sumplete/*`,
  `TrapWarningScreen`, `ConsumableBar`, `SumpleteBoard`. `src/game/traps/` gone; `src/game/puzzles/`
  keeps only tableau + crocodile (blocked — see §A.2).
- **§H** — fixed the double-registered `FEZ_SHOP_META` (was hardcoded in `allFamilyMeta.ts` AND via the
  descriptor). Now drops with the mod.

## Remaining (priority order — see FIDELITY-AUDIT "Progress")

1. **§A.2 + §G — tomb-interior as a registry site** (the big one, gameplay-facing, needs playtesting).
   Kill the legacy `src/app/TombExpedition.tsx` render + `SiteMapScreen`'s `renderPuzzle` escape hatch;
   route tombs through the family registry exactly like `PyramidExpedition`. Requires: tomb persistence
   in `useJourneys.ts` (the `isInteriorPyramid` pinned-seed / capped-`completionCount` treatment for
   `treasure_tomb`), multi-floor indexing (`TombExpedition` hardcodes `siteConfigs[0]`), per-floor
   crocodile capstone (`configBuilder.ts` `isLast && hasCroc`), and wiring authored tableau content into
   the tableau family's `generate` (today it uses a dummy). Drop the redundant `ComparePuzzle` finale
   (the in-grid crocodile capstone already renders via the registry). **Only after this** can tableau +
   crocodile mechanics (`src/game/puzzles/{tableau,crocodile}`, `TombPuzzle`) move to their mods. This
   is what makes hieroglyph/puzzle toggle-off actually remove the mechanic in tombs.
2. **§A.3 — encounters-as-distributions (Increment 2)**, world-gen only, disjoint from §A.2. Add
   `slot.encounter`/`capacity` metadata; an encounter-pass distribution that stamps it + sets
   `rewardWeight` (moving the `siteAssembler.ts` `trapped`/`puzzleFamily`/shop special-cases + the
   `slots.ts` weight stamp); shop stock as a loot distribution on `eligible = s.encounter==="shop"`.
3. **§E — ward/tomb keys → the solver.** Today construction-time literals (`configBuilder.ts`) +
   a separate `validateDiscovery` reachability re-implementation. Migrate to a currency distribution.
4. **§F — treasure perks.** `applyTreasurePerk` is a no-op but `pyramid-interior-design.md` presents a
   full perk economy. A decision: build the perk system, or correct the doc. (Blocks nothing.)
5. **§H (puzzle) — design decision:** `puzzle` is a mod-in-name-only (not in `REGISTERED_MODS`, ungated).
   Make it a real toggleable mod, or accept as always-on core-adjacent.
6. **tomb-treasure mod** — extract `mapPiece`/`tombKey` (the "last mod"; core owns them under the open
   union today, which is fine until then).

## As-built seams to reuse (all built here)

- **Distribution** (`worldGen/slotAllocator.ts`) + `allocateDistributions` — loot placement.
- **rewardContributions** (`effects`/`canAccept`/`skip`) + **rewardDisplayRegistry** + **detectorScanners**
  + **rewardSchemas** (zod) — all in `src/app/SiteMap/`, hook-based, registered per mod via
  `registerModApps`, mod-agnostic in core.
- **useModState** (`pyramid-scheme-mod-<id>`), **generic ledger** (`ledger.get/grant/spend(id)`),
  **familyWeightFor** + **modExports** injection (via `scripts/generateWorld.ts`, the sanctioned crossing).
- Descriptor `ModDescriptor` fields; `REGISTERED_MODS`; `MOD_FAMILY_META`/`DYNAMIC_DISTRIBUTIONS`/
  `MOD_WORLD_VALIDATORS` aggregators.

## Workflow that's been used (the user expects it — they hate half-implementations / "concepts mixed")

explore (parallel agents) → **plan** (Plan agent to pressure-test) → **grill the genuine forks** with
the user via AskUserQuestion → build (self for risky/core-sensitive; delegate mechanical work) →
**verify** (tsc + build + full suite + lint + world byte-identical + toggle-off) → **doc-fidelity review
agent** → fix findings → commit → push. Surface design deviations as questions, don't silently pick.

## Gotchas

- **Independently verify subagent "all green" claims.** Both delegated pushes reported green but had
  stale editor diagnostics; Push 1 had a real regression (skip-vs-canAccept) the review caught. Run
  `yarn tsc -b`/`build`/`vitest` yourself.
- **World byte-identity** is the strong check for a refactor that shouldn't change output; `git diff
  --stat src/data/generatedWorld.ts` should be empty (regenerate first).
- **Toggle-off** = remove a mod from `REGISTERED_MODS` (+ comment its import), regenerate, build. The
  boot `validatePlacedRewards` throws if the world still has a toggled-off mod's reward type (correct —
  regenerate). Restore exactly after.
- **DSL authoring vocabulary still names currencies** (`dsl.ts` `RewardHint`/`RewardSpec`, `spec/*.ts`
  `endReward:"mosaicPiece"`, `pathEndToReward`'s `"mosaic"→prefers`) — §A DSL scope, rule-2 sanctioned;
  NOT a §D leak.
- **Consumable-detector path** still names `"consumable"` (`SiteMapScreen`/`SiteMapView` skipped-consumable
  reopen) — deferred to a detector slice.
- `SKIP_ECONOMY_GUARD=1 yarn generate-world` for iteration.
