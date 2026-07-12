import { registerCurrency } from "@/game/ledger/currencyRegistry"
import { hieroglyphRequired } from "@/data/generatedWorld"
import { journeys } from "@/data/journeys"
import { REGISTERED_MODS } from "@/mods/registeredMods"

const fragmentTotal = Object.values(hieroglyphRequired).reduce((sum, n) => sum + n, 0)
const tombCount = journeys.filter(j => j.type === "treasure_tomb").length

registerCurrency({ id: "health", ownerMod: "trap", displayName: "currency.health", icon: "❤️", kind: "counter" })
registerCurrency({
  id: "fragment",
  ownerMod: "hieroglyph",
  displayName: "currency.fragment",
  icon: "𓂀",
  kind: "capped",
  total: fragmentTotal,
})
registerCurrency({
  id: "mapPiece",
  ownerMod: "tomb-treasure",
  displayName: "currency.mapPiece",
  icon: "📜",
  kind: "capped",
  total: tombCount,
})
registerCurrency({ id: "money", ownerMod: "shop", displayName: "currency.money", icon: "🪙", kind: "counter" })

// Extracted mods contribute their own currency meta via their descriptor — toggling a mod off
// (removing it from REGISTERED_MODS) drops its currency from the registry too. The hardcoded ones
// above are mods not yet extracted (trap/hieroglyph/tomb-treasure/shop); they move here as they land.
for (const mod of REGISTERED_MODS) if (mod.currencyMeta) registerCurrency(mod.currencyMeta)
