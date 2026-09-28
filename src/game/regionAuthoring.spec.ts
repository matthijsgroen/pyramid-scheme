import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig } from "./siteTypes"
import type { RegionAppetite } from "./regions"

const SEED = 99

const floorWith = (layout: FloorConfig["regionLayout"]): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  regionLayout: layout,
})

const region = (name: string, appetite: RegionAppetite = "free") => ({ name, appetite })

const reasons = (config: FloorConfig) => {
  const result = assembleFloor("test-journey", config, SEED)
  return result.success ? [] : result.reasons
}

describe("a layout the builder refuses by name", () => {
  it("refuses two regions answering to one name", () => {
    const layout = {
      regions: [region("mouth"), region("mouth")],
      connections: [["mouth", "mouth"] as const],
      in: "mouth",
      out: "mouth",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionNameRepeated", name: "mouth" }])
  })

  it("refuses every name repeated, not just the first, and once per offending name", () => {
    const layout = {
      regions: [region("mouth"), region("mouth"), region("vault"), region("vault")],
      connections: [],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "regionNameRepeated", name: "mouth" },
      { type: "regionNameRepeated", name: "vault" },
    ])
  })

  it("refuses a connection naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth"), region("vault")],
      connections: [["mouth", "ghost"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "connectionNamesNoRegion", name: "ghost" }])
  })

  it("refuses every undeclared name a connection ends on, deduplicated", () => {
    const layout = {
      regions: [region("mouth"), region("vault")],
      connections: [["mouth", "ghost1"] as const, ["vault", "ghost2"] as const, ["mouth", "ghost1"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "connectionNamesNoRegion", name: "ghost1" },
      { type: "connectionNamesNoRegion", name: "ghost2" },
    ])
  })

  it("refuses a port naming a region the layout never declares", () => {
    const layout = {
      regions: [region("mouth")],
      connections: [],
      in: "mouth",
      out: "nowhere",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "portNamesNoRegion", port: "out", name: "nowhere" }])
  })

  it("refuses both ports when both name a region the layout never declares, in first", () => {
    const layout = {
      regions: [region("mouth")],
      connections: [],
      in: "nowhereIn",
      out: "nowhereOut",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "portNamesNoRegion", port: "in", name: "nowhereIn" },
      { type: "portNamesNoRegion", port: "out", name: "nowhereOut" },
    ])
  })

  it("refuses a region no walk from the way in arrives at", () => {
    const layout = {
      regions: [region("mouth"), region("vault"), region("orphan")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([{ type: "regionUnreachable", name: "orphan" }])
  })

  it("refuses every region no walk from the way in arrives at, not just the first", () => {
    const layout = {
      regions: [region("mouth"), region("vault"), region("orphan1"), region("orphan2")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(reasons(floorWith(layout))).toEqual([
      { type: "regionUnreachable", name: "orphan1" },
      { type: "regionUnreachable", name: "orphan2" },
    ])
  })

  it("assembles a layout whose regions are all named once, joined and reachable", () => {
    const layout = {
      regions: [region("mouth", "nothing"), region("vault", "reward")],
      connections: [["mouth", "vault"] as const],
      in: "mouth",
      out: "vault",
    }

    expect(assembleFloor("test-journey", floorWith(layout), SEED).success).toBe(true)
  })

  it("assembles a floor that authors no layout at all", () => {
    expect(assembleFloor("test-journey", floorWith(undefined), SEED).success).toBe(true)
  })
})
