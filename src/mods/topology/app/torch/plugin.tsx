import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { TORCH_META } from "@/mods/topology/game/torch/meta"
import { TorchComponent } from "./TorchComponent"

if (isModEnabled("topology")) {
  registerFamily({
    meta: TORCH_META,
    generate: () => ({ satisfied: true }),
    Component: TorchComponent,
  })
}
