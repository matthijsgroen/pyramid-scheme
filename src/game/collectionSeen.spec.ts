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
  it("keeps each id once and keeps earlier ones across overlapping marks", () => {
    const save = markSeen(markSeen(emptyCollectionSeen(), "shells", ["a", "b"]), "shells", ["b", "c"])
    expect(save.seen.shells).toEqual(["a", "b", "c"])
    expect(hasRecord(save, "shells")).toBe(true)
  })
})

describe(seedSection, () => {
  it("changes nothing on a section that has a record", () => {
    const save = markSeen(emptyCollectionSeen(), "shells", ["a"])
    expect(seedSection(save, "shells", ["b"])).toBe(save)
  })

  it("creates the record on a section without one", () => {
    const save = seedSection(emptyCollectionSeen(), "shells", ["a", "b"])
    expect(hasRecord(save, "shells")).toBe(true)
    expect(save.seen.shells).toEqual(["a", "b"])
    expect(hasRecord(save, "stones")).toBe(false)
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
    expect(updateCollectionSeen(newer, save => markSeen(save, "shells", ["a"]))).toBe(newer)
  })

  it("applies the action to the empty save when nothing is stored", () => {
    expect(updateCollectionSeen(undefined, save => markSeen(save, "shells", ["a"]))).toEqual({
      version: 1,
      seen: { shells: ["a"] },
    })
  })
})
