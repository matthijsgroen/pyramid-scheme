import type { ModDescriptor } from "../modDescriptor"
import { shopLootTotals } from "./game/lootTotals"
import { FEZ_SHOP_META } from "./game/fezShop/meta"
import { MONEY_CURRENCY_META } from "./game/moneyCurrency"
import { shopMoneyEconomy } from "./game/loot"
import { shopEconomyGuard } from "./game/economyGuard"
import { PURCHASES, purchaseProblems, purchaseShopStock, worldPurchaseJourneys } from "./game/purchases"
import { purchaseCurrency } from "./game/purchaseCurrency"
import { SHOP_REACHABILITY } from "./game/reachabilitySupport"

// The shop mod descriptor. Owns the Fez-shop encounter family, the money currency, loose-money +
// junk placement, the economy guard, and the purchases: the animals and carts Fez sells, each a key
// to the gate it opens. Toggle off by removing it from src/mods/registeredMods.ts — shop-tagged
// rooms then resolve via the family-absence pass-through (SiteMapScreen), no loose money or junk
// is placed (leftover chests fall empty), the economy guard drops with the mod, and no purchase is
// placed or asked for, so every tier and tomb opens on the other mods' gates alone.
//
// Game-side only (no React). The app contributions — the shop Component and the Collection junk
// section — register via the shop app entrypoint (src/mods/shop/app, pulled in by
// registerModApps), gated on this mod being enabled.
export const shopMod: ModDescriptor = {
  id: "shop",
  families: [FEZ_SHOP_META],
  currencyMeta: MONEY_CURRENCY_META,
  currencyDistributions: [purchaseCurrency(PURCHASES)],
  shopStock: purchaseShopStock(PURCHASES),
  reachabilitySupport: SHOP_REACHABILITY,
  // An unsound purchase table (a purchase gating starter or junior among the reasons) refuses the build before placement.
  authoringProblems: () => purchaseProblems(PURCHASES, worldPurchaseJourneys()).map(problem => `purchases: ${problem}`),
  dynamicDistributions: [shopMoneyEconomy],
  worldValidator: shopEconomyGuard,
  lootTotals: shopLootTotals,
}
