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

The stock is rare collectibles, nothing else:

- **Rare collectibles** — relocated instances of currencies the game
  already places elsewhere (hieroglyph fragment, mosaic tile, map piece —
  never a tomb key/treasure). 13 rare slots across the 8 shops: a
  fragment+mosaic pair in most shops, one shop carrying the map piece that
  unlocks the tier's final tomb instead. These are real instances of the
  same capped currencies — the shop is a placement site, not a second
  producer (see `docs/game-design/keys-and-locks-solver.md` for how
  placement into a shop's stock generalizes).

Hearts refill at camp and waterskins are found, never sold, so the shop stocks
no supplies; a stock slot that holds no priced item stays empty.

## Pricing

All defined in `src/mods/shop/game/pricing.ts`:

- **Fragment**: `250 + 50 × tierIndex` (starter=0 .. wizard=4) — junior 300,
  expert 350, master 400, wizard 450.
- **Mosaic tile**: flat 500, regardless of tier (a completionist item, not
  tied to how hard it was to find).
- **Map piece**: flat 1000 (rarest — gates the tier's final tomb).

## Economy model

- **Money is a single global wallet**, spendable at any shop regardless of
  tier. Shops are revisitable — stock refreshes, a rare item persists
  until bought. A player can earn late and backtrack to an earlier shop,
  or save early for a pricier one.
- **Income**: junk loot sell value (sellables, below) plus loose coins.
  Money is placed last, ground by ground (`src/mods/shop/game/loot.ts`): in
  every ground a player can stand in, smallest first, junk is placed until
  the money lying there is 1.1× what its shops sell, then the world up to
  1.1× all stock — a 10% margin, so buying everything means finding nearly
  everything. A slice of loose coins on puzzle solves comes first, early
  tiers first.
- **Sinks**: all 13 rare collectibles (mandatory for 100% completion).
- **Guard, enforced at world-gen time** (`src/worldGen/validate.ts`):
  `Σ(all shop prices, the rare collectibles) ≤ Σ(all guaranteed income)`. Global cumulative, not per-tier — backtracking
  makes the whole game's economy one pool, not tier-isolated budgets.
  World generation fails if this doesn't hold.

## Sellables — real inventory items, not instant money

A `{type: "sellable", itemId}` reward adds the item to the player's
ordinary inventory (`src/app/Inventory/useInventory.ts`) — it is **not**
auto-converted to money on pickup. Selling is a deliberate action at any
shop: `removeItem` + `addMoney(item.sellValue)`. Sell value is tiered by
`MaterialTier` (`src/data/sellables.ts`): stone 25, bronze 50, silver 75,
gold 100, divine 125. These values are the economy's main dial: the loot
budget is a fixed money-equivalent total, so higher values mean fewer,
chunkier drops for the same purchasing power. Sellables are junk loot found loose in corridors —
distinct from the 40 tomb treasures (`src/mods/tombTreasure/game/treasures.ts`); the two
sets are never repurposed as each other.
