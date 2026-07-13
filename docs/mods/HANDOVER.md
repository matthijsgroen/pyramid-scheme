# Handover — Slice 4 (shop) next; trap done, clean-cut done

Branch `mods/hieroglyph-currency`, **not pushed**. Tree clean. Full suite green (714),
`yarn build` clean, `yarn generate-world` builds with the economy guard ON.

## Read first, in this order

1. `docs/mods/ARCHITECTURE.md` — the as-built system: the two invariants, the seams
   (descriptor, registries, placement pipeline, mod state), the lifecycle, the mod inventory.
2. `docs/mods/app-plugins-design.md` — the clean-cut app-plugin design (now built).
3. `docs/mods/distribution-primitive-design.md` — loot placement (junk row REVISED → shop).
4. `docs/mods/TARGET.md` — the two rules. `TODO.md` — the live tracker.
5. Auto-memories: `project_mod_restructure_target`, `reference_worldgen_dsl_authoring`,
   `project_world_authorship_doom_loop`, `feedback_design_doc_fidelity`.

## What landed this session (20 commits, `25c4692`..`535e2f1`)

- **Slice 3a loot** — unified dynamic loot pass (`dynamicLoot.ts`): money + consumables into
  puzzle slots, junk by eagerness over all slots with ≥1-of-each completeness; `assignPuzzleRewards`
  retired. **Part B**: a slot's tier = its own section difficulty, not the journey's.
- **Slice 3b trap — DONE.** trap `ModDescriptor` (family + `consumables` ConsumableSpec + `health`
  currencyMeta); consumables trap-owned + **expert+-only** eligibility; health + consumables moved
  to `useTrapProgress` (trap `useModState`); HUD gated. Toggle-off clean.
- **Perks DISREGARDED** — `applyTreasurePerk` is a no-op; every perk at baseline (maxHealth 6,
  armor 0). Registry dormant. See TODO's perk section.
- **Clean-cut app plugins — DONE (stages 1–4).** `src/app` + `src/game` name NO mod and import NO
  mod. Screen / HUD-widget / reward-effect (contribution) registries; each mod has an `app/index.ts`
  entrypoint; `registerModApps` is the single app manifest (`registerAllFamilies` +
  `registerAllCollectionSections` deleted).

## Mod inventory now

- **mosaic, hieroglyph, trap** — full mods (in `REGISTERED_MODS`): game descriptor + app entrypoint,
  toggle-off proven.
- **core, puzzle** — families only (treasure-chest/key-gate; sumplete/crocodile), always-on, app
  entrypoints registered via `registerModApps`. Not toggleable mods.
- **shop** — the Fez shop family (`fez-shop`) exists + registers via `mods/shop/app/index.ts`, but
  shop is **NOT** a descriptor mod yet, and money/junk/economy-guard still live in core. THIS is
  Slice 4.

## Slice 4 — shop (the whole money economy). Stage it like trap.

1. **Shop `ModDescriptor` + register.** New `src/mods/shop/index.ts` (families: `[FEZ_SHOP_META]`);
   add `shopMod` to `REGISTERED_MODS`. The app entrypoint (`shop/app/index.ts`) already exists —
   have the fez-shop plugin self-gate on `isModEnabled("shop")` (mirror trap). Toggle-off proof.
2. **Money currency → shop.** Move the hardcoded `money` entry in
   `src/app/state/registerCurrencies.ts` → `shopMod.currencyMeta`. (Money VALUE stays on the shared
   ledger — see open decision below.)
3. **Money distribution → shop-injected.** `MONEY_FRACTION` is hardcoded in `dynamicLoot.ts`. Give
   the descriptor a money spec (mirror `ConsumableSpec` — a `fraction`), inject it through
   `generateWorld` → `buildConfigs` → `placeFragments` → `assignDynamicLoot`, like `CONSUMABLES`.
   The money reward EFFECT (`addMoney`) uses core `progression` (ledger), so it can stay a core
   reward handler like `hieroglyphFragment` — no `trapProgress`-style leak.
4. **Junk / sellables → shop-owned** (design revised — was core). `dynamicLoot.ts fillJunk` +
   `src/data/sellables.ts` + the ≥1-each completeness + the Collection "junk" section (`Collection.tsx`
   `SellableCategorySection`) all become shop-injected/shop-owned. Inject a junk spec like money's.
   **Shop off → no junk placed, leftover chests fall to empty.**
5. **Economy guard → shop.** `validateEconomyGuard` (`src/worldGen/validate.ts`, reads shopPrices +
   `TOTAL_CONSUMABLE_BUYABLE`) is shop-specific — move its ownership to the shop mod. Core `validate`
   should stop naming shop.
6. **Toggle-off proof:** shop out of `REGISTERED_MODS` → world + app build; guard gone with it; no
   money/junk/shop; still solvable.

## Seams to reuse (all built this session)

- **Dynamic-distribution injection**: `ConsumableSpec` in `dynamicLoot.ts` (fraction + roll +
  eligible), injected via `registeredMods.CONSUMABLES` → `buildConfigs`. Money + junk want the same
  shape. Consider generalizing `placeFragments`'s trailing `consumables?` param into a small set of
  injected dynamic specs rather than adding one param per currency.
- **Reward contributions** (`rewardContributions.ts`) — for a mod reward effect needing mod state.
  Money doesn't need it (ledger via core progression); keep in mind if shop grows mod-only state.
- **Descriptor `currencyMeta`** + the `registerCurrencies` loop — money display moves here.
- **App entrypoint + `registerModApps`** — shop screen/HUD (if any) register here, self-gated.

## Open decisions for Slice 4

- **Money storage**: shared ledger (as now) vs shop-owned `useModState` (health's precedent —
  trap-only). Money is only spent at the shop and only useful with it, so the health argument
  applies; but money is earned broadly (junk sales, money rewards) and shown in the always-present
  HUD balance. Decide before moving money value.
- **Junk toggle-off = empty chests** — confirmed acceptable by the design; sanity-check the economy
  guard's own removal doesn't leave a broken half-state.
- **Shop stock capacity** — authored per-visit stock today; per-instance capacity is Distribution
  Increment 2 (encounter distributions). Slice 4 can stay with authored stock.

## Gotchas carried forward

- **Reward-vocabulary leak (separate from shop):** `TreasureReward` in `siteTypes.ts`/`worldGen/types.ts`
  still names `mosaicPiece`/`hieroglyphFragment`/`money`/`sellable`. The typed baked variants + the
  serializer's `hieroglyphRequired` are the last "closed core vocabulary" gap — its own cleanup, not
  Slice 4.
- **hieroglyph fragments** still live in core `useProgression` (`collectedFragments`) — deliberate,
  a player-facing counter.
- **tomb-treasure** (`mapPiece` + `collectedMapPieces`) is the last mod after shop.
- `dynamicLoot` money placement is per-site shuffle; junk is eagerness (chest 1.0 / puzzle 0.6).
  Preserve the shape when moving them to injected specs; validate by the economy guard, not
  byte-identical.
- `SKIP_ECONOMY_GUARD=1 yarn generate-world` for iteration.
