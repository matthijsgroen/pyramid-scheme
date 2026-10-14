import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { STONE_PIPE_META } from "@/mods/topology/game/stonePipe/meta"

// Registered so a lock's pipe can be bound to it (the build resolves a realisation through the registry). No cell
// carries this family, so there is no board to generate or draw.
if (isModEnabled("topology")) {
  registerFamily({
    meta: STONE_PIPE_META,
    generate: () => ({}),
    Component: () => null,
  })
}
