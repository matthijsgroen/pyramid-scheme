import { freeRegions } from "@/game/lockAuthoring"
import { parseLock } from "@/game/lockNotation"
import type { FamilyMeta, FamilyOptions } from "@/game/families/familyMeta"
import { PROCESSION_REALISATION } from "@/game/mechanics/sequence"
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

/** A made-up seedable board whose bucket key is the tier and the variant a door asks it for. */
export const STUB_BOARD: FamilyMeta = {
  id: "stub-board",
  ownerMod: "test",
  tags: ["stub-board"],
  icon: "",
  color: "",
  rewardPriority: 0,
  seedable: {
    resolveOptions: ({ difficulty, variant }) => ({ difficulty, variant }) as unknown as FamilyOptions,
    generate: () => null,
    grade: () => null,
  },
}

/** A made-up procession door: its own six signs, and a door carrying the stub board. */
export const STUB_DOOR: FamilyMeta = {
  id: PROCESSION_REALISATION,
  ownerMod: "test",
  tags: ["stub-door"],
  icon: "",
  color: "",
  rewardPriority: 0,
  sequence: {
    glyphs: [0x13000, 0x13001, 0x13002, 0x13003, 0x13004, 0x13005],
    hidesOrder: true,
    board: { family: STUB_BOARD.id, variant: steps => `door${steps}` },
  },
}
