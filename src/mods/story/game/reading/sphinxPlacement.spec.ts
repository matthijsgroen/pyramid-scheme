import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import type { SiteConfig, SideSection } from "@/worldGen/types"

// The ending has two halves and they must stay where they were authored: the wall is read in
// starter_1, behind a gate only the Vault of the Gods opens, and the sign that finishes it comes
// out of that same Vault. Both are loot-phase placements the solver could quietly move, so this
// walks the shipped world rather than the spec.

const sectionsOf = (configs: SiteConfig[]): SideSection[] =>
  configs.flatMap(floors =>
    floors.flatMap(floor => floor.sideSections.flatMap(s => [s, ...((s.sideSections ?? []) as SideSection[])]))
  )

const readingRooms = (configs: SiteConfig[]) =>
  sectionsOf(configs).filter(s => Object.values(s.encountersByIndex ?? {}).includes("reading"))

describe("the Sphinx ending, as generated", () => {
  it("reads the wall in the pyramid the game opened with", () => {
    expect(readingRooms(generatedWorldConfigs.starter_1)).toHaveLength(1)
  })

  it("seals it behind the Vault of the Gods' own first key", () => {
    const [reading] = readingRooms(generatedWorldConfigs.starter_1)

    expect(reading.gate).toEqual({ type: "tomb-key", wardKeyId: TOMB_PERK_IDS.wizard_treasure_tomb[0] })
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
