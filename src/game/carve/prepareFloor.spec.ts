import "@/mods/registerModApps"
import { describe, expect, it } from "vitest"
import { defaultResolveEncounter } from "../encounterFallback"
import { prepareFloor } from "./prepareFloor"
import { assembleFloor } from "./assembleFloor"
import { validateSite } from "../siteValidator"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { isGateRoom, findRoom, ONE_SWITCH, assembleAt, switchConfig, offRouteDoubleBackConfig } from "./carveFixtures"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig, SideSection } from "../siteTypes"
import type { PlacedContainer } from "../regions"
import type { StatefulControl } from "../obstacles"
import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import type { LockPlan } from "../lockPlan"
import { leverLock } from "../testSupport/floorLockFixtures"
import { BINDING } from "../testSupport/lockFixtures"
const plain = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

const section = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})

// hall → mid → vault along the route, with `side` hanging off hall.
const layout = (overrides: Partial<PlacedContainer> = {}): PlacedContainer => ({
  regions: [
    { name: "hall", appetite: "free" },
    { name: "mid", appetite: "free" },
    { name: "vault", appetite: "free" },
    { name: "side", appetite: "free" },
  ],
  connections: [
    ["hall", "mid"],
    ["mid", "vault"],
    ["hall", "side"],
  ],
  in: "hall",
  out: "vault",
  ...overrides,
})

const reEnterable: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const reasonsOf = (config: FloorConfig, resolvers: Parameters<typeof prepareFloor>[3] = {}) => {
  const result = prepareFloor("site", config, 7, resolvers)
  return result.ok ? [] : result.reasons
}

describe("prepareFloor", () => {
  describe("refuses what no seed can carve, by name", () => {
    it("two sections answering to one name", () => {
      const config = plain({ sideSections: [section({ label: "twice" }), section({ label: "twice" })] })
      expect(reasonsOf(config)).toEqual([{ type: "unusableSectionAddress", address: "twice" }])
    })

    it("a section hung below the depth the carve builds", () => {
      const deepest = { sideSections: [section()] } as Partial<SideSection>
      const config = plain({ sideSections: [section({ sideSections: [section(deepest)] })] })
      expect(reasonsOf(config)).toEqual([{ type: "sectionTooDeep", address: "s0.0.0" }])
    })

    it("a region declared twice", () => {
      const graph = layout()
      const config = plain({
        regionLayout: { ...graph, regions: [...graph.regions, { name: "mid", appetite: "free" }] },
      })
      expect(reasonsOf(config)).toEqual([{ type: "regionNameRepeated", name: "mid" }])
    })

    it("a connection naming no region", () => {
      const config = plain({ regionLayout: layout({ connections: [...layout().connections, ["mid", "attic"]] }) })
      expect(reasonsOf(config)).toEqual([{ type: "connectionNamesNoRegion", name: "attic" }])
    })

    it("a port naming no region", () => {
      expect(reasonsOf(plain({ regionLayout: layout({ out: "attic" }) }))).toEqual([
        { type: "portNamesNoRegion", port: "out", name: "attic" },
      ])
    })

    it("a placement that is no share of the path", () => {
      expect(reasonsOf(plain({ regionLayout: layout({ placement: { enters: 1.5 } }) }))).toEqual([
        { type: "placementOutOfRange", enters: 1.5 },
      ])
    })

    it("a region nothing reaches", () => {
      const graph = layout()
      const config = plain({
        regionLayout: { ...graph, regions: [...graph.regions, { name: "attic", appetite: "free" }] },
      })
      expect(reasonsOf(config)).toEqual([{ type: "regionUnreachable", name: "attic" }])
    })

    it("a gate no control opens", () => {
      const config = plain({
        regionLayout: layout(),
        obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["hall", "mid"] } }],
      })
      expect(reasonsOf(config)).toEqual([{ type: "obstacleUnowned", id: "bars" }])
    })

    it("a one-way naming a section the floor does not have", () => {
      expect(reasonsOf(plain({ oneWays: [{ from: "main", to: "s3" }] }))).toEqual([
        { type: "oneWayUnsatisfied", from: "main", to: "s3" },
      ])
    })

    it("a one-way bound to no realisation", () => {
      const config = plain({
        regionLayout: layout(),
        obstacles: [{ id: "chute", kind: "oneWay", at: { on: "connection", between: ["side", "vault"] } }],
      })
      expect(reasonsOf(config, { resolveOneWay: () => undefined })).toEqual([
        { type: "oneWayRealisationRefused", from: "side", to: "vault", realisation: null, why: "unbound" },
      ])
    })

    it("a region barrier bound to no realisation", () => {
      const config = plain({
        regionLayout: layout(),
        obstacles: [{ id: "flood", kind: "gate", at: { on: "region", region: "mid" } }],
        controls: [
          {
            id: "lever",
            in: "hall",
            states: ["shut", "open"],
            initial: "shut",
            returnsToInitial: false,
            opens: { shut: [], open: ["flood"] },
          },
        ],
      })
      expect(reasonsOf(config)).toEqual([
        { type: "regionBarrierRealisationRefused", id: "flood", region: "mid", realisation: null, why: "unbound" },
      ])
    })

    it("a handle standing in a section the floor does not have", () => {
      const config = plain({ sideSections: [section()], handles: [{ in: "nowhere", left: ["s0"], right: [] }] })
      expect(reasonsOf(config)).toEqual([{ type: "handleUnsatisfied", handle: 0, address: "nowhere" }])
    })

    it("a gate asking for the floor key of a section with no floor-key gate", () => {
      const config = plain({
        regionLayout: layout(),
        sideSections: [section()],
        obstacles: [
          { id: "bars", kind: "gate", at: { on: "connection", between: ["hall", "mid"] }, floorKeys: ["s0"] },
        ],
        controls: [
          {
            id: "lever",
            in: "hall",
            states: ["shut", "open"],
            initial: "shut",
            returnsToInitial: false,
            opens: { shut: [], open: ["bars"] },
          },
        ],
      })
      expect(reasonsOf(config)).toEqual([{ type: "gateKeyNamesNoFloorKey", id: "bars", section: "s0" }])
    })

    it("a fork in a region the layout does not have", () => {
      expect(reasonsOf(plain({ regionLayout: layout(), forks: [{ in: "attic" }] }))).toEqual([
        { type: "forkRegionRefused", region: "attic", cause: "notInLayout" },
      ])
    })

    it("a switch whose family cannot be walked back into", () => {
      const config = plain({ forks: [{ exits: 2, count: 1 }], switches: { encounter: "sumplete", min: 1, max: 1 } })
      expect(reasonsOf(config)).toEqual([{ type: "switchFamilyNotReEnterable", family: "sumplete" }])
    })

    it("more switches than its forks reserve junctions", () => {
      const config = plain({ forks: [{ exits: 2, count: 1 }], switches: { encounter: "sumplete", min: 2, max: 2 } })
      expect(reasonsOf(config, { resolveEncounter: reEnterable })).toEqual([
        { type: "switchesExceedForks", min: 2, forks: 1 },
      ])
    })

    it("more marked mechanics than there are glyphs", () => {
      const config = plain({ forks: [{ exits: 2, count: 13 }], switches: { encounter: "sumplete", min: 13, max: 13 } })
      expect(reasonsOf(config, { resolveEncounter: reEnterable })).toEqual([
        { type: "marksExhausted", ids: ["switch:12"] },
      ])
    })

    it("a floor-key gate with nowhere free to put its key", () => {
      const config = plain({ sideSections: [section({ gate: { type: "floor-key" }, hidden: true })] })
      expect(reasonsOf(config)).toEqual([{ type: "noUngatedSectionForKey" }])
    })

    it("a sub-section floor-key gate with nowhere free to put its key, before any carve", () => {
      const config = plain({
        sideSections: [section({ sideSections: [section({ gate: { type: "floor-key" }, hidden: true })] })],
      })
      expect(reasonsOf(config)).toEqual([{ type: "noUngatedSectionForKey" }])
    })

    it("a side section gated at the mouth its chain already has a gate on", () => {
      const config = plain({
        regionLayout: layout(),
        sideSections: [section({ gate: { type: "floor-key" } })],
        obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["hall", "side"] } }],
        controls: [
          {
            id: "lever",
            in: "hall",
            states: ["shut", "open"],
            initial: "shut",
            returnsToInitial: false,
            opens: { shut: [], open: ["bars"] },
          },
        ],
      })
      expect(reasonsOf(config)).toEqual([
        { type: "chainGateCollidesWithSectionGate", address: "s0", obstacleId: "bars" },
      ])
    })
  })

  describe("a floor it accepts", () => {
    const prepOf = (config: FloorConfig) => {
      const result = prepareFloor("site", config, 7)
      if (!result.ok) throw new Error(JSON.stringify(result.reasons))
      return result.prep
    }

    it("is frozen, group by group, so no attempt changes what the config decided", () => {
      const prep = prepOf(plain())
      expect(Object.isFrozen(prep)).toBe(true)
      expect(Object.values(prep).every(group => Object.isFrozen(group))).toBe(true)
    })

    it("carves at the told seed over the address seed", () => {
      expect(prepOf(plain()).input.seed).toBe(7)
      expect(prepOf(plain({ seed: 99 })).input.seed).toBe(99)
    })

    it("hands the passes a config with every handle's gate on it", () => {
      const prep = prepOf(
        plain({ sideSections: [section(), section()], handles: [{ in: "s0", left: ["s1"], right: [] }] })
      )
      expect(prep.config.config.sideSections[1].gate).toEqual({
        type: "floor-key",
        keyId: "handle:site#0#0#0:s1",
      })
      expect(prep.config.authored.sideSections[1].gate).toBeUndefined()
    })

    it("grows a key host for a sub-section level that owes one", () => {
      const prep = prepOf(
        plain({ sideSections: [section({ sideSections: [section({ gate: { type: "floor-key" } })] })] })
      )
      expect(prep.sections.subSectionsOf.get(0)).toEqual({
        sections: [
          section({ gate: { type: "floor-key" } }),
          { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        ],
        gatedIdxs: [0],
        ungatedIdxs: [1],
      })
    })
  })
})

describe("a lock floor's side sections", () => {
  // A made-up floor standing the lever lock, prepared the way assembleFloor prepares it.
  const lockFloor = (more: Partial<FloorConfig> = {}, planned: (plan: LockPlan) => LockPlan = plan => plan) => {
    const expanded = expandFloorLocks(
      plain({ difficulty: "expert", realisations: BINDING, locks: [{ lock: leverLock() }], ...more })
    )
    if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
    const result = prepareFloor("site", expanded.config, 7, {}, planned(planLockFloor(expanded)!))
    if (!result.ok) throw new Error(JSON.stringify(result.reasons))
    return result.prep.sections
  }
  // The plan's corridors with both ends in the lock: the only ones a side path may stand on.
  const insideCorridors = (plan: LockPlan) => {
    const owned = new Set(plan.regions.flatMap(region => (region.owner === undefined ? [] : [region.id])))
    return plan.corridors.filter(corridor => owned.has(corridor.from) && owned.has(corridor.to))
  }
  const assigned = (sections: ReturnType<typeof lockFloor>) =>
    sections.absorbedDemands.flatMap(({ section, corridor }) => (corridor === undefined ? [] : [section]))

  it("an open side section on a lock floor is assigned a corridor", () => {
    const sections = lockFloor({ sideSections: [section({ pathPuzzles: 1 })] })
    expect(sections.corridorAssignments).toEqual([{ section: 0, corridor: expect.any(String) }])
    expect(sections.absorbedDemands).toEqual([
      { section: 0, kinds: ["puzzle", "reward"], corridor: sections.corridorAssignments[0].corridor },
    ])
    expect(sections.branchSections).toEqual([])
  })

  it("a sealed side section is assigned a corridor", () => {
    const sections = lockFloor({ sideSections: [section(), section({ sealed: true })] })
    expect(assigned(sections)).toEqual([0, 1])
    expect(sections.branchSections).toEqual([])
  })

  it("a gated, a hidden, a keyed, a nested, a lever-holding, a one-way-named and a stair-ended section are never assigned", () => {
    const floors: { name: string; more: Partial<FloorConfig>; never: number }[] = [
      { name: "gated", more: { sideSections: [section({ gate: { type: "floor-key" } }), section()] }, never: 0 },
      { name: "hidden", more: { sideSections: [section({ hidden: true })] }, never: 0 },
      { name: "keyed", more: { sideSections: [section(), section({ gate: { type: "floor-key" } })] }, never: 0 },
      { name: "nested", more: { sideSections: [section({ sideSections: [section()] })] }, never: 0 },
      {
        name: "lever-holding",
        more: { sideSections: [section(), section()], handles: [{ in: "s0", left: ["s1"], right: [] }] },
        never: 0,
      },
      {
        name: "one-way-named",
        more: { sideSections: [section(), section()], oneWays: [{ from: "s0", to: "s1" }] },
        never: 0,
      },
      { name: "stair-ended", more: { sideSections: [section({ end: "staircase" })] }, never: 0 },
    ]
    for (const { name, more, never } of floors) {
      // A plain section beside it, so a floor that assigns nothing at all cannot pass.
      const plainIdx = more.sideSections!.length
      const sections = lockFloor({ ...more, sideSections: [...more.sideSections!, section()] })
      expect(assigned(sections), name).toContain(plainIdx)
      expect(assigned(sections), name).not.toContain(never)
      expect(
        sections.corridorAssignments.map(({ section }) => section),
        name
      ).not.toContain(never)
    }
  })

  it("a section named in outsideLock hangs as a branch, open or sealed", () => {
    const sections = lockFloor({ sideSections: [section(), section({ sealed: true }), section()], outsideLock: [0, 1] })
    expect(assigned(sections)).toEqual([2])
    expect(sections.branchSections).toEqual([0, 1])
  })

  it("every authored side section is either a corridor demand or a branch: none is lost", () => {
    const four = [section({ pathPuzzles: 2 }), section({ sealed: true }), section(), section({ pathPuzzles: 1 })]
    const floors: { name: string; more: Partial<FloorConfig>; planned?: (plan: LockPlan) => LockPlan }[] = [
      { name: "no eligible corridor", more: { sideSections: four }, planned: plan => ({ ...plan, corridors: [] }) },
      {
        name: "one eligible corridor",
        more: { sideSections: four },
        planned: plan => ({ ...plan, corridors: insideCorridors(plan).slice(0, 1) }),
      },
      { name: "more corridors than sections", more: { sideSections: four.slice(0, 2) } },
      { name: "every section outside the lock", more: { sideSections: four, outsideLock: [0, 1, 2, 3] } },
    ]
    for (const { name, more, planned } of floors) {
      const sections = lockFloor(more, planned)
      const authored = more.sideSections!.map((_, i) => i)
      const placed = [...assigned(sections), ...sections.branchSections].sort((a, b) => a - b)
      expect(placed, name).toEqual(authored)
    }
    expect(assigned(lockFloor({ sideSections: four }, plan => ({ ...plan, corridors: [] })))).toEqual([])
    expect(
      new Set(
        lockFloor({ sideSections: four }, plan => ({
          ...plan,
          corridors: insideCorridors(plan).slice(0, 1),
        })).corridorAssignments.map(({ corridor }) => corridor)
      ).size
    ).toBe(1)
  })
})

describe("carved through assembleFloor", () => {
  it("auto-injects an ungated section when all sections are gated with floor-key", () => {
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(findRoom(result.grid, isGateRoom)).not.toBeNull()
      expect(findRoom(result.grid, c => c.reward?.type === "tombKey")).not.toBeNull()
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })

  // Asked before a wall is carved, because no seed can settle it: there are two junctions to fill and
  // one held for them.
  it("refuses a floor asking for more switches than its forks reserve junctions", () => {
    const result = assembleAt("site-switch-crowded", switchConfig({ encounter: "sumplete", min: 2, max: 2 }), 3)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([{ type: "switchesExceedForks", min: 2, forks: 1 }])
  })

  // A switch opens one way out and leaves the others shut. Keys accumulate, so spending the choice on a
  // side branch costs a walk back to the switch and a second choice — unless its room shut behind the
  // player, and then the main path onward is a door they can never open.
  //
  // Against the real registry, not the fallback stub: the fallback never claims `reEnterable` for
  // anyone, so it would refuse a switch whether or not this check still worked. Sumplete genuinely
  // has no `reEnterable` in its own FamilyMeta, so the real registry's refusal is the one this spec
  // names.
  it("refuses a switch whose room cannot be walked back into", () => {
    const result = assembleAt("site-switch-oneshot", switchConfig(ONE_SWITCH), 0, resolveEncounter)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "switchFamilyNotReEnterable", family: "sumplete" },
    ])
  })

  // A gate is owned by the control that opens it and has no interaction of its own, so one no control
  // opens can never be passed: a wall the player is shown as a door. Each gate in turn is left out of
  // every control's `opens`, and the floor is refused naming that gate.
  it("refuses every gate that no control opens, naming it", () => {
    const base = offRouteDoubleBackConfig()
    for (const orphan of base.obstacles!.map(o => o.id)) {
      const config: FloorConfig = {
        ...base,
        controls: (base.controls as StatefulControl[]).map(control => ({
          ...control,
          opens: Object.fromEntries(
            Object.entries(control.opens).map(([state, ids]) => [state, ids.filter(id => id !== orphan)])
          ),
        })),
      }
      const result = assembleFloor(`site-doubleback-orphan-${orphan}`, config, 42)

      expect(result.success).toBe(false)
      expect(result.success === false && result.reasons).toEqual([{ type: "obstacleUnowned", id: orphan }])
    }
  })

  // `forkRight` stands on the chain's own MOUTH (entrance → rightLower), which always resolves to
  // `cells[0]` (regionOfStep always seats the first-declared hosted region from the front) — the same
  // cell a floor-key/tomb-key gate always claims. Watched failing before this refusal existed: the
  // floor-key write silently overwrote `forkRight`'s room, and `forkRight`'s own control was left
  // opening a door no cell carried any more, with nothing said.
  it("refuses a side section that hosts a mouth-gated chain and also authors its own gate", () => {
    const config: FloorConfig = {
      ...offRouteDoubleBackConfig(),
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-doubleback-collision", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "chainGateCollidesWithSectionGate", address: "s0", obstacleId: "forkRight" },
    ])
  })
})
