import { describe, expect, it } from "vitest"
import { defaultResolveEncounter } from "../encounterFallback"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig, SideSection } from "../siteTypes"
import type { PlacedContainer } from "../regions"
import { prepareFloor } from "./prepareFloor"

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
