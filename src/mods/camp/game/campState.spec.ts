import { describe, expect, it } from "vitest"
import type { CampStepTable } from "./campSteps"
import type { CampSave } from "./campState"
import {
  campFound,
  emptyCampSave,
  growCamp,
  inPlace,
  readCampSave,
  recordFind,
  recordPart,
  spotProgress,
  startedStructures,
  structureProgress,
  updateCampSave,
} from "./campState"

const table: CampStepTable = [
  { id: "cup", spot: "hearth", tier: "starter", source: "found" },
  { id: "rug", spot: "bed", tier: "junior", source: "found" },
  { id: "ring", spot: "hearth", tier: "starter", source: "structure", parts: ["stones", "sand"] },
  { id: "hut", spot: "bed", tier: "junior", source: "structure", parts: ["poles", "cloth", "pegs"] },
  { id: "lamp", spot: "hearth", tier: "starter", source: "fixed" },
  { id: "stool", spot: "hearth", tier: "junior", source: "bought" },
  { id: "pit", spot: "grove", tier: "junior", source: "found" },
  { id: "otherTree", spot: "grove", tier: "junior", source: "found" },
  { id: "shoot", spot: "grove", tier: "junior", source: "grows", growsFrom: ["pit"] },
  { id: "tree", spot: "grove", tier: "junior", source: "grows", growsFrom: ["shoot"] },
  { id: "fruit", spot: "grove", tier: "junior", source: "grows", growsFrom: ["tree", "otherTree"] },
  { id: "heron", spot: "grove", tier: "junior", source: "grows", growsFrom: ["rug", "cup"] },
]

const recordAll = (save: CampSave, structure: string, parts: string[]): CampSave =>
  parts.reduce((s, part) => recordPart(s, structure, part), save)

describe("finds", () => {
  it("is in place once recorded, in any order", () => {
    const a = recordFind(recordFind(emptyCampSave(), "cup"), "rug")
    const b = recordFind(recordFind(emptyCampSave(), "rug"), "cup")
    expect(inPlace(a, table)).toEqual(new Set(["cup", "rug", "lamp"]))
    expect(inPlace(b, table)).toEqual(inPlace(a, table))
  })

  it("changes nothing when recorded twice", () => {
    const once = recordFind(emptyCampSave(), "cup")
    expect(recordFind(once, "cup")).toBe(once)
  })
})

describe("structures", () => {
  it("is not in place with one part missing", () => {
    const save = recordAll(emptyCampSave(), "hut", ["poles", "pegs"])
    expect(inPlace(save, table).has("hut")).toBe(false)
  })

  it("is in place once the last part lands, whatever the order", () => {
    const a = recordAll(emptyCampSave(), "hut", ["poles", "cloth", "pegs"])
    const b = recordAll(emptyCampSave(), "hut", ["pegs", "poles", "cloth"])
    expect(inPlace(a, table).has("hut")).toBe(true)
    expect(inPlace(b, table).has("hut")).toBe(true)
  })

  it("changes nothing when a part is recorded twice", () => {
    const once = recordPart(emptyCampSave(), "hut", "poles")
    expect(recordPart(once, "hut", "poles")).toBe(once)
  })
})

describe("fixed and bought steps", () => {
  it("has a fixed step in place from the start", () => {
    expect(inPlace(emptyCampSave(), table).has("lamp")).toBe(true)
  })

  it("never has a bought step in place, even when its id is recorded", () => {
    expect(inPlace(recordFind(emptyCampSave(), "stool"), table).has("stool")).toBe(false)
  })
})

describe("growCamp", () => {
  it("grows nothing from an empty save", () => {
    const save = emptyCampSave()
    expect(growCamp(save, table)).toBe(save)
  })

  it("grows one stage per call: the shoot after the pit, the tree only on the next call", () => {
    const first = growCamp(recordFind(emptyCampSave(), "pit"), table)
    expect(first.grown).toEqual(["shoot"])
    const second = growCamp(first, table)
    expect(second.grown).toEqual(["shoot", "tree"])
  })

  it("grows the fruit only once both trees stand", () => {
    let save = growCamp(growCamp(recordFind(emptyCampSave(), "pit"), table), table)
    save = growCamp(save, table)
    expect(inPlace(save, table).has("fruit")).toBe(false)
    save = growCamp(recordFind(save, "otherTree"), table)
    expect(inPlace(save, table).has("fruit")).toBe(true)
  })

  it("grows a step waiting on two steps only when both are there", () => {
    const one = growCamp(recordFind(emptyCampSave(), "rug"), table)
    expect(one.grown).not.toContain("heron")
    const both = growCamp(recordFind(one, "cup"), table)
    expect(both.grown).toContain("heron")
  })

  it("never grows a step twice", () => {
    const grown = growCamp(recordFind(emptyCampSave(), "pit"), table)
    const again = growCamp(grown, table)
    expect(again.grown.filter(id => id === "shoot")).toHaveLength(1)
  })
})

describe("ids the table does not know", () => {
  it("keeps them in the save and never puts them in place", () => {
    const save: CampSave = {
      version: 1,
      finds: ["cup", "goneFind"],
      parts: { goneStructure: ["a"], hut: ["poles", "cloth", "pegs", "goneSail"] },
      grown: ["goneSprout"],
    }
    expect(inPlace(save, table)).toEqual(new Set(["cup", "hut", "lamp"]))
    expect(readCampSave(save)).toBe(save)
    expect(recordFind(save, "rug").finds).toContain("goneFind")
    const grown = growCamp(recordFind(save, "pit"), table)
    expect(grown.grown).toEqual(["goneSprout", "shoot"])
    expect(grown.parts.goneStructure).toEqual(["a"])
    const parted = recordPart(save, "ring", "sand")
    expect(parted.parts.goneStructure).toEqual(["a"])
    expect(parted.parts.hut).toContain("goneSail")
    expect(parted.finds).toContain("goneFind")
  })
})

describe("campFound", () => {
  it("groups what is in place by spot", () => {
    const save = recordAll(recordFind(emptyCampSave(), "rug"), "ring", ["stones", "sand"])
    expect(campFound(save, table)).toEqual({ hearth: ["ring", "lamp"], bed: ["rug"] })
  })
})

describe("progress", () => {
  it("lists only started structures, in table order", () => {
    const save = recordPart(recordPart(emptyCampSave(), "hut", "cloth"), "ring", "sand")
    expect(startedStructures(emptyCampSave(), table)).toEqual([])
    expect(startedStructures(save, table)).toEqual(["ring", "hut"])
  })

  it("counts a structure's recorded parts against all of them", () => {
    const save = recordPart(recordPart(emptyCampSave(), "hut", "pegs"), "hut", "poles")
    expect(structureProgress(save, table, "hut")).toEqual({
      found: ["poles", "pegs"],
      total: ["poles", "cloth", "pegs"],
    })
  })

  it("counts a spot over its finds and structures", () => {
    const save = recordAll(recordFind(emptyCampSave(), "cup"), "ring", ["stones"])
    expect(spotProgress(save, table, "hearth")).toEqual({ found: 1, total: 2 })
    expect(spotProgress(recordPart(save, "ring", "sand"), table, "hearth")).toEqual({ found: 2, total: 2 })
  })
})

describe("readCampSave", () => {
  it.each([
    ["nothing", undefined],
    ["a number", 3],
    ["an older shape", { found: ["cup"] }],
    ["a newer version", { version: 2, finds: [], parts: {}, grown: [] }],
  ])("gives the empty save for %s", (_name, stored) => {
    expect(readCampSave(stored)).toEqual(emptyCampSave())
  })

  it("gives a version 1 save back unchanged", () => {
    const save: CampSave = { version: 1, finds: ["cup"], parts: { hut: ["poles"] }, grown: ["shoot"] }
    expect(readCampSave(save)).toBe(save)
  })
})

describe("updateCampSave", () => {
  const record = (stored: unknown): unknown => updateCampSave(stored, save => recordFind(save, "cup"))

  it.each([
    ["nothing", undefined],
    ["null", null],
  ])("starts from the empty save when %s is stored", (_name, stored) => {
    expect(record(stored)).toEqual({ ...emptyCampSave(), finds: ["cup"] })
  })

  it("records into a version 1 save", () => {
    expect(record({ ...emptyCampSave(), finds: ["rug"] })).toEqual({ ...emptyCampSave(), finds: ["rug", "cup"] })
  })

  it.each([
    ["a newer version", { version: 2, finds: ["rug"], parts: {}, grown: [], extra: true }],
    ["a damaged version 1 save", { version: 1, finds: ["rug", 7], parts: {}, grown: [] }],
    ["an older shape", { found: ["rug"] }],
  ])("leaves %s untouched", (_name, stored) => {
    expect(record(stored)).toBe(stored)
  })
})
