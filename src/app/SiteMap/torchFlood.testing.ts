import { parseLock } from "@/game/lockNotation"
import { FLOOD } from "@/game/testSupport/torchFloodFixtures"
import { carvePlayground, defaultBinding, playgroundFloor } from "./playgroundCarve.testing"
import "@/mods/registerModApps"

/** A torch-and-flood lock carved alone on the playground floor with the mods on, as play carves it; a refused carve
 * throws its reasons. */
export const carved = (text: string) => {
  const config = playgroundFloor(parseLock(text, FLOOD).lock, defaultBinding())
  const found = carvePlayground(config)
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return { config, ...found }
}
