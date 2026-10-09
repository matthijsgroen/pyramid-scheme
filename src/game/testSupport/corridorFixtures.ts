import { freeRegions } from "@/game/lockAuthoring"
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig } from "@/game/siteTypes"
import { BINDING } from "./lockFixtures"

/** A made-up lock with every new corridor shape: a gate aligned right, a second corridor on its pair, and a fall
 * between two gates the one lever owns. */
export const CORRIDOR_ITEMS =
  "in ---[A]- hall\nin -[B]- hall\nhall -- out\nhall -[A]- >> -[A]- pit\npit -- out\nA toggle @in\nB toggle @in"

export const corridorItemsFloor = (): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks: [{ lock: freeRegions(parseLock(CORRIDOR_ITEMS, "corridorItems").lock) }],
})
