import { describe, expect, it } from "vitest"
import { buildFloor, buildSite, wireStaircases } from "./buildSite"
import type { FloorConfig } from "./types"
import type { PyramidConstraint } from "./dsl"
import { collectSlots } from "./slots"

describe("buildFloor", () => {
  it("defaults to an exiting floor with no main reward (the caller/site decides the chest)", () => {
    // buildFloor stays reward-agnostic — it runs before staircase wiring, so it can't know whether
    // this floor truly exits. The site (buildSite) decides the main-end loot slot per structure.
    expect(buildFloor({ pathPuzzles: 2, difficulty: "starter", sideSections: [] })).toEqual({
      pathPuzzles: 2,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
    })
  })

  it("carries through optional fields only when defined", () => {
    const floor = buildFloor({
      pathPuzzles: 2,
      difficulty: "starter",
      sideSections: [],
      encounter: "tableau",
      encountersByIndex: { 1: "crocodile" },
      activitiesByIndex: { 1: "ledger" },
      corridorStraightness: 0.5,
    })
    expect(floor.activitiesByIndex).toEqual({ 1: "ledger" })
    expect(floor.encounter).toBe("tableau")
    expect(floor.encountersByIndex).toEqual({ 1: "crocodile" })
    expect(floor.corridorStraightness).toBe(0.5)
    expect(floor.packing).toBeUndefined()
  })
})

describe("wireStaircases", () => {
  it("links each floor's exit to the next floor's entrance, leaving the last floor untouched", () => {
    const floors: FloorConfig[] = [
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
      buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] }),
    ]
    wireStaircases(floors, { journeyId: "j", pyramidIndex: 4 })
    expect(floors[0].exitOrStaircase).toEqual({ stairId: "j:p4:f0:main" })
    expect(floors[1].entrance).toEqual({ stairId: "j:p4:f0:main" })
    expect(floors[1].exitOrStaircase).toEqual({ stairId: "j:p4:f1:main" })
    expect(floors[2].entrance).toEqual({ stairId: "j:p4:f1:main" })
    expect(floors[2].exitOrStaircase).toBe("exit")
  })

  it("does nothing for a single floor", () => {
    const floors = [buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections: [] })]
    wireStaircases(floors, { journeyId: "j", pyramidIndex: 4 })
    expect(floors[0].exitOrStaircase).toBe("exit")
    expect(floors[0].entrance).toBeUndefined()
  })
})

describe("buildSite", () => {
  const baseCtx = {
    journeyId: "j1",
    tier: "starter" as const,
    pyramidIndex: 0,
    levelCount: 3,
    pathPuzzles: 3,
    constraint: {},
    difficulty: "starter" as const,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    mosaicPathCount: 0,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" as const }),
  }

  it("single-floor branch: no floors[]/mainFloors/wardWings authored → one exiting floor", () => {
    const { floors } = buildSite(baseCtx)
    expect(floors).toHaveLength(1)
    expect(floors[0].exitOrStaircase).toBe("exit")
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("authored floors[] branch: one FloorConfig per entry, every floor's main path bears a loot slot", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: { floors: [{ pathPuzzles: 1 }, { pathPuzzles: 2 }] },
    })
    expect(floors).toHaveLength(2)
    // Each floor's main path exits into a treasure chest (floors chain via side-section staircases),
    // so both get an untagged loot slot — a non-last floor is no longer an empty chest.
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[1].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("authored floors[] branch: a floor's own mainEndReward/nodes/encounter override the site defaults — a tomb's self-gated shortcut", () => {
    const { floors } = buildSite<"tombTreasure">({
      ...baseCtx,
      resolveReward: spec => (spec === "tombTreasure" ? { type: "tombKey", keyId: "k1" } : undefined),
      constraint: {
        floors: [
          { pathPuzzles: 1, mainEndReward: "tombTreasure", encounter: "tableau" },
          { pathPuzzles: 2, nodes: [{ where: "last", encounter: "crocodile", activity: "ledger" }] },
        ],
      } as PyramidConstraint,
    })
    expect(floors[0].mainEndReward).toEqual({ type: "tombKey", keyId: "k1" })
    expect(floors[0].encounter).toBe("tableau")
    // `nodes: [{where:"last"}]` on a 2-node path resolves to index 1.
    expect(floors[1].encountersByIndex).toEqual({ 1: "crocodile" })
    expect(floors[1].activitiesByIndex).toEqual({ 1: "ledger" })
    // Non-last floor's own reward, not the site-level fallback (which never runs here).
    expect(floors[0].mainEndReward).not.toEqual({ type: "fragmentSlot" })
  })

  it("auto multi-floor branch: mainFloors > 1 chains floors via wireStaircases, non-last floor gets a real reward slot", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { mainFloors: 3 } })
    expect(floors).toHaveLength(3)
    expect(floors[0].exitOrStaircase).toEqual({ stairId: "j1:p0:f0:main" })
    // Non-last main floors must carry a real mainEndReward (fragmentSlot), never leave it
    // unset — an unset mainEndReward used to fall back to a free, uncounted mosaicPiece.
    expect(floors[0].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[1].mainEndReward).toEqual({ type: "fragmentSlot" })
    expect(floors[2].exitOrStaircase).toBe("exit")
    expect(floors[2].mainEndReward).toEqual({ type: "fragmentSlot" })
  })

  it("authored floors[] branch: the site's one exit is on floor 0, and a floor reached by a side stair has none", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: {
        floors: [
          { pathPuzzles: 1, sideSections: [{ pathPuzzles: 1, end: "staircase" }] },
          { pathPuzzles: 2, sideSections: [{ pathPuzzles: 1, end: "staircase" }] },
          { pathPuzzles: 1 },
        ],
      } as PyramidConstraint,
    })
    expect(floors.map(f => f.exitOrStaircase)).toEqual(["exit", "none", "none"])
  })

  it("authored floors[] branch: a floor with no stairhead section goes down by its main path to one exit on the last floor", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: { floors: [{ pathPuzzles: 1 }, { pathPuzzles: 2 }, { pathPuzzles: 1 }] },
    })
    expect(floors.map(f => f.exitOrStaircase)).toEqual([
      { stairId: "j1:p0:f0:main" },
      { stairId: "j1:p0:f1:main" },
      "exit",
    ])
    expect(floors[1].entrance).toEqual({ stairId: "j1:p0:f0:main" })
    expect(floors[2].entrance).toEqual({ stairId: "j1:p0:f1:main" })
  })

  it("auto multi-floor branch: the exit ends the last main floor, and a ward wing has none", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { mainFloors: 2, wardWings: 1 } })
    expect(floors).toHaveLength(3)
    expect(floors[1].exitOrStaircase).toBe("exit")
    expect(floors[2].entrance).toBeDefined()
    expect(floors[2].exitOrStaircase).toBe("none")
  })

  it("inits an empty puzzle-reward array per chain (fill happens later, in the placement pass)", () => {
    const { floors } = buildSite({ ...baseCtx, pathPuzzles: 20 })
    expect(floors[0].rewards).toHaveLength(20)
    // buildSite only creates the slots; the dynamic-loot distributions fill them
    // (dynamicDistributions.spec covers fill + the per-site seed variation).
    expect(floors[0].rewards?.every(r => r === undefined)).toBe(true)
  })
})

describe("a site theme handed down", () => {
  const ctx = {
    journeyId: "j1",
    tier: "starter" as const,
    pyramidIndex: 0,
    levelCount: 3,
    pathPuzzles: 3,
    difficulty: "starter" as const,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" as const }),
  }
  const theme = { encounter: "sky", encounterArgs: { skin: "night" } }

  it("gives its role and its args to a floor that authors neither", () => {
    const { floors } = buildSite({ ...ctx, constraint: theme })
    expect(floors[0].encounter).toBe("sky")
    expect(floors[0].encounterArgs).toEqual({ skin: "night" })
  })

  it("lets a floor override both", () => {
    const { floors } = buildSite({
      ...ctx,
      constraint: { ...theme, floors: [{ encounter: "puzzle", encounterArgs: { skin: "day" } }] },
    })
    expect(floors[0].encounter).toBe("puzzle")
    expect(floors[0].encounterArgs).toEqual({ skin: "day" })
  })

  it("reaches side paths only when the caller opts in", () => {
    const section = { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const }
    const opted = buildSite({
      ...ctx,
      constraint: { ...theme, sideSections: [section] },
      sideEncounter: theme.encounter,
      sideEncounterArgs: theme.encounterArgs,
    })
    expect(opted.floors[0].sideSections[0].encounter).toBe("sky")
    expect(opted.floors[0].sideSections[0].encounterArgs).toEqual({ skin: "night" })

    // A tomb never opts in: its role wants encounterArgs a side path has no reason to carry, and handing it
    // down crashed world generation on the first tableau.
    const plain = buildSite({ ...ctx, constraint: { ...theme, sideSections: [section] } })
    expect(plain.floors[0].sideSections[0].encounter).toBeUndefined()
  })

  /**
   * A skin travels further than a role, and on purpose.
   *
   * A role can demand args (a tomb's `tomb-puzzle` reads `encounterArgs.runNr`), which is why only a caller
   * that knows its rooms are plain puzzle rooms hands one down. A skin demands nothing — it is a name a
   * family may recognise — so any site may hand it to any section, including a trapped one.
   */
  describe("a site's skin", () => {
    const night = { theme: "night" }

    it("reaches a floor that authors none, and yields to one that does", () => {
      expect(buildSite({ ...ctx, constraint: night }).floors[0].theme).toBe("night")
      const overridden = buildSite({ ...ctx, constraint: { ...night, floors: [{ theme: "day" }] } })
      expect(overridden.floors[0].theme).toBe("day")
    })

    it("reaches a side path that authors none, even one that authors its own role", () => {
      const trapped = { pathPuzzles: 1, difficulty: "starter" as const, end: "treasure" as const, encounter: "trap" }
      const { floors } = buildSite({
        ...ctx,
        constraint: { ...night, sideSections: [trapped] },
        sideTheme: "night",
      })
      expect(floors[0].sideSections[0].encounter).toBe("trap")
      expect(floors[0].sideSections[0].theme).toBe("night")
    })

    it("leaves a section that authors its own skin alone", () => {
      const section = {
        pathPuzzles: 1,
        difficulty: "starter" as const,
        end: "treasure" as const,
        theme: "day",
      }
      const { floors } = buildSite({ ...ctx, constraint: { ...night, sideSections: [section] }, sideTheme: "night" })
      expect(floors[0].sideSections[0].theme).toBe("day")
    })
  })
})

// The authoring side of the same seam: a floor constraint's junctions and its switch have to reach
// the FloorConfig the serializer then bakes, or the feature is dropped between two files that both
// compile.
describe("authored forks and switches", () => {
  const built = (constraint: PyramidConstraint) =>
    buildSite({
      journeyId: "j1",
      tier: "junior",
      pyramidIndex: 0,
      levelCount: 1,
      pathPuzzles: 2,
      constraint,
      difficulty: "junior",
      hasMapPieceBranch: false,
      hasWardGate: false,
      nextTier: null,
      resolveReward: () => undefined,
      resolveMainEndReward: () => ({ type: "mosaicPiece" }),
    }).floors

  it("reaches the built floor config", () => {
    const floors = built({
      floors: [{ forks: [{ exits: 2, count: 1 }], switches: { encounter: "lightbeamSwitch", min: 1, max: 1 } }],
    })

    expect(floors[0].forks).toEqual([{ exits: 2, count: 1 }])
    expect(floors[0].switches).toEqual({ encounter: "lightbeamSwitch", min: 1, max: 1 })
  })

  it("hands the site's own down to a floor that names none", () => {
    const floors = built({
      forks: [{ exits: 3, count: 2 }],
      switches: { encounter: "lightbeamSwitch", min: 1, max: 2 },
    })

    expect(floors[0].forks).toEqual([{ exits: 3, count: 2 }])
    expect(floors[0].switches).toEqual({ encounter: "lightbeamSwitch", min: 1, max: 2 })
  })

  it("lets the floor's own win over the site's", () => {
    const floors = built({
      forks: [{ exits: 3, count: 2 }],
      floors: [{ forks: [{ exits: 2, count: 1 }] }],
    })

    expect(floors[0].forks).toEqual([{ exits: 2, count: 1 }])
  })
})

describe("buildSite loot: false", () => {
  const ctx = {
    journeyId: "starter_1",
    tier: "starter" as const,
    pyramidIndex: 0,
    levelCount: 3,
    pathPuzzles: 3,
    difficulty: "starter" as const,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    mosaicPathCount: 0,
    resolveReward: () => ({ type: "mosaicPiece" as const }),
    resolveMainEndReward: () => ({ type: "mosaicPiece" as const }),
  }
  const slotsOf = (constraint: PyramidConstraint) => {
    const { floors } = buildSite({ ...ctx, constraint })
    return { floors, slots: collectSlots({ starter_1: [floors] }) }
  }

  it("a lootless floor emits no generated slots but keeps its authored treasure", () => {
    const { floors, slots } = slotsOf({
      floors: [
        {
          loot: false,
          pathPuzzles: 3,
          mainEndReward: "mosaicPiece",
          sideSections: [{ pathPuzzles: 2 }],
        },
      ],
    })
    expect(slots).toEqual([])
    expect(floors[0].mainEndReward).toEqual({ type: "mosaicPiece" })
  })

  it("a lootless floor's unauthored ends hold nothing, the main one and a section's", () => {
    const { floors } = slotsOf({ floors: [{ loot: false, pathPuzzles: 1, sideSections: [{ pathPuzzles: 1 }] }] })
    expect(floors[0].mainEndReward).toBeUndefined()
    expect(floors[0].sideSections[0].endReward).toBeUndefined()
  })

  it("a lootless site reaches every floor, section and nested section", () => {
    const { slots } = slotsOf({
      loot: false,
      floors: [{ pathPuzzles: 2, sideSections: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 1 }] }] }, {}],
    })
    expect(slots).toEqual([])
  })

  it("a lootless section drops its own slots and leaves the rest of the floor alone", () => {
    const { slots } = slotsOf({
      floors: [{ pathPuzzles: 2, sideSections: [{ pathPuzzles: 2, loot: false }] }],
    })
    expect(slots.filter(s => s.kind === "puzzle")).toHaveLength(2)
    expect(slots.filter(s => s.kind === "end")).toHaveLength(1)
  })

  it("a lootless node drops only its own room's slot", () => {
    const { slots } = slotsOf({ floors: [{ pathPuzzles: 3, nodes: [{ where: 2, loot: false }] }] })
    expect(slots.filter(s => s.kind === "puzzle")).toHaveLength(2)
  })

  it("an unset loot leaves the built floor unchanged", () => {
    const { floors } = slotsOf({ floors: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 1 }] }] })
    expect(floors[0]).not.toHaveProperty("loot")
    expect(floors[0]).not.toHaveProperty("lootByIndex")
    expect(floors[0].sideSections[0]).not.toHaveProperty("loot")
  })
})

describe("buildSite tileset", () => {
  const ctx = {
    journeyId: "starter_1",
    tier: "starter" as const,
    pyramidIndex: 0,
    levelCount: 3,
    pathPuzzles: 3,
    difficulty: "starter" as const,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    mosaicPathCount: 0,
    resolveReward: () => ({ type: "mosaicPiece" as const }),
    resolveMainEndReward: () => ({ type: "mosaicPiece" as const }),
  }
  const floorsOf = (constraint: PyramidConstraint) => buildSite({ ...ctx, constraint }).floors

  it("a site's tileset reaches every floor, and a floor's own wins", () => {
    const floors = floorsOf({ tileset: "cave", floors: [{ pathPuzzles: 1 }, { pathPuzzles: 1, tileset: "junior" }] })
    expect(floors.map(f => f.tileset)).toEqual(["cave", "junior"])
  })

  it("a section names its own tileset, and the floor's is not copied onto it", () => {
    const [floor] = floorsOf({
      tileset: "cave",
      floors: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 1, tileset: "junior" }, { pathPuzzles: 1 }] }],
    })
    expect(floor.sideSections.map(s => s.tileset)).toEqual(["junior", undefined])
  })

  it("a nested section wears its parent's tileset unless it names its own", () => {
    const [floor] = floorsOf({
      floors: [
        {
          pathPuzzles: 1,
          sideSections: [
            {
              pathPuzzles: 1,
              tileset: "cave",
              sideSections: [{ pathPuzzles: 1 }, { pathPuzzles: 1, tileset: "junior" }],
            },
          ],
        },
      ],
    })
    expect(floor.sideSections[0].sideSections?.map(s => s.tileset)).toEqual(["cave", "junior"])
  })

  it("an unset tileset leaves the built floor unchanged", () => {
    const [floor] = floorsOf({ floors: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 1 }] }] })
    expect(floor).not.toHaveProperty("tileset")
    expect(floor.sideSections[0]).not.toHaveProperty("tileset")
  })
})
