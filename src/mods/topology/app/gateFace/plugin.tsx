import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { GATE_FACE_META } from "@/mods/topology/game/gateFace/meta"
import { GateFaceComponent } from "./GateFaceComponent"

// The face is read off the door's own cell (FamilyContext.gateFace), so there is nothing to generate.
if (isModEnabled("topology")) {
  registerFamily({
    meta: GATE_FACE_META,
    generate: () => ({}),
    Component: GateFaceComponent,
  })
}
