# Handover — Slice 4 (shop) DONE; tomb-treasure mod next

Branch `mods/hieroglyph-currency`, **not pushed**. Tree has the Slice-4 changes uncommitted.
Full suite green (715), `yarn build` clean, `yarn generate-world` builds byte-identical with the
economy guard ON, and toggle-off is proven (shop out of `REGISTERED_MODS` → world + app build,
guard gone, no dynamic money/junk).

## Read first, in this order

1. `docs/mods/ARCHITECTURE.md` — the as-built system: the two invariants, the seams
   (descriptor, registries, placement pipeline, mod state), the lifecycle, the mod inventory.
2. `docs/mods/app-plugins-design.md` — the clean-cut app-plugin design (built).
3. `docs/mods/distribution-primitive-design.md` — loot placement.
4. `docs/mods/TARGET.md` — the two rules.
5. Auto-memories: `project_mod_restructure_target`, `reference_worldgen_dsl_authoring`,
   `project_shop_mechanic_design`, `project_world_authorship_doom_loop`, `feedback_design_doc_fidelity`.

## What landed this session — Slice 4, shop is a full mod

`shopMod` is now in `REGISTERED_MODS` and owns the whole injected money economy. The pattern
mirrors trap exactly (game-side descriptor + self-gated app entrypoint).

- **Descriptor** `src/mods/shop/index.ts` — `{ id, families:[FEZ_SHOP_META], currencyMeta (money),
  money (MoneySpec), junk (JunkSpec), worldValidator (economy guard) }`. New game-side files under
  `src/mods/shop/game/`: `moneyCurrency.ts`, `loot.ts` (money + junk specs), `economyGuard.ts`.
- **Money currency** — meta moved off the hardcoded line in `registerCurrencies.ts` to the
  descriptor. VALUE stays on the shared ledger (`DEFAULT_LEDGER.money`), the mosaic/health
  precedent (broadly-earned, HUD-shown); no `useModState`.
- **Dynamic-loot injection generalized** — `placeFragments`/`configBuilder`/`generateWorld` now
  thread a single `DynamicLootSpecs { consumables?, money?, junk? }` (was a lone `consumables?`
  param). Aggregated in `registeredMods.ts` as `DYNAMIC_LOOT`. `MONEY_FRACTION`/`JUNK_EAGERNESS`
  are gone from core — they're `SHOP_MONEY_SPEC`/`SHOP_JUNK_SPEC`.
- **Economy guard is shop-owned** — `validateEconomyGuard` moved out of core `validate.ts` to
  `src/mods/shop/game/economyGuard.ts` (`runEconomyGuard` + the `SKIP_ECONOMY_GUARD`-aware
  `shopEconomyGuard`). Injected via the new descriptor `worldValidator` field →
  `MOD_WORLD_VALIDATORS` → `buildConfigs` runs them last. Core `validate` names no shop.
- **Collection junk section is shop-owned** — `SellableCategorySection` moved out of
  `Collection.tsx` to `src/mods/shop/app/ShopCollectionSection.tsx`, registered self-gated in
  `shop/app/index.ts`. Fez plugin now self-gates on `isModEnabled("shop")`.
- **`Slot.assign` widened to accept `undefined`** — the dynamic pass now clears leftover chest
  placeholders to empty when junk is off (a `fragmentSlot` must never reach the serializer). This
  is what makes "shop off → chests fall empty" actually build.

## Mod inventory now

- **mosaic, hieroglyph, trap, shop** — full mods in `REGISTERED_MODS`, toggle-off proven.
- **core, puzzle** — families only, always-on, app entrypoints via `registerModApps`.

## Toggle-off residual (the deferred reward-vocab leak, NOT a Slice-4 bug)

With shop off, dynamic money/junk drop to 0/0 as intended, but ~77 **authored** `end:"junk"`
sellables still bake (from `worldGen/spec/*.ts` `.settings({ end:"junk" })` → `pathEndToReward`).
This is the SAME class as authored `encounter:"trap"` surviving trap-off (resolves via family
pass-through): authored DSL naming a mod concept. It's the closed-reward-vocabulary gotcha below,
explicitly out of Slice-4 scope. The world still builds and is solvable; the residual junk is dead
inventory (no shop to sell at).

## Next: tomb-treasure mod (the last mod)

`mapPiece` + `collectedMapPieces` — still core (`registerCurrencies` hardcodes the `mapPiece`
currency; `useProgression` holds `collectedMapPieces`). Stage it like trap/shop: descriptor
(`currencyMeta` mapPiece + `currencyDistributions`), self-gated app bits, toggle-off proof.

## Gotchas carried forward

- **Reward-vocabulary leak:** `TreasureReward` in `siteTypes.ts`/`worldGen/types.ts` and the
  reward handlers in `registerRewardHandlers.ts` still name `mosaicPiece`/`hieroglyphFragment`/
  `money`/`sellable`; `pathEndToReward` bakes authored `junk`; the serializer names them. This is
  the last "closed core vocabulary" gap — its own cleanup, and the reason shop toggle-off leaves
  the 77 authored sellables above. Do this before or alongside a vocabulary-sensitive slice.
- **hieroglyph fragments** still live in core `useProgression` (`collectedFragments`) — deliberate.
- **Perks DISREGARDED** — `applyTreasurePerk` is a no-op; every perk at baseline. Registry dormant.
- `SKIP_ECONOMY_GUARD=1 yarn generate-world` for iteration (now honored inside the shop guard).
