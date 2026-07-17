import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"

// Money is a shop-owned ledger currency (a counter). Its VALUE lives in the shared ledger
// (useProgression's DEFAULT_LEDGER.money) — like mosaicPiece, a broadly-earned currency the
// always-present HUD balance reads; this is the display/ownership meta, which drops from the
// registry when the shop mod is toggled off. Money is only spendable at the Fez shop, so with
// shop off nothing grants or spends it.
export const MONEY_CURRENCY_META: CurrencyMeta = {
  id: "money",
  ownerMod: "shop",
  displayName: "currency.money",
  icon: "🪙",
  kind: "counter",
}
