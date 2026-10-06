import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { STONE_PLATE_META } from "@/mods/topology/game/stonePlate/meta"

// Registered so a lock's stones can be bound to it (the build resolves a realisation through the registry). No
// cell carries this family, so there is no board to generate or draw.
if (isModEnabled("topology")) {
  registerFamily({
    meta: STONE_PLATE_META,
    generate: () => ({}),
    Component: () => null,
  })
}
