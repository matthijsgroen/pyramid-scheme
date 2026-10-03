import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { PRESSURE_PLATE_META } from "@/mods/topology/game/pressurePlate/meta"

// Registered so a sequence can be bound to it (the build resolves a realisation through the registry). A plate
// is stepped on and never entered: no cell carries this family, so there is no board to generate or draw.
if (isModEnabled("topology")) {
  registerFamily({
    meta: PRESSURE_PLATE_META,
    generate: () => ({}),
    Component: () => null,
  })
}
