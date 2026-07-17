import type { ModDescriptor } from "../modDescriptor"
import { FEZ_SHOP_META } from "./game/fezShop/meta"
import { MONEY_CURRENCY_META } from "./game/moneyCurrency"
import { shopMoneyEconomy } from "./game/loot"
import { shopEconomyGuard } from "./game/economyGuard"

// The shop mod descriptor. Owns the Fez-shop encounter family, the money currency, loose-money +
// junk placement, and the economy guard. Toggle off by removing it from
// src/mods/registeredMods.ts — shop-tagged rooms then resolve via the family-absence pass-through
// (SiteMapScreen), no loose money or junk is placed (leftover chests fall empty), and the economy
// guard drops with the mod.
//
// Game-side only (no React). The app contributions — the shop Component and the Collection junk
// section — register via the shop app entrypoint (src/mods/shop/app, pulled in by
// registerModApps), gated on this mod being enabled.
export const shopMod: ModDescriptor = {
  id: "shop",
  families: [FEZ_SHOP_META],
  currencyMeta: MONEY_CURRENCY_META,
  dynamicDistributions: [shopMoneyEconomy],
  worldValidator: shopEconomyGuard,
}
