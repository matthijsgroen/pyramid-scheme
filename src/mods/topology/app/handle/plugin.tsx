import { registerFamily } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { HANDLE_META } from "@/mods/topology/game/handle/meta"
import { HandleComponent } from "./HandleComponent"

type HandlePuzzle = { satisfied: boolean }

// A lever has no board to bake — its only "puzzle" is which position it stands at, which the
// Component reads straight off the journeys API. Always satisfied (decision 4): a lever is never
// unsolved, it is somewhere, and where it is is the point.
const generate = (): HandlePuzzle => ({ satisfied: true })

if (isModEnabled("topology")) {
  registerFamily({
    meta: HANDLE_META,
    generate,
    Component: HandleComponent,
  })
}
