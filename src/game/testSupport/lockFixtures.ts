import { doubleBackLock } from "@/worldGen/spec/locks/doubleBack"
import { sluiceLock } from "@/worldGen/spec/locks/sluice"
import type { RealisationBinding } from "@/game/lockCompile"

export const BINDING: RealisationBinding = {
  toggle: "handle",
  activator: "torch",
  sequence: "plates",
  "fork-switch": "lightbeamSwitch",
  "one-way": "zipline",
  "region-barrier": "water",
}

export { doubleBackLock, sluiceLock }
