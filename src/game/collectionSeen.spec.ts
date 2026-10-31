import { describe, expect, it } from "vitest"
import {
  emptyCollectionSeen,
  hasRecord,
  markSeen,
  newIds,
  readCollectionSeen,
  seedSection,
  updateCollectionSeen,
} from "./collectionSeen"

describe(newIds, () => {
  it("is empty for a section without a record", () => {
    expect(newIds(emptyCollectionSeen(), "shells", ["a", "b"])).toEqual([])
  })

  it("lists the unseen ids in the given order once the section is seeded", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", ["b"])
    expect(newIds(save, "shells", ["c", "b", "a"])).toEqual(["c", "a"])
  })
})

describe(markSeen, () => {
  it("adds ids to a seeded section, each once, keeping earlier ones", () => {
    const seeded = seedSection(emptyCollectionSeen(), "shells", ["a"])
    const save = markSeen(markSeen(seeded, "shells", ["a", "b"]), "shells", ["b", "c"])
    expect(save.seen.shells).toEqual(["a", "b", "c"])
  })

  it.each([
    ["no ids", []],
    ["some ids", ["a", "b"]],
  ])("leaves a section without a record alone when given %s", (_label, ids) => {
    const save = emptyCollectionSeen()
    expect(markSeen(save, "shells", ids)).toBe(save)
  })

  it("gives the same save back when every id is already seen", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", ["a"])
    expect(markSeen(save, "shells", ["a"])).toBe(save)
  })
})

describe(seedSection, () => {
  it("changes nothing on a section that has a record", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", ["a"])
    expect(seedSection(save, "shells", ["b"])).toBe(save)
  })

  it("creates the record on a section without one", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", ["a", "b"])
    expect(hasRecord(save, "shells")).toBe(true)
    expect(save.seen.shells).toEqual(["a", "b"])
    expect(hasRecord(save, "stones")).toBe(false)
  })

  it("creates an empty record for a section holding nothing, so what comes later is new", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", [])
    expect(hasRecord(save, "shells")).toBe(true)
    expect(newIds(save, "shells", ["a"])).toEqual(["a"])
  })
})

describe("a section id that names an inherited property", () => {
  const names = ["constructor", "__proto__", "toString"]

  it.each(names)("treats %s as a section without a record", section => {
    const save = emptyCollectionSeen()
    expect(hasRecord(save, section)).toBe(false)
    expect(newIds(save, section, ["a"])).toEqual([])
    expect(markSeen(save, section, ["a"])).toBe(save)
  })

  it.each(names)("seeds and marks %s as a record of its own", section => {
    const save = markSeen(seedSection(emptyCollectionSeen(), section, ["a"]), section, ["b"])
    expect(Object.hasOwn(save.seen, section)).toBe(true)
    expect(Object.getPrototypeOf(save.seen)).toBe(Object.prototype)
    expect(newIds(save, section, ["a", "b", "c"])).toEqual(["c"])
    expect(readCollectionSeen(save)).toBe(save)
  })
})

describe(readCollectionSeen, () => {
  it.each([
    ["nothing", undefined],
    ["a number", 7],
    ["an object without version", { seen: { shells: ["a"] } }],
    ["a later version", { version: 2, seen: { shells: ["a"] } }],
    ["a v1 save whose record holds a number", { version: 1, seen: { shells: ["a", 3] } }],
  ])("reads %s as the empty save", (_label, stored) => {
    expect(readCollectionSeen(stored)).toEqual(emptyCollectionSeen())
  })

  it("reads a v1 save back with the record of a section no one knows", () => {
    const stored = { version: 1, seen: { "gone-mod-section": ["x"] } }
    expect(readCollectionSeen(stored)).toEqual(stored)
  })
})

describe(updateCollectionSeen, () => {
  it("hands back a later version itself", () => {
    const newer = { version: 2, seen: {} }
    expect(updateCollectionSeen(newer, save => seedSection(save, "shells", ["a"]))).toBe(newer)
  })

  it("applies the action to the empty save when nothing is stored", () => {
    expect(updateCollectionSeen(undefined, save => seedSection(save, "shells", ["a"]))).toEqual({
      version: 1,
      seen: { shells: ["a"] },
    })
  })
})
