import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { wardKeyDifficulty } from "@/data/difficultyLevels"
import type { SiteConfig, SideSection } from "./types"

// Invariant guard over the whole shipped world: what a ward key opens must be as hard as the key
// itself. dsl.ts's `wardKeyTier` already enforces this for the gated SECTION (its difficulty is
// derived from the key's own tomb), but a ward path ends in a staircase, and the floor on the far
// side is authored separately — nothing tied that floor back to the key until this check.
//
// Break it and the loot tiers follow the floor, not the lock: a starter-tomb treasure opened a
// junior floor in the starter onboarding pyramid, so the first key in the game paid out junior
// mosaic glass. Slot tier IS the placement constraint every currency filters on
// (hieroglyphCurrency's `s.tier === demand.tier`, mosaic's per-tier pools), so a mis-tiered floor
// silently pulls a whole tier's loot behind a lower tier's key.

// Both a section's `end` and a floor's `entrance` name their staircase the same way — as
// `{ stairId }` rather than one of the plain string forms.
const stairIdOf = (link: SideSection["end"] | SiteConfig[number]["entrance"]): string | undefined =>
  typeof link === "object" && "stairId" in link ? link.stairId : undefined

const mismatches = (configs: Record<string, SiteConfig[]>): string[] => {
  const found: string[] = []

  for (const [journeyId, siteConfigs] of Object.entries(configs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      const floorByStair = new Map<string, { difficulty: string; index: number }>()
      floors.forEach((floor, index) => {
        const stairId = stairIdOf(floor.entrance)
        if (stairId) floorByStair.set(stairId, { difficulty: floor.difficulty, index })
      })

      const walk = (section: SideSection) => {
        const stairId = stairIdOf(section.end)
        if (section.gate?.type === "tomb-key" && stairId) {
          const target = floorByStair.get(stairId)
          const keyTier = wardKeyDifficulty(section.gate.wardKeyId)
          if (target && keyTier && target.difficulty !== keyTier)
            found.push(
              `${journeyId} level ${levelIndex}: ${section.gate.wardKeyId} (${keyTier}) opens floor ${target.index} (${target.difficulty})`
            )
        }
        for (const sub of section.sideSections ?? []) walk(sub)
      }

      for (const floor of floors) for (const section of floor.sideSections) walk(section)
    })
  }

  return found
}

describe("ward gates", () => {
  it("open a floor of their own key's difficulty", () => {
    expect(mismatches(generatedWorldConfigs).join("\n")).toBe("")
  })
})
