# Handover — mod-restructure fidelity work (branch `mods/hieroglyph-currency`)

HEAD `e0ee4f9`, **pushed** (branch == origin). Full suite green (**715**), `yarn tsc -b`/`build`/
`lint` clean, `yarn generate-world` builds. This branch executes the gaps in
**`docs/mods/FIDELITY-AUDIT.md`** — read that first; its "Progress" section is the live tracker.

**This session (`ba2a7db..e0ee4f9`, 10 commits):**
- **tomb-treasure mod** (`19cdb89`) — the "last mod": `mapPiece`/`tombKey` extracted to
  `src/mods/tombTreasure` (currency, handlers, schemas, state, `keyProviders` seam).
- **§E — ward/tomb keys → the solver** (`afee6e3`,`f2671ef`,`68d1908`,`225c937`,`7ee6e84`): retired
  `validateDiscovery`; genericized `reachability.ts` (core names no currency, mod-injected
  `ReachabilitySupport`); injected tombKey placement (`TombTreasureResolver`); every treasure gates
  an optional `wardChest` pocket.
- **§G — node selectors + trap** (`967e11d`,`90f6200`,`324f4a7`,`e0ee4f9`): a general authoring
  vocabulary `nodes: [{ where, encounter }]` replacing the hardcoded capstone; trap gating softened;
  heal added to the (plugin-owned) trap start screen.

Verify: regen + `git diff --stat src/data/generatedWorld.ts`. tomb-treasure + §E stages 1-3 + §G are
byte-identical (or representation-only); §E stage 4 deliberately changed the world (9 pockets + loot
redistribution, reward counts stable: mapPiece 31, tombKey 40, mosaic 298, hieroglyph 294).

## Read first, in order

1. `docs/mods/FIDELITY-AUDIT.md` — the gap ledger + per-root-cause status (✅ done / ⏳ remaining).
2. `docs/mods/ARCHITECTURE.md` — the two invariants + the as-built seams.
3. `docs/mods/distribution-primitive-design.md` — the loot/encounter primitive (§"As-built refinements").
4. `docs/mods/TARGET.md` — the two rules (mod-agnostic core; toggle-off is the gate).
5. `docs/mods/pyramid-interior-design.md` §8 — the tomb-interior target (§14 = the §F perk table).
6. Slice records for this session's work: `SLICE-tomb-treasure.md`, `SLICE-E-ward-keys.md`,
   `SLICE-G-selectors.md` (the last also holds the unbuilt gate-injection design).
7. Auto-memories: `project_node_selectors`, `project_keys_and_locks_e_direction`,
   `project_distribution_primitive_contract`, `feedback_design_doc_fidelity`,
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
- **§G — tomb interior / node selectors (`SLICE-G-selectors.md`).** Reframed from "wire per-floor
  crocs" to uniform authoring with no code exceptions: a general node-selector vocabulary
  (`nodes: [{ where: "first"|"last"|n|{every,from}, encounter }]` on any path) replaced the hardcoded
  `isLast && hasCroc` + one-off `lastMainPuzzleFamily` — resolved to `encountersByIndex` (per-node
  family), consumed by placeEncounters/siteAssembler/slots/serializer. Crocodile placement
  byte-identical. Trap gating softened (`isTrapAttemptSafe` — attempt always launches, warning only;
  health consequence stays in the trap plugin) + **heal** added to the plugin-owned trap start
  screen (bandage/oil, shown when held + below max). Persistence already done (§A.2); shop kept
  floor-0. Gate-injecting selectors designed but NOT built (reopens maze assembler + §E; slice doc).
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

1. **§F — treasure perks (the main open gap; a decision first, then build-or-doc).**
   `pyramid-interior-design.md` §1+§14 present a full 40-treasure perk economy (max-health, armor,
   trap-insight, pack-mule, compass, detection, scribe's-eye) as if shipped; reality is inert.
   Concrete state: `useTombTreasureProgress.applyTreasurePerk` is a no-op stub (the `tombKey` claim
   calls it, nothing happens); `TREASURE_PERKS`/`TOMB_PERK_IDS` (`data/treasurePerks.ts`) exist;
   `perkRegistry.ts`/`registerPerks.ts` exist but their `bump` is never invoked; perk state is split
   but static in core (`useProgression.ts` `trapPerks`/`puzzlePerks`/`corePerks`, all baseline;
   maxHealth fixed 6, carry-cap 2, armor/trap-insight 0 in the trap mod). **The fork:** build the
   registry-driven perk system (revive `bump` from the tombKey claim, per-perk effects in the owning
   mods — health/armor/trap-insight → trap, scribes-eye → puzzle, detectors → core), OR correct the
   doc to mark perks deferred. Grill the user on which before building — it's a real feature, not a
   refactor. Overlaps §D/§E ownership (perk EFFECTS belong to the consuming mods, like the rest).
2. **§A.3 loot `eligible` join (deferred)** — add `slot.encounter` metadata and rewrite the
   consumable/shop-money `eligible` to join on it instead of the `rewardWeight` proxy (which works).
   Note: §G's per-node `encountersByIndex` now gives slots.ts a per-room family for loot weight —
   part of this is delivered; the remaining bit is the encounter↔slot join for the dynamic pass.
3. **Gate-injecting node selectors (designed, not built)** — extend `NodeSelector` with a `gate?`
   to place ward/floor gates mid-path (authored "ward-gate gauntlet"). Reopens the maze assembler +
   §E keys solver — its own slice. Impact analysis in `docs/mods/SLICE-G-selectors.md`.

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
- **tomb-treasure toggle-off HARD-FAILS `generate-world`** (winnability sweep) — expected, not a
  regression: ward gates are core-authored tomb/pyramid structure but depend on the mod's tomb keys.
  It's a root mod that stays on; toggle-off proves isolation of the mod's own code, not a clean
  degenerate build. (Making the mod own tomb topology is out of scope, noted in `SLICE-E`.)
- **`TRAP_FAMILIES.md` §1.2 is stale** — says "must hold ≥1 full heart to attempt"; §G softened that
  (`pyramid-interior-design.md` §8 supersedes — attempt always launches). Reconcile TRAP_FAMILIES
  when next touched.
- **Byte-identity can be "representation-only"** — §G's capstone migration + tomb-treasure's
  sentinel change altered how a thing serializes (`encountersByIndex` vs `lastMainPuzzleFamily`;
  `fragmentSlot` sentinel vs literal) without changing what renders. A non-empty `generatedWorld`
  diff is fine IF it's confined to representation + reward counts hold — check, don't assume empty.
