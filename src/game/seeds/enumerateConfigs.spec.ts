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

// A seedable family whose board is built for a fork's shape as well as its tier, so a demand's hash
// reads back as the pair the pass thought that junction would be built at.
const switchFamily: FamilyMeta = {
  ...family,
  id: "stub-switch",
  tags: ["stub-switch"],
  seedable: {
    resolveOptions: ({ difficulty, forkShape }) => ({ difficulty, forkShape }) as unknown as FamilyOptions,
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

// A floor holding two junctions open and standing a switch in one of them. Nothing on its chains is the
// switch family: a switch is never the k-th room of a section.
const switchWorld = (switches: {
  encounter: string | string[]
  min: number
  max: number
}): Record<string, SiteConfig[]> => ({
  p: [
    [
      {
        pathPuzzles: 1,
        difficulty: "junior",
        end: "treasure",
        exitOrStaircase: "exit",
        encounter: "stub",
        sideSections: [],
        forks: [{ exits: 2, count: 2 }],
        switches,
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

  it("owes a floor's switch a board at every fork shape, at that floor's own tier", () => {
    const demand = enumerateConfigs(switchWorld({ encounter: "stub-switch", min: 1, max: 1 }), [family, switchFamily])

    expect(
      demand
        .filter(entry => entry.familyId === "stub-switch")
        .map(({ difficulty, ctx, rooms }) => [difficulty, ctx.forkShape, rooms])
    ).toEqual([
      ["junior", "adjacent", 1],
      ["junior", "opposite", 1],
      ["junior", "three", 1],
    ])
  })

  it("owes every shape a board per junction a switch can fill, never more than `forks` holds open", () => {
    const filled = enumerateConfigs(switchWorld({ encounter: "stub-switch", min: 1, max: 2 }), [family, switchFamily])
    const beyond = enumerateConfigs(switchWorld({ encounter: "stub-switch", min: 1, max: 5 }), [family, switchFamily])

    expect(filled.filter(entry => entry.familyId === "stub-switch").map(entry => entry.rooms)).toEqual([2, 2, 2])
    expect(beyond.filter(entry => entry.familyId === "stub-switch").map(entry => entry.rooms)).toEqual([2, 2, 2])
  })

  it("owes the boards to every family an authored switch pool could resolve to", () => {
    // Its own dial, so its buckets are its own: the demand map is keyed by the options hash, and two
    // families that resolved to the same options would be one bucket rather than two.
    const other: FamilyMeta = {
      ...switchFamily,
      id: "stub-switch-2",
      seedable: {
        resolveOptions: ({ difficulty, forkShape }) =>
          ({ difficulty, forkShape, mirrored: true }) as unknown as FamilyOptions,
        generate: () => null,
        grade: () => null,
      },
    }
    const demand = enumerateConfigs(switchWorld({ encounter: ["stub-switch", "stub-switch-2"], min: 1, max: 1 }), [
      family,
      switchFamily,
      other,
    ])

    expect(demand.map(entry => `${entry.familyId}/${entry.ctx.forkShape ?? "no shape"}`).sort()).toEqual([
      "stub-switch-2/adjacent",
      "stub-switch-2/opposite",
      "stub-switch-2/three",
      "stub-switch/adjacent",
      "stub-switch/opposite",
      "stub-switch/three",
      "stub/no shape",
    ])
  })
})
