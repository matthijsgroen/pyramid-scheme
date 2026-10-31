import { describe, expect, it } from "vitest"
import { buildFloor, buildSite, wireSideSectionStaircases, wireStaircases } from "./buildSite"
import type { FloorConfig, SideSection } from "./types"
import { wardWing, type PyramidConstraint } from "./dsl"
import { collectSlots } from "./slots"
import { parsePrefab } from "../game/prefabNotation"

// Made-up rooms, so nothing here reads the real catalogue.
const roomText = (tier: string) => `tier ${tier}\nlayout\n# # # # #\n# . . . #\n# . s . #\n# . . . #\n# # d # #\ns stop`
const catalogue = { hall: parsePrefab(roomText("starter"), "hall"), nook: parsePrefab(roomText("starter"), "nook") }

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

describe("wireSideSectionStaircases", () => {
  const site = { journeyId: "j", pyramidIndex: 0 }
  const floor = (...sideSections: SideSection[]): FloorConfig =>
    buildFloor({ pathPuzzles: 1, difficulty: "starter", sideSections })
  const stair = (stairId: string): SideSection => ({ pathPuzzles: 0, difficulty: "starter", end: { stairId } })
  const base = { pathPuzzles: 1, difficulty: "starter", end: "treasure" } as const

  describe("a site naming no target and no depth wires exactly as before", () => {
    it("a main chain walks down floor by floor to one exit", () => {
      const floors = [floor(), floor(), floor()]
      wireSideSectionStaircases(floors, site)
      expect(floors).toEqual([
        { ...base, sideSections: [], exitOrStaircase: { stairId: "j:p0:f0:main" } },
        {
          ...base,
          sideSections: [],
          entrance: { stairId: "j:p0:f0:main" },
          exitOrStaircase: { stairId: "j:p0:f1:main" },
        },
        { ...base, sideSections: [], entrance: { stairId: "j:p0:f1:main" }, exitOrStaircase: "exit" },
      ])
    })

    it("a ward stair off floor 0 enters a floor with no way out of its own", () => {
      const floors = [floor(stair("w")), floor(), floor()]
      wireSideSectionStaircases(floors, site)
      expect(floors).toEqual([
        { ...base, sideSections: [stair("w")], exitOrStaircase: "exit" },
        { ...base, sideSections: [], entrance: { stairId: "w" }, exitOrStaircase: "none" },
        { ...base, sideSections: [], exitOrStaircase: "exit" },
      ])
    })

    it("a tomb-like chain of side stairs enters each floor by the one before", () => {
      const floors = [floor(stair("a")), floor(stair("b")), floor()]
      wireSideSectionStaircases(floors, site)
      expect(floors).toEqual([
        { ...base, sideSections: [stair("a")], exitOrStaircase: "exit" },
        { ...base, sideSections: [stair("b")], entrance: { stairId: "a" }, exitOrStaircase: "none" },
        { ...base, sideSections: [], entrance: { stairId: "b" }, exitOrStaircase: "none" },
      ])
    })
  })

  it("two stair sections on one floor enter the floors they name", () => {
    const floors = [floor(stair("a"), stair("b")), floor(), floor()]
    wireSideSectionStaircases(floors, site, { sectionTargets: new Map([["b", 2]]) })
    expect(floors[1]).toMatchObject({ entrance: { stairId: "a" }, exitOrStaircase: "none" })
    expect(floors[2]).toMatchObject({ entrance: { stairId: "b" }, exitOrStaircase: "none" })
    expect(floors[0].exitOrStaircase).toBe("exit")
  })

  it("a floor reached by a side stair may climb by its main path to a later floor", () => {
    const floors = [floor(stair("w")), floor(), floor()]
    wireSideSectionStaircases(floors, site, { toFloor: [undefined, 2] })
    expect(floors[0].exitOrStaircase).toBe("exit")
    expect(floors[1]).toMatchObject({ entrance: { stairId: "w" }, exitOrStaircase: { stairId: "j:p0:f1:main" } })
    expect(floors[2]).toMatchObject({ entrance: { stairId: "j:p0:f1:main" }, exitOrStaircase: "none" })
  })

  it("an off-walk floor's own toFloor keeps its stair, wherever its chain enters it from", () => {
    // Side stair 0 → 1, main 1 → 2, main 2 → 3: each off-walk floor names its way on and keeps it.
    const floors = [floor(stair("w")), floor(), floor(), floor()]
    wireSideSectionStaircases(floors, site, { toFloor: [undefined, 2, 3] })
    expect(floors[1].exitOrStaircase).toEqual({ stairId: "j:p0:f1:main" })
    expect(floors[2]).toMatchObject({
      entrance: { stairId: "j:p0:f1:main" },
      exitOrStaircase: { stairId: "j:p0:f2:main" },
    })
    expect(floors[3]).toMatchObject({ entrance: { stairId: "j:p0:f2:main" }, exitOrStaircase: "none" })
    expect(floors[0].exitOrStaircase).toBe("exit")
  })

  it("a stair to a shallower floor goes up, and the floor it enters is entered going down", () => {
    // Down a side stair, along a deep floor, up by its main path into a floor that lies between the two.
    const floors = [floor(stair("w")), floor(), floor()]
    wireSideSectionStaircases(floors, site, { toFloor: [undefined, 2], depth: [0, 2, 1] })
    expect(floors[0].sideSections[0].end).toEqual({ stairId: "w" })
    expect(floors[1].entrance).toEqual({ stairId: "w" })
    expect(floors[1].exitOrStaircase).toEqual({ stairId: "j:p0:f1:main", goes: "up" })
    expect(floors[2].entrance).toEqual({ stairId: "j:p0:f1:main", goes: "down" })

    const climbing = [floor(stair("up")), floor()]
    wireSideSectionStaircases(climbing, site, { depth: [1, 0] })
    expect(climbing[0].sideSections[0].end).toEqual({ stairId: "up", goes: "up" })
    expect(climbing[1].entrance).toEqual({ stairId: "up", goes: "down" })
  })

  it.each([
    ["an earlier index", [floor(), floor(stair("w"))], { sectionTargets: new Map([["w", 0]]) }, /floor=1: .*earlier/],
    ["itself", [floor(stair("w")), floor()], { sectionTargets: new Map([["w", 0]]) }, /floor=0: .*its own floor/],
    [
      "a floor already entered",
      [floor(stair("a"), stair("b")), floor()],
      {},
      /floor=0: stair b leads to floor 1, which another stair already enters/,
    ],
    ["no floor", [floor(stair("w")), floor()], { sectionTargets: new Map([["w", 5]]) }, /floor=0: .*does not have/],
    ["an equal depth", [floor(), floor()], { depth: [0, 0] }, /floor=0: .*same depth/],
  ])("a stair to %s is refused, naming where", (_label, floors, links, message) => {
    let error: unknown
    try {
      wireSideSectionStaircases(floors, site, links)
    } catch (e) {
      error = e
    }
    expect(String(error)).toMatch(/journey=j pyramid=1 floor=/)
    expect(String(error)).toMatch(message)
  })

  it("a target named by a section that is no floor's own stair is refused", () => {
    const floors = [floor({ ...stair("top"), sideSections: [stair("deeper")] }), floor()]
    expect(() => wireSideSectionStaircases(floors, site, { sectionTargets: new Map([["deeper", 1]]) })).toThrow(
      /journey=j pyramid=1: stair deeper names a floor/
    )
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

  it("authored floors[] branch: a floor's chambers come from its own nodes and count, else the site's count", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: {
        chambers: 2,
        floors: [
          { pathPuzzles: 2, chambers: 3, nodes: [{ where: 1, chamberAfter: "ledger" }] },
          { pathPuzzles: 2, sideSections: [{ pathPuzzles: 2, nodes: [{ where: "last", chamberAfter: true }] }] },
        ],
      },
    })
    expect([floors[0].chambers, floors[0].chambersByIndex]).toEqual([3, { 0: "ledger" }])
    expect([floors[1].chambers, floors[1].chambersByIndex]).toEqual([2, undefined])
    expect(floors[1].sideSections[0].chambersByIndex).toEqual({ 1: true })
  })

  it("a floor's rooms and pinned nodes carry the parsed prefabs, with placement defaults filled in", () => {
    const { floors } = buildSite({
      ...baseCtx,
      catalogue,
      constraint: {
        rooms: [{ room: "nook" }],
        floors: [
          { pathPuzzles: 2, rooms: [{ room: "hall", min: 2 }], nodes: [{ where: 1, room: "nook" }] },
          { pathPuzzles: 2, sideSections: [{ pathPuzzles: 2, nodes: [{ where: "last", room: "hall" }] }] },
        ],
      },
    })
    expect(floors[0].prefabPlacements).toEqual([{ room: "hall", min: 2, max: 2, central: 0.5 }])
    expect(floors[0].prefabsByIndex).toEqual({ 0: "nook" })
    expect(Object.keys(floors[0].prefabs ?? {}).sort()).toEqual(["hall", "nook"])
    expect(floors[0].prefabs?.hall).toBe(catalogue.hall)
    expect(floors[1].prefabPlacements).toEqual([{ room: "nook", min: 0, max: 1, central: 0.5 }])
    expect(floors[1].sideSections[0].prefabsByIndex).toEqual({ 1: "hall" })
    expect(floors[1].sideSections[0].prefabs).toEqual({ hall: catalogue.hall })
  })

  it("an auto-built pyramid's floors hold the site's rooms", () => {
    const { floors } = buildSite({ ...baseCtx, catalogue, constraint: { rooms: [{ room: "hall", max: 2 }] } })
    expect(floors[0].prefabPlacements).toEqual([{ room: "hall", min: 0, max: 2, central: 0.5 }])
  })

  describe("a room's tier is the difficulty of the floor that names it", () => {
    const junior = { ...catalogue, hall: parsePrefab(roomText("junior"), "hall") }
    const refused = (constraint: PyramidConstraint) => () => buildSite({ ...baseCtx, catalogue: junior, constraint })

    it("refuses a count on a floor of another difficulty, naming journey, floor, room and both tiers", () => {
      expect(refused({ floors: [{ pathPuzzles: 1 }, { pathPuzzles: 1, rooms: [{ room: "hall" }] }] })).toThrow(
        /journey=j1 pyramid=1 floor=1: room hall is tier junior but the difficulty there is starter/
      )
    })

    it("refuses a pinned node and a section's pin the same way", () => {
      expect(refused({ floors: [{ pathPuzzles: 1, nodes: [{ where: 1, room: "hall" }] }] })).toThrow(
        /floor=0: room hall/
      )
      expect(
        refused({
          floors: [{ pathPuzzles: 1, sideSections: [{ pathPuzzles: 1, nodes: [{ where: 1, room: "hall" }] }] }],
        })
      ).toThrow(/floor=0 section=s0: room hall is tier junior but the difficulty there is starter/)
    })

    it("refuses a site's rooms on an auto-built floor of another difficulty", () => {
      expect(refused({ rooms: [{ room: "hall" }] })).toThrow(/room hall is tier junior/)
    })

    it("refuses a site's rooms on a wing built at another difficulty, with no exception for wings", () => {
      const wing = wardWing({ tomb: "starter_treasure_tomb", index: 0, tier: "junior" })
      expect(refused({ mainFloors: 1, wardWings: [wing], rooms: [{ room: "nook" }] })).toThrow(
        /wing: room nook is tier starter but the difficulty there is junior/
      )
    })

    it("accepts a room of the floor's own difficulty on every floor, wings included", () => {
      const wing = wardWing({ tomb: "starter_treasure_tomb", index: 0, tier: "starter" })
      expect(refused({ mainFloors: 1, wardWings: [wing], rooms: [{ room: "nook" }] })).not.toThrow()
    })
  })

  it("declares no prefab field on a floor that names no room", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { floors: [{ pathPuzzles: 2 }] } })
    for (const field of ["prefabs", "prefabPlacements", "prefabsByIndex"]) expect(floors[0]).not.toHaveProperty(field)
  })

  it("declares no chamber on a floor that neither it nor its site asks for", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { floors: [{ pathPuzzles: 2 }] } })
    expect(floors[0]).not.toHaveProperty("chambers")
    expect(floors[0]).not.toHaveProperty("chambersByIndex")
  })

  it("auto-built pyramid: every floor carries the site's chamber count", () => {
    const { floors } = buildSite({ ...baseCtx, constraint: { chambers: 2 } })
    expect(floors.map(floor => floor.chambers)).toEqual(floors.map(() => 2))
  })

  it("authored floors[] branch: a stair section and a main path lead to the floors they name, climbing by depth", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: {
        floors: [
          { pathPuzzles: 1, sideSections: [{ end: "staircase", toFloor: 2 }] },
          { pathPuzzles: 1 },
          { pathPuzzles: 1, toFloor: 3, depth: 4 },
          { pathPuzzles: 1, depth: 3 },
        ],
      },
    })
    const sectionStair = floors[0].sideSections[0].end
    expect(sectionStair).toEqual({ stairId: "j1:p0:f0:s0" })
    expect(floors[0].exitOrStaircase).toEqual({ stairId: "j1:p0:f0:main" })
    expect(floors[1].entrance).toEqual({ stairId: "j1:p0:f0:main" })
    expect(floors[1].exitOrStaircase).toBe("exit")
    expect(floors[2].entrance).toEqual({ stairId: "j1:p0:f0:s0" })
    expect(floors[2].exitOrStaircase).toEqual({ stairId: "j1:p0:f2:main", goes: "up" })
    expect(floors[3].entrance).toEqual({ stairId: "j1:p0:f2:main", goes: "down" })
    // Reached only through the side stair, so the site's one exit stays on floor 1.
    expect(floors[3].exitOrStaircase).toBe("none")
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

  it("authored floors[] branch: a floor reached by a side stair never gains a main stair down", () => {
    const { floors } = buildSite({
      ...baseCtx,
      constraint: {
        floors: [
          { pathPuzzles: 1, sideSections: [{ pathPuzzles: 1, end: "staircase" }] },
          { pathPuzzles: 2 },
          { pathPuzzles: 1 },
        ],
      } as PyramidConstraint,
    })
    expect(floors[1].exitOrStaircase).toBe("none")
    expect(floors[2].entrance).toBeUndefined()
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
