# Handover — mod restructure, after Slice 1 (mosaic)

Branch `mods/ledger-currency-registry`, pushed. Full suite 711 green. Working tree clean.

## Read first, in this order

1. `docs/mods/TARGET.md` — the canonical plan (layered B, the two rules, the slice route).
   Do NOT treat `docs/mods/_brainstorm.md` as the plan; it's archived reasoning.
2. `docs/mods/SLICE-CHECKLIST.md` — per-slice steps; the exit criterion is the toggle-off proof.
3. `TODO.md` — live tracker. Slice 1 + the world-authoring exercise are checked off; the "Slices 2+"
   and "Frozen" sections are what's left.
4. Auto-memories (loaded each session): `project_mod_restructure_target`,
   `project_world_authorship_doom_loop`, `reference_worldgen_dsl_authoring`.

## What's done this session

- **Slice 1 (mosaic) — COMPLETE.** Mosaic is a mod-owned capped currency placed on the general
  loot pool (`src/mods/mosaic/`, phase-3 pass in `placeFragments.ts`, `computeMosaicPaths` deleted).
  Files moved into `src/mods/mosaic/`, runtime seen-count extracted to `useMosaicProgress`
  (`useModState`), and the **full toggle-off gate passes**: removing `mosaic` from
  `src/mods/registeredMods.ts` drops world-gen placement + the `mosaicPiece` currency-meta + the
  screen together, world builds with the economy guard ON.
- **World-authoring exercise — COMPLETE.** Deleting the auto-distributor exposed that the world was
  auto-expanding loot without authorship (see the doom-loop memory). Grew all 5 tiers on an
  escalation ladder; the economy is now solvent BY AUTHORSHIP (guard passes without
  `SKIP_ECONOMY_GUARD`). Escalation: starter (ward-chest teasers) → junior (varied ward wings) →
  expert (first open traps, first floor keys, consumable bump, broad packing) → master (multi-color
  keys + key chains, `wardPathTrapped`, junk income) → wizard (saturate all).
- New DSL primitives (all in `dsl.ts` + `buildSite.ts`): `wardChest`, floor-level
  `sidePaths`/`hiddenPaths`, varied `wardWings` (`WardWingSpec[]`), key chains (nested floor-key).

## What's next: Slice 2 — tableau / hieroglyph (first GATING currency)

This is the hard toggle-off. Hieroglyph fragments GATE progress (a tomb needs N fragments), unlike
mosaic which never blocks. Today the hieroglyph currency is already partly mod-owned
(`src/mods/tableau/game/hieroglyphCurrency.ts`, a `CurrencyDistribution` injected via
`src/mods/allCurrencyDistributions.ts`). The slice: make it a full mod like mosaic, and prove
toggle-off — which means **core's keys-and-locks solver must tolerate a gating currency simply not
existing** (no hieroglyph gates → those tombs are reachable without them, world still solvable).

Likely shape (re-plan against the code first):
- Fold `allCurrencyDistributions.ts` into the mod-descriptor model (the `CurrencyDistribution` is
  the gating analogue of mosaic's `CappedCurrency` — probably a `gatingCurrencies` descriptor field).
- Decide whether the hieroglyph currency lives under `mods/tableau` or its own `mods/hieroglyph`
  (it has a dedicated Collection screen — the "second stakeholder" signal in the brainstorm).
- Toggle-off proof: hieroglyph out of the registry → `resolveKeyRequirements` / reachability must
  not require fragments that don't exist; `EXPECTED_HIEROGLYPH_FRAGMENTS` injection already exists,
  so the count check is skippable. Watch the tomb `piecesRequired` gates.

## Gotchas to carry forward (learned the hard way)

- **Game/app layering.** `src/mods/registeredMods.ts` is imported by world-gen scripts (node/tsx),
  so it must never transitively pull in React. Descriptors hold game-side data only; screens are
  gated app-side (`Base.tsx` via `isModEnabled`). Split any app contribution accordingly.
- **DSL cascade REPLACES array fields.** A pyramid/journey `sidePaths`/`sideSections` override
  replaces the tier's — it does NOT merge. Restate the tier's entries (factor into a reusable const,
  see `spec/expert.ts`'s `EXPERT_SIDE_PATHS`) when adding to them.
- **`.floor()` = fully-authored mode.** Authoring a floor drops the tier's default
  `sidePaths`/`hiddenPaths` (buildSite's authored-floors branch). Author at `.pyramid()` level to
  keep tier defaults. `sidePaths`/`hiddenPaths` are now readable at BOTH pyramid and floor level.
- **The maze assembler flattens deep nested floor-key chains.** 2-level key chains survive;
  3-level does not (collapses to siblings). Keep chains to 2 levels.
- **`printStats` counts nested rewards now** (fixed this session) — but if you add new nesting,
  double-check any tally that walks sections.

## Verification workflow

- Iterate world-gen with `SKIP_ECONOMY_GUARD=1 yarn generate-world` + `yarn world-info --tier=X
  --per-pyramid`. The economy guard is a global balance check; the env gate is a dev affordance,
  NOT for release builds. A real `generate-world` (for commit) must pass with the guard ON.
- Toggle-off proof per slice: empty/edit `REGISTERED_MODS`, regenerate, confirm the mod's
  contributions vanish and the world still builds; restore.
- Run the full suite (`yarn vitest run`, 711) before committing a slice.

## Frozen (do not extend until modules land)

Phase-4 uncapped loot (drop-rate sellables/consumables), filler-loot generalization, slot capacity
(a shop's N-item stock). See `docs/game-design/keys-and-locks-solver.md` "Open".
