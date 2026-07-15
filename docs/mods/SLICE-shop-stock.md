# Slice — shop stock = mod-filled, detectable node rewards

Turns the Fez shop's stock from **core-authored `shopPrice` literals** into **node rewards
the owning mods place** and the shop prices. Kills the last currency-naming in core shop
authoring, and makes the compass detector honest about shops (points at a shop only while it
still sells an unowned piece). Delivers the deferred **§A.3** (encounter/slot identity join)
as a prerequisite.

## The principle (why this shape)

A node is a node. "The last node is a chest" is just an assignment, no different from a node
in the middle — §G already proved this (the crocodile capstone is authored
`nodes:[{where:"last", encounter:"capstone"}]`, resolved like any other node). So a shop is a
**node encounter**, authored the same way, at any position — **no end-special code**.

The real pre-existing exception is that node rewards live under **two** names —
`puzzleRewards[]` (per chain position) and `mainEndReward` (the path end) — a position-based
split. This slice converges the array onto one name, **`rewards`** (rename `puzzleRewards`),
and routes shop stock into it. `mainEndReward` folds into `rewards` (terminal element) in the
**node-model unification** — its own later slice (TARGET slice 5). One uniform reward field is
what lets a detector scan a single place instead of special-casing per field.

## Why (the gap)

Today (confirmed in code):
- Shop stock is authored per tomb-floor as `sideSections` where an `endReward` + a `shopPrice`
  literal turns a side path into a shop (`spec/expert.ts:93-97`, `dsl.ts:105-108`). Core spec
  **names** `hieroglyph`/`mosaicPiece` and imports prices from `src/data/shopPricing.ts`. Shop
  render is a runtime `shopPrice != null` check (`siteAssembler.treasureOrShop`).
- `collectSlots` **skips** shop ends (`slots.ts:60-63`); `fez-shop` meta `rewardWeight:0`. So
  shop stock is NOT a node reward — a baked literal, invisible to placement and the detector.
- The compass detector filters by **ownership** (`compassScanner.ts`: drop positions where
  `hasFragment(id, idx)`), walking `mainEndReward` + `section.endReward` only — NOT
  `puzzleRewards`.

## Decisions (locked with the user)

1. **`rewards` rename.** `puzzleRewards` → `rewards`; shop stock writes into `rewards`; the
   compass scanner walks `rewards` (+ `mainEndReward`, until slice 5 folds it in). No `stock`
   field ever coined.
2. **Shop = a §G node encounter, gen-time resolved.** DSL authors a `shop` preference on a node
   (via `nodes` selectors / `encounter:"shop"`). `assignEncounters` (runs before slot collection)
   resolves `"shop"` → `fez-shop` **only when the shop mod is enabled** (tag pool). Shop off →
   unresolved → the node falls back to a normal chest. This is the "stamped before loot" step.
3. **`rewardCapacity` on `FamilyMeta`, default 1, fez-shop 6.** A node expands into
   `rewardCapacity` reward slots (`familyCapacityFor` accessor). Every ordinary node = 1 (as
   today); a shop node = 6. `collectSlots` emits N single-item slots writing into the node's
   `rewards` array — **not** a multi-item Slot (stays off TARGET's frozen item).
4. **`rewardPriority` rename + priority-0 shops.** `rewardWeight` → `rewardPriority` (two dims
   now: priority vs capacity). `fez-shop` priority **0**, so the eager/spread fills
   (junk/money) skip shop slots by the existing `> 0` filter — no accidental loot.
5. **Capacity, not priority, admits targeted placement.** The positional resolver places a
   targeted piece into a free shop slot **regardless of priority-0**; capacity caps the count.
6. **Positional assign, owned by the currency mod.** Each currency mod injects a
   `resolveShopStock(journeyId, nth) → reward?` seam (modelled on `TombTreasureResolver`,
   `configBuilder.ts:146`), placing a **specifically-identified** piece (glyph+pieceIndex,
   mosaic, mapPiece+tombId) into the nth shop of a journey. Addressing = **`(journeyId, nth)`**
   over gen-order shop-resolved nodes; tier derivable. Two fallbacks, both automatic:
   - shop mod off → no shop resolved → resolver finds none → piece defers to the capped spread;
   - no shop at the address → same defer.
   Pieces are **moved** from the capped budget, not added: the capped footprint drops by the
   shop-assigned count, totals stay stable (mosaic 298, hieroglyph 294, mapPiece unchanged).
7. **Reward lifecycle = `onCancel`, core never auto-awards.** A node grants its reward when the
   family calls `onSolved` (`handleEncounterSolved`, `SiteMapScreen.tsx:148-161`). The shop
   family calls **`onCancel` on leave** → core never offers shop rewards; loot exists on the
   node (detectable) but is granted ONLY by buying. Removes the `shopPrice != null` branch at
   `SiteMapScreen.tsx:194`.
8. **One buy path; per-(node,index) claimed set.** Currency pieces AND consumables are stock
   items bought identically: spend price + `applyReward` + mark `(node, index)` claimed
   (`canAccept` respected for pack-full). This claimed set — the multi-item generalization of
   the persisted node-solve state (`exploredSections`) — replaces per-shop `purchasedShops`.
   Detector honesty (hieroglyph) rides ownership-skip on top, automatic. Sold-out = sold-out.
   `ponytail:` claimed set bounded by total buyable (≈48), tiny beside `exploredSections`; key-
   compress only if it ever bloats.
9. **Pricing = shop-owned per-type map**, runtime (`shop/game/pricing.ts`), keyed by reward
   type id (incl. consumables) + tier. Mods stay money-blind; the shop is the money authority.
   `src/data/shopPricing.ts` price consts move here; same fn feeds `runEconomyGuard`.
   `ponytail:` mod→mod key coupling — an off mod's key is unused, no import, toggle-off holds.
10. **Leftover slots = FINITE consumables (trap-owned).** 8 shops × 6 = 48 slots; 13 currency
    items (current stock kept) + 35 consumables. Trap contributes a seeded fill for free
    `encounter:"shop"` slots. **No `freshStock`/per-visit refresh** — consumables are baked,
    sold-out = sold-out.
    **Why finite (the invariant):** total buyable must stay bounded so `runEconomyGuard`'s
    `income ≥ total buyable` still holds — that guarantees a player who buys every consumable
    can STILL afford every progression-gating piece (fragments/mapPieces moved into shops).
    Unlimited consumables → infinite buyable → the guard can't guarantee it → a player could
    money-starve and be unable to buy the item they need to progress. Finite consumables are
    what make progression-affordability provable, not just a difficulty knob.

## Stock (kept from current world, 8 shops × 6 slots)

| tombId (= journeyId) | currency items | +consumables |
|---|---|---|
| `junior_treasure_tomb` | fragment(junior) + mosaic | 4 |
| `wizard_treasure_tomb` | fragment(wizard) + mosaic | 4 |
| `wizard_treasure_tomb_b` | fragment(wizard) + mosaic | 4 |
| `wizard_treasure_tomb_c` | mosaic | 5 |
| `expert_treasure_tomb` | fragment(expert) + mosaic | 4 |
| `expert_treasure_tomb_b` | fragment(expert) | 5 |
| `master_treasure_tomb` | fragment(master) + mosaic | 4 |
| `master_treasure_tomb_b` | mapPiece(`wizard_treasure_tomb_c`) | 5 |

13 currency (6 fragment + 6 mosaic + 1 mapPiece) + 35 consumables = 48.

World-changing slice — verify by **counts + toggle-off + playtest**, not byte-identity.

## Build order (each step compiles + `vitest` green)

1. **Renames** — `rewardWeight`→`rewardPriority` (8 `meta.ts`, `FamilyMeta`, `Slot`,
   `familyWeightFor`, allocator, shop/trap `eligible`, tests) and `puzzleRewards`→`rewards`
   (types, `slots.ts`, `siteAssembler`, serializer, spec builders, scanner). Byte-identical
   checkpoint.
2. **Capacity + shop-as-node-encounter** — add `rewardCapacity` to `FamilyMeta` (+
   `familyCapacityFor`, default 1, fez-shop 6); `assignEncounters` resolves an authored `shop`
   preference → `fez-shop` (enabled-pool gated); `collectSlots` emits `rewardCapacity` slots
   (tagged `encounter:"shop"`, priority 0) into the node's `rewards`; drop `shopPrice`/currency
   `endReward` authoring from specs, author `nodes:[{where, encounter:"shop"}]` instead.
3. **Positional assign seam** — `resolveShopStock` descriptor field + aggregator +
   `generateWorld.ts` injection + `configBuilder`/`placeFragments` wiring; capped footprint
   drops by the assigned count. mapPiece/hieroglyph/mosaic mods author their tables (kept stock).
4. **Consumable fill (trap)** — trap fill for free `encounter:"shop"` slots, seeded finite
   consumables; delete `freshStock`/per-visit refresh.
5. **Runtime pricing** — `shop/game/pricing.ts` (per-type map incl. consumables, moved from
   `src/data`); wire into fezShop render + buy + `runEconomyGuard` (buyable = Σ 48 baked prices);
   delete `src/data/shopPricing.ts` price consts.
6. **Shop UI + lifecycle** — `onCancel` on leave; remove `SiteMapScreen.tsx:194` branch; one buy
   path for every stock slot (collapses `buyRare`/`buyConsumable`); per-(node,index) claimed set
   replaces `purchasedShops`.
7. **Strip + reconcile** — no currency naming left in shop authoring; update
   `ARCHITECTURE.md`/`FIDELITY-AUDIT.md`/`distribution-primitive-design.md`; fix `rewardWeight`
   doc refs; note `mainEndReward`→`rewards` deferred to the node-model unification slice.

## Acceptance

- Buy a hieroglyph fragment at a shop → own it → compass no longer points at that shop.
- Buy any stock slot (piece or consumable) → sold-out, never re-offered; no per-visit refresh.
- `yarn tsc -b` + `build` + full `vitest` + `lint` green; `yarn generate-world` builds
  (`SKIP_ECONOMY_GUARD=1` for iteration).
- Toggle-off: remove a currency mod → its shop assignments defer to world chests, world builds.
  Remove shop → shop nodes fall back to chests, no prices needed, world builds.
- Core `src/worldGen`/`src/data`/`src/game` names no currency id or price in shop authoring.
