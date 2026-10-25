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

Three kinds of stock, all in Fez's one buy list:

- **Rare collectibles** — relocated instances of currencies the game
  already places elsewhere (hieroglyph fragment, mosaic tile, map piece —
  never a tomb key/treasure). 13 rare slots across the 8 shops: a
  fragment+mosaic pair in most shops, one shop carrying the map piece that
  unlocks the tier's final tomb instead. These are real instances of the
  same capped currencies — the shop is a placement site, not a second
  producer (see `docs/game-design/keys-and-locks-solver.md` for how
  placement into a shop's stock generalizes).
- **Purchases** — the seven animals and carts (`src/mods/shop/game/purchases.ts`).
  Each is a key: it opens a tier or a tomb on top of that gate's own lock, and
  the reachability worklist places it in its named shop only when that shop is
  reached before the gate it opens. Bought, it opens its gate at once and its
  camp steps arrive on the next homecoming.

  | Purchase        | Sold in                  | Opens                            | Price |
  | --------------- | ------------------------ | -------------------------------- | ----- |
  | `donkey`        | `junior_treasure_tomb`   | tier expert                      | 200   |
  | `cart`          | `expert_treasure_tomb`   | tier master                      | 300   |
  | `camel`         | `expert_treasure_tomb`   | journey `expert_treasure_tomb_b` | 250   |
  | `secondDonkey`  | `master_treasure_tomb`   | tier wizard                      | 250   |
  | `secondCamel`   | `master_treasure_tomb`   | journey `master_treasure_tomb_b` | 250   |
  | `sturdyCart`    | `wizard_treasure_tomb`   | journey `wizard_treasure_tomb_b` | 400   |
  | `caravanBanner` | `wizard_treasure_tomb_c` | nothing                          | 500   |

- **Waterskins** — 2 in every expert-and-up tomb shop (7 shops, 14 in all),
  put there by the trap mod's `shopStock`. Not keys, just stock that money
  must cover where it is sold. A bought waterskin heals like a found one.

Hearts refill at camp, so the shop stocks no other supplies. A shop has no
empty stock slot: its stock is trimmed to what was assigned before the layout
is picked.

## Pricing

All defined in `src/mods/shop/game/pricing.ts`:

- **Fragment**: `250 + 50 × tierIndex` (starter=0 .. wizard=4) — junior 300,
  expert 350, master 400, wizard 450.
- **Mosaic tile**: flat 500, regardless of tier (a completionist item, not
  tied to how hard it was to find).
- **Map piece**: flat 1000 (rarest — gates the tier's final tomb).
- **Purchase**: the table above.
- **Waterskin**: `10 × (tierIndex + 1)` — expert 30, master 40, wizard 50.

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
  tiers first. A chest no ground needs keeps a little loose change, since an
  empty end would change which ends the carve picks as key hosts.
- **Sinks**: all 13 rare collectibles (mandatory for 100% completion), the 7
  purchases and Fez's 14 waterskins.
- **Guard, enforced at world-gen time** (`src/mods/shop/game/economyGuard.ts`,
  a world validator): for every **ground** — a place a player can stand in
  from empty hands, given which key pieces they bought (`src/worldGen/grounds.ts`)
  — the money lying in it covers everything for sale in it:
  `income(ground) ≥ buyable(ground)`. A player stuck in a ground with an
  unbought key has then spent at most what that ground sells less the key's
  price, whatever they bought first. A check per gate, withholding one gate at
  a time, is not enough: buying one key and then a rare can strand a player
  that check never sees. Grounds are enumerated breadth-first, at most 4096
  (`GROUND_CAP`); past it the bake fails and names the count. Hidden-pocket
  money counts only in grounds that hold the corridor detector.
  `yarn loot-report` lists every ground's row.

## Sellables — real inventory items, not instant money

A `{type: "sellable", itemId}` reward adds the item to the player's
ordinary inventory (`src/app/Inventory/useInventory.ts`) — it is **not**
auto-converted to money on pickup. Selling is a deliberate action at any
shop: `removeItem` + `addMoney(item.sellValue)`. Sell value is tiered by
`MaterialTier` (`src/data/sellables.ts`): stone 30, bronze 60, silver 90,
gold 120, divine 150. These values are the economy's main dial: the fill
places drops until each ground's value is met, so higher values mean fewer,
chunkier drops for the same purchasing power. Sellables are junk loot found loose in corridors —
distinct from the 40 tomb treasures (`src/mods/tombTreasure/game/treasures.ts`); the two
sets are never repurposed as each other.
