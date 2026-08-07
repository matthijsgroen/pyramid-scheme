# Shop mechanic — Fez shop & money economy

The Fez shop is a currency sink and a relocation point for a slice of the
game's rare collectibles — buyable with a single global money currency
earned from puzzle-solve drops and junk loot.

## Placement

One shop per non-starter tomb. Shops are authored in the world DSL as side
sections whose encounter resolves to the `fez-shop` family (not a fixed
constant — there is no `NUM_SHOPS`); the shop mod fills their stock via its
`shopStock` contribution. Starter stays shop-free (no currency loop needed yet
for onboarding). Each shop sits on an ungated side path off its tomb (ordinary
puzzles en route, no key), ending in a `fez-shop` encounter instead of a plain
chest.

## Stock

Two kinds of stock, both refresh on re-entry:

- **Rare collectibles** — relocated instances of currencies the game
  already places elsewhere (hieroglyph fragment, mosaic tile, map piece —
  never a tomb key/treasure). 13 rare slots across the 8 shops: a
  fragment+mosaic pair in most shops, one shop carrying the map piece that
  unlocks the tier's final tomb instead. These are real instances of the
  same capped currencies — the shop is a placement site, not a second
  producer (see `docs/game-design/keys-and-locks-solver.md` for how
  placement into a shop's stock generalizes).
- **Consumables** — bandage/oil/trapTool, `CONSUMABLE_STOCK_PER_VISIT` (2)
  of each, every shop, every visit.

## Pricing

All defined in `src/mods/shop/game/pricing.ts`:

- **Fragment**: `250 + 50 × tierIndex` (starter=0 .. wizard=4) — junior 300,
  expert 350, master 400, wizard 450.
- **Mosaic tile**: flat 500, regardless of tier (a completionist item, not
  tied to how hard it was to find).
- **Map piece**: flat 1000 (rarest — gates the tier's final tomb).
- **Consumables**: bandage 20, oil 50, trapTool 40.

## Economy model

- **Money is a single global wallet**, spendable at any shop regardless of
  tier. Shops are revisitable — stock refreshes, a rare item persists
  until bought. A player can earn late and backtrack to an earlier shop,
  or save early for a pricier one.
- **Income**: puzzle-solve money drops (a seeded subset of puzzle
  encounters grant loose money on solve) and junk loot sell value
  (sellables, below).
- **Sinks**: consumables (optional — also free-findable via puzzles) and
  all 13 rare collectibles (mandatory for 100% completion).
- **Guard, enforced at world-gen time** (`src/worldGen/validate.ts`):
  `Σ(all shop prices, rares + one full consumable restock per shop) ≤
  Σ(all guaranteed income)`. Global cumulative, not per-tier — backtracking
  makes the whole game's economy one pool, not tier-isolated budgets.
  World generation fails if this doesn't hold.

## Sellables — real inventory items, not instant money

A `{type: "sellable", itemId}` reward adds the item to the player's
ordinary inventory (`src/app/Inventory/useInventory.ts`) — it is **not**
auto-converted to money on pickup. Selling is a deliberate action at any
shop: `removeItem` + `addMoney(item.sellValue)`. Sell value is tiered by
`MaterialTier` (`src/data/sellables.ts`): stone 10, bronze 20, silver 30,
gold 40, divine 50. Sellables are junk loot found loose in corridors —
distinct from the 40 tomb treasures (`src/mods/tombTreasure/game/treasures.ts`); the two
sets are never repurposed as each other.
