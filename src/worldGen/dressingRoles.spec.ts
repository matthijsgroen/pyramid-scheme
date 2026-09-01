import { describe, expect, it } from "vitest"
import { dressByRole } from "./dressingRoles"
import type { FloorConfig, SiteConfig } from "./types"

// The whole rank pool, as a tier spec authors it — narrowing has to pick out of this, not be handed a
// convenient subset.
const RANK_POOL = [
  "shelf",
  "chestProp",
  "jarRack",
  "offeringTable",
  "basin",
  "statue",
  "lamp",
  "hanging",
  "shrine",
  "sarcophagus",
  "pillar",
  "brazier",
  "rubble",
  "pit",
  "mat",
] as const

const floor = (over: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  decorations: [...RANK_POOL],
  wallDecorations: ["veil", "wallShrine", "sconce"],
  ...over,
})

const dress = (config: FloorConfig): FloorConfig => {
  const configs: Record<string, SiteConfig[]> = { site: [[config]] }
  dressByRole(configs)
  return configs.site[0][0]
}

describe("a role furnishes the place it is", () => {
  it("keeps what belongs to the place and drops what belongs elsewhere", () => {
    const funerary = dress(floor({ role: "funerary" }))
    expect(funerary.decorations).toContain("sarcophagus")
    expect(funerary.decorations).toContain("shrine")
    expect(funerary.decorations).not.toContain("jarRack")
    expect(funerary.decorations).not.toContain("basin")

    const trade = dress(floor({ role: "trade" }))
    expect(trade.decorations).toContain("jarRack")
    expect(trade.decorations).toContain("shelf")
    expect(trade.decorations).not.toContain("sarcophagus")
  })

  it("keeps the kinds that belong to no place in particular", () => {
    // These are what stop a narrowed pool from collapsing to one thing, so they must survive every role.
    for (const role of ["funerary", "trade", "water", "cosmos", "light"]) {
      const dressed = dress(floor({ role }))
      expect(dressed.decorations, role).toEqual(expect.arrayContaining(["rubble", "pillar", "chestProp", "mat"]))
    }
  })

  it("narrows wall items too, and keeps the one that hangs anywhere", () => {
    const trade = dress(floor({ role: "trade", wallDecorations: ["niche", "tallyBoard", "stela", "sconce"] }))
    expect(trade.wallDecorations).toEqual(["niche", "tallyBoard", "sconce"])
  })

  it("leaves a pool whole when its role furnishes too little to vary", () => {
    // `water` names no wall item of its own, so an expert wing's three funerary/anywhere items would
    // narrow to just the sconce — one item in every room, which reads worse than not dressing at all.
    const water = dress(floor({ role: "water", wallDecorations: ["veil", "wallShrine", "sconce"] }))
    expect(water.wallDecorations).toEqual(["veil", "wallShrine", "sconce"])
  })

  it("leaves a pool whole when no role was authored", () => {
    const plain = dress(floor())
    expect(plain.decorations).toEqual([...RANK_POOL])
  })

  it("leaves a pool whole for a role that names no place", () => {
    // `puzzle` is what a room with no authored place gets, and `trap` says what is IN a room rather than
    // where it is. Narrowing on either cut the world down to the kinds that belong nowhere in particular.
    for (const role of ["puzzle", "trap", "tomb-puzzle"]) {
      expect(dress(floor({ role })).decorations, role).toEqual([...RANK_POOL])
    }
  })

  it("dresses side sections and their sub-sections, each for its own role", () => {
    const dressed = dress(
      floor({
        role: "trade",
        sideSections: [
          {
            pathPuzzles: 1,
            difficulty: "expert",
            end: "treasure",
            role: "water",
            decorations: [...RANK_POOL],
            sideSections: [
              {
                pathPuzzles: 1,
                difficulty: "expert",
                end: "treasure",
                role: "funerary",
                decorations: [...RANK_POOL],
              },
            ],
          },
        ],
      })
    )
    expect(dressed.sideSections[0].decorations).toContain("basin")
    expect(dressed.sideSections[0].decorations).not.toContain("sarcophagus")
    expect(dressed.sideSections[0].sideSections?.[0].decorations).toContain("sarcophagus")
    expect(dressed.sideSections[0].sideSections?.[0].decorations).not.toContain("basin")
  })
})
