import { registerCurrency } from "@/game/ledger/currencyRegistry"
import { REGISTERED_MODS } from "@/mods/registeredMods"

// Every registered mod contributes its own currency meta via its descriptor — toggling a mod off
// (removing it from REGISTERED_MODS) drops its currency from the ledger + collection registry too.
// Core seeds no currency id of its own; the map-piece / tomb-key currency now rides the
// tomb-treasure mod like every other (trap, shop, mosaic, hieroglyph).
for (const mod of REGISTERED_MODS) {
  if (!mod.currencyMeta) continue
  const metas = Array.isArray(mod.currencyMeta) ? mod.currencyMeta : [mod.currencyMeta]
  for (const meta of metas) registerCurrency(meta)
}
