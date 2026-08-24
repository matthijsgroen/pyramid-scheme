import { describe, expect, it } from "vitest"
import type { FamilyMeta, FamilyOptions } from "@/game/families/familyMeta"
import type { SiteConfig } from "@/game/siteTypes"
import { enumerateConfigs } from "./enumerateConfigs"

// A seedable family whose bucket key is nothing but the tier, so a demand's hash reads back as the
// difficulty the pass thought that room would be built at.
const family: FamilyMeta = {
  id: "stub",
  ownerMod: "test",
  tags: ["puzzle"],
  icon: "",
  color: "",
  rewardPriority: 0,
  seedable: {
    resolveOptions: ({ difficulty }) => ({ difficulty }) as unknown as FamilyOptions,
    generate: () => null,
    grade: () => null,
  },
}

// One floor authored at `wizard` whose side section — and that section's own sub-section — sit at
// tiers of their own.
const world = (): Record<string, SiteConfig[]> => ({
  p: [
    [
      {
        pathPuzzles: 2,
        difficulty: "wizard",
        end: "treasure",
        exitOrStaircase: "exit",
        encounter: "stub",
        sideSections: [
          {
            pathPuzzles: 1,
            difficulty: "starter",
            end: "treasure",
            encounter: "stub",
            sideSections: [{ pathPuzzles: 1, difficulty: "junior", end: "treasure", encounter: "stub" }],
          },
        ],
      },
    ],
  ],
})

describe(enumerateConfigs, () => {
  it("counts a room's demand at its own section's tier, not its floor's", () => {
    const demand = enumerateConfigs(world(), [family])

    expect(demand.map(({ difficulty, rooms }) => [difficulty, rooms])).toEqual([
      ["wizard", 2],
      ["starter", 1],
      ["junior", 1],
    ])
  })
})
