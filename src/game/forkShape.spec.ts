import { describe, expect, it } from "vitest"
import { classifyForkShape } from "./forkShape"
import { assembleFloor, defaultResolveEncounter } from "./siteAssembler"
import type { ResolveEncounter } from "./siteAssembler"
import type { Direction, FloorConfig, RoomCell } from "./siteTypes"

// A switch needs a family that offers the walk back (FamilyMeta.reEnterable), and this spec assembles
// without the registry, so the stub grants it.
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const switchFloor: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
  ],
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "sumplete", min: 1, max: 1 },
}

// The layouts REAL CARVES produce, keyed by their directions in compass order: a hand-written direction
// set could name a fork the assembler cannot build, and then nothing below would be about the game.
// Every case in this file is sampled from here.
const carvedLayouts = (): Map<string, Direction[]> => {
  const byLayout = new Map<string, Direction[]>()
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(`fork-shape-${seed}`, switchFloor, seed, reEnterableFamilies)
    if (!result.success) continue
    const forks = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && c.roomType === "fork")
    for (const fork of forks) {
      const gated = (fork.exits ?? []).filter(exit => exit.gateKeyId !== undefined).map(exit => exit.dir)
      if (gated.length === 0) continue
      byLayout.set([...gated].sort().join(""), gated)
    }
  }
  return byLayout
}

const LAYOUTS = carvedLayouts()

// A layout this file asks for and the carve never made is the failure — never a case that quietly
// tests nothing.
const carved = (layout: string): Direction[] => {
  const dirs = LAYOUTS.get(layout)
  if (!dirs) throw new Error(`no carved switch fork closed exactly the ways out "${layout}"`)
  return dirs
}

describe("the fork layouts the assembler carves", () => {
  it("closes every pair of ways out, and never all four", () => {
    const pairs = [...LAYOUTS.keys()].filter(layout => layout.length === 2)
    expect(pairs.sort()).toEqual(["en", "es", "ew", "ns", "nw", "sw"])
    expect([...LAYOUTS.keys()].filter(layout => layout.length > 3)).toEqual([])
  })

  it("closes three ways out as well as two", () => {
    expect([...LAYOUTS.keys()].filter(layout => layout.length === 3).length).toBeGreaterThan(0)
  })
})

describe("classifyForkShape", () => {
  it("calls two ways out at right angles adjacent", () => {
    expect(classifyForkShape(carved("en"))).toBe("adjacent")
    expect(classifyForkShape(carved("es"))).toBe("adjacent")
    expect(classifyForkShape(carved("nw"))).toBe("adjacent")
    expect(classifyForkShape(carved("sw"))).toBe("adjacent")
  })

  it("calls two ways out facing each other opposite", () => {
    expect(classifyForkShape(carved("ns"))).toBe("opposite")
    expect(classifyForkShape(carved("ew"))).toBe("opposite")
  })

  it("calls three ways out three, whichever three they are", () => {
    const triples = [...LAYOUTS.entries()].filter(([layout]) => layout.length === 3)
    expect(triples.length).toBeGreaterThan(0)
    for (const [, dirs] of triples) expect(classifyForkShape(dirs)).toBe("three")
  })

  it("reads one layout the same whichever order its ways out arrive in", () => {
    const dirs = carved("en")
    expect(classifyForkShape([...dirs].reverse())).toBe(classifyForkShape(dirs))
  })

  it("reads a repeated direction as the one way out it is", () => {
    expect(classifyForkShape(["n", "e", "n"])).toBe("adjacent")
  })

  // A junction is only held for a switch when it has at least two ways out free to close, so there is
  // nothing for a board to be laid out between.
  it("names no shape for fewer than two ways out", () => {
    expect(classifyForkShape([])).toBeUndefined()
    expect(classifyForkShape(["n"])).toBeUndefined()
  })

  // Hand-written because the carve never produces it, which is the claim the sweep above makes: no
  // four-way shape is named, so a family asking for one is told there is none.
  it("names no shape for four ways out", () => {
    expect(classifyForkShape(["n", "e", "s", "w"])).toBeUndefined()
  })
})
