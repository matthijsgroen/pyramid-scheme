import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import type { FloorConfig, SiteConfig, SideSection } from "@/worldGen/types"

// The ending has two halves and they must stay where they were authored: the wall is read in
// starter_1, behind a gate only the Vault of the Gods opens, and the sign that finishes it comes
// out of that same Vault. Both are loot-phase placements the solver could quietly move, so this
// walks the shipped world rather than the spec.

const sectionsOf = (configs: SiteConfig[]): SideSection[] =>
  configs.flatMap(floors =>
    floors.flatMap(floor => floor.sideSections.flatMap(s => [s, ...((s.sideSections ?? []) as SideSection[])]))
  )

const readsTheWall = (holder: Pick<FloorConfig, "encountersByIndex">) =>
  Object.values(holder.encountersByIndex ?? {}).includes("reading")

// The reading may stand in a side section or on a floor's main path, below a stair from another floor.
const readingRooms = (configs: SiteConfig[]) => [
  ...sectionsOf(configs).filter(readsTheWall),
  ...configs.flatMap(floors => floors.filter(readsTheWall)),
]

const stairIdOf = (link: unknown): string | undefined =>
  typeof link === "object" && link !== null && "stairId" in link ? (link as { stairId: string }).stairId : undefined

// The side section whose stair leads, floor by floor, down to the floor the wall is read on.
const stairSectionLeadingTo = (floors: FloorConfig[], floor: FloorConfig): SideSection | undefined => {
  const stairId = stairIdOf(floor.entrance)
  if (!stairId) return undefined
  const fromSection = floors.flatMap(f => f.sideSections).find(s => stairIdOf(s.end) === stairId)
  if (fromSection) return fromSection
  const fromFloor = floors.find(f => stairIdOf(f.exitOrStaircase) === stairId)
  return fromFloor && stairSectionLeadingTo(floors, fromFloor)
}

describe("the Sphinx ending, as generated", () => {
  it("reads the wall in the pyramid the game opened with", () => {
    expect(readingRooms(generatedWorldConfigs.starter_1)).toHaveLength(1)
  })

  it("seals it behind the Vault of the Gods' own first key", () => {
    const floors = generatedWorldConfigs.starter_1.find(site => site.some(readsTheWall))
    const reading = floors?.find(readsTheWall)
    const gated =
      reading && floors ? stairSectionLeadingTo(floors, reading) : readingRooms(generatedWorldConfigs.starter_1)[0]

    expect((gated as SideSection | undefined)?.gate).toEqual({
      type: "tomb-key",
      wardKeyId: TOMB_PERK_IDS.wizard_treasure_tomb[0],
    })
  })

  it("puts the reed leaf in the Vault, and nowhere else in the world", () => {
    const homes = Object.entries(generatedWorldConfigs).filter(([, configs]) =>
      sectionsOf(configs).some(
        s => (s.endReward as { type: string; hieroglyphId?: string } | undefined)?.hieroglyphId === "s1"
      )
    )

    expect(homes.map(([journeyId]) => journeyId)).toEqual(["wizard_treasure_tomb"])
  })
})
