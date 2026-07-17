import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"

// Health is a trap-owned ledger currency (a counter). Its VALUE lives in the shared ledger
// (useProgression's DEFAULT_LEDGER.health); this is the display/ownership meta, which drops from
// the registry when the trap mod is toggled off. maxHealth is a fixed 6 while the perk system is
// disregarded (see TODO — perk redesign restores the max-health perk).
export const HEALTH_CURRENCY_META: CurrencyMeta = {
  id: "health",
  ownerMod: "trap",
  displayName: "currency.health",
  icon: "❤️",
  kind: "counter",
}
