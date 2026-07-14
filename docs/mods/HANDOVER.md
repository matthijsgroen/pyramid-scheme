# Handover — mod-restructure fidelity work (branch `mods/hieroglyph-currency`)

Branch committed through `ff97078` (NOT pushed — local commits this session). Full suite green
(**718**), `yarn build`/`tsc`/`lint` clean, `yarn generate-world` builds. This branch is executing
the gaps in **`docs/mods/FIDELITY-AUDIT.md`** — read that first; its "Progress" section is the live
tracker.

**This session (6 commits on top of `0659eae`):** §A.2 tombs→family-registry via a unified
`PyramidExpedition` (`7e7a16f`); §A mechanic extraction — crocodile (`7dc8eb7`) + tableau (`c19fab1`)
out of `src/game/puzzles` into their mods; §A.3 gen-time **tag-based encounter allocation**
(`8b00c6c`) + `sumplete-mirror` proof family (`75deb6a`); §H puzzle→real mod (`ff97078`). Verify by
regen + `git diff --stat src/data/generatedWorld.ts` (refactor commits are byte-identical; §A.3
changed encounter representation but is semantic-identical — same family renders in every room).

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
- **§E — ward/tomb keys → the solver (4 stages, `SLICE-E-ward-keys.md`).** Retired the redundant
  `validateDiscovery`; genericized `reachability.ts` so core names no currency (journey-entry
  threshold, tier-unlock ladder, tombKey/mapPiece harvest all injected via a mod-supplied
  `ReachabilitySupport`); injected tombKey placement from the mod (`TombTreasureResolver`) so core
  `configBuilder` names no reward type; and gave every treasure an optional loot pocket (last-floor
  `wardChest`). Key reframe: tomb keys are **positional content harvested by reachability**, NOT a
  demand-spread currency (that's why the audit's "keys-as-currency" framing didn't fit). Stages 1-3
  byte-identical; stage 4 changed the world (9 pockets + loot redistribution, counts stable).
- **tomb-treasure mod** — `mapPiece`/`tombKey` extracted into `src/mods/tombTreasure` (see
  FIDELITY-AUDIT "Progress" + `SLICE-tomb-treasure.md`). Map-piece currency + `currencyMeta` mod-owned
  (`worldGen/mapPieceCurrency.ts` gone); the map-piece branch emits a `fragmentSlot` sentinel tagged
  `mapPiece:<tombId>` that the currency fills (map-piece cells byte-identical; benign hieroglyph-label
  reshuffle only). Reward handlers/effects/schemas → the mod; `registerRewardHandlers.ts` is now just
  the `fragmentSlot` schema. State → `useTombTreasureProgress` (useModState); `useProgression` keeps
  perks + ledger. `SiteMapScreen` reads ward keys via a new mod-agnostic `keyProviders` seam. §E
  (tombKey/ward-key placement) still deferred — that's why toggle-off hard-fails generate-world.

## Remaining (priority order — see FIDELITY-AUDIT "Progress")

1. **§F — treasure perks.** `applyTreasurePerk` is a no-op (now on `useTombTreasureProgress`) but
   `pyramid-interior-design.md` presents a full perk economy. A decision: build the perk system, or
   correct the doc. (Blocks nothing.) Note: many tomb treasures carry a perk that currently does
   nothing — §F is where they come alive.
2. **§A.3 loot `eligible` join (deferred)** — add `slot.encounter` metadata and rewrite the
   consumable/shop-money `eligible` to join on it instead of the `rewardWeight` proxy (which works).
3. **§G tomb content (deferred to playtest/tuning)** — crocodile capstone every floor, soft trap
   gating (`canAttemptTrap`), authored per-floor tableau content into the tableau family's `generate`
   (today the TOMB_SYMBOLS pool). Gameplay-facing; expects playtesting + tuning. The new last-floor
   `wardChest` pockets (§E) are optional loot — playtest whether their placement/fill feels right.

**Shop-robustness note (surfaced by §H toggle-off):** shop's junk-completeness `fill` hard-fails
when loot-bearing capacity drops below the collectible count (e.g. puzzle off). A root mod off
starving another mod's invariant is expected, but shop arguably should degrade gracefully rather
than throw. Decision, not urgent.

## As-built seams to reuse (all built here)

- **Encounter allocation** (`worldGen/placeEncounters.ts` + `allFamilyMeta.allocateEncounterFamily`)
  — gen-time tag→family resolution from the tier-eligible pool; a family joins by declaring its tag
  in `FamilyMeta` (+ `minTier`). Injected into `buildConfigs`. Add a puzzle/trap family = a pure
  plugin (its meta via `MOD_FAMILY_META`, no core edit) — see `sumplete-mirror`.
- **Distribution** (`worldGen/slotAllocator.ts`) + `allocateDistributions` — loot placement.
- **rewardContributions** (`effects`/`canAccept`/`skip`; `effects` now get a `{journeyId}` ctx) +
  **rewardDisplayRegistry** + **detectorScanners** + **keyProviders** (held ward keys the site-map
  engine reads for gate satisfaction — mirrors detectorScanners; tomb-treasure registers its
  `tombKeyIds`) + **rewardSchemas** (zod) — all in `src/app/SiteMap/`, hook-based, registered per mod
  via `registerModApps`, mod-agnostic in core.
- **useModState** (`pyramid-scheme-mod-<id>`), **generic ledger** (`ledger.get/grant/spend(id)`),
  **familyWeightFor** + **modExports** injection (via `scripts/generateWorld.ts`, the sanctioned crossing).
- Descriptor `ModDescriptor` fields; `REGISTERED_MODS`; `MOD_FAMILY_META`/`DYNAMIC_DISTRIBUTIONS`/
  `MOD_WORLD_VALIDATORS` aggregators.
- **§E reachability injection** — `ReachabilitySupport` (`reachability.ts`: `bucketForReward`/
  `thresholdFor`/`journeyEntryLock`/`tierUnlockBucket`) + `TombTreasureResolver` (`configBuilder.ts`),
  both mod-descriptor fields aggregated in `registeredMods.ts` (`MOD_REACHABILITY_SUPPORT`,
  `MOD_TOMB_TREASURE_RESOLVER`) and injected by `generateWorld.ts` into `buildConfigs`. This is how
  core world-gen gates/harvests/places a mod's currency without naming it.
- **`keyProviders`** (held ward keys the site-map engine reads for gate satisfaction; tomb-treasure
  registers its `tombKeyIds`) — the app-side counterpart, mirrors `detectorScanners`.

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
