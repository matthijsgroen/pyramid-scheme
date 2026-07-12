import { registerCurrency } from "@/game/ledger/currencyRegistry"
import { hieroglyphRequired } from "@/data/generatedWorld"
import { journeys } from "@/data/journeys"
import { LEVEL_STEPS } from "@/mods/mosaic/game/mosaicRevealOrder"

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
  id: "mosaicPiece",
  ownerMod: "mosaic",
  displayName: "currency.mosaicPiece",
  icon: "🟦",
  kind: "capped",
  total: LEVEL_STEPS.length,
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
