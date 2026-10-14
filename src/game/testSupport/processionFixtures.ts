import { freeRegions } from "@/game/lockAuthoring"
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig } from "@/game/siteTypes"

/** A made-up lock: three steps, the first in the hall the door stands off, then one in each annex. */
export const PROCESSION_LOCK =
  "in -- hall\nhall -- east\nhall -- west\nhall -[P]- out\n" +
  "P procession hall east west reset hall-out\nin ?\nhall ?\neast ?\nwest ?\nout ?"

/** The floor a lock in notation stands on alone, laid as a lock floor is: its ids read `<name>.<id>`. */
export const lockFloor = (text: string, overrides: Partial<FloorConfig> = {}, name = "door"): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: freeRegions(parseLock(text, name).lock) }],
  ...overrides,
})
