import { registerCurrency } from "@/game/ledger/currencyRegistry"
import { journeys } from "@/data/journeys"
import { REGISTERED_MODS } from "@/mods/registeredMods"

const tombCount = journeys.filter(j => j.type === "treasure_tomb").length

registerCurrency({
  id: "mapPiece",
  ownerMod: "tomb-treasure",
  displayName: "currency.mapPiece",
  icon: "📜",
  kind: "capped",
  total: tombCount,
})

// Extracted mods contribute their own currency meta via their descriptor — toggling a mod off
// (removing it from REGISTERED_MODS) drops its currency from the registry too. The hardcoded one
// above is the mod not yet extracted (tomb-treasure); it moves here when that mod lands (trap,
// shop and mosaic already contribute their currencies via their descriptors).
for (const mod of REGISTERED_MODS) {
  if (!mod.currencyMeta) continue
  const metas = Array.isArray(mod.currencyMeta) ? mod.currencyMeta : [mod.currencyMeta]
  for (const meta of metas) registerCurrency(meta)
}
