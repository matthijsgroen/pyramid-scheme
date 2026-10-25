import { describe, expect, it } from "vitest"
import type { TreasureReward } from "@/game/siteTypes"
import {
  addToHaul,
  chapterToAnnounce,
  clearHaul,
  emptyHomeSave,
  markChapter,
  needsChapterRecord,
  readHomeSave,
  updateHomeSave,
} from "./homeSave"

const coins: TreasureReward = { type: "coins", amount: 3 }
const trinket: TreasureReward = { type: "trinket", name: "bead" }

describe("the haul", () => {
  it("keeps every reward added, in order, equal rewards included", () => {
    const save = addToHaul(addToHaul(addToHaul(emptyHomeSave(), coins), trinket), { ...coins })
    expect(save.haul).toEqual([coins, trinket, coins])
  })

  it("stores a copy, so the offered reward is not shared with the save", () => {
    const save = addToHaul(emptyHomeSave(), coins)
    expect(save.haul[0]).not.toBe(coins)
  })

  it("empties on clearHaul and keeps the chapter", () => {
    const save = clearHaul(addToHaul(markChapter(emptyHomeSave(), "junior"), coins))
    expect(save.haul).toEqual([])
    expect(save.chapter).toBe("junior")
  })
})

describe(chapterToAnnounce, () => {
  it("gives a later tier than the one recorded", () => {
    expect(chapterToAnnounce(markChapter(emptyHomeSave(), "starter"), "junior")).toBe("junior")
  })

  it("gives nothing for the same or an earlier tier", () => {
    const save = markChapter(emptyHomeSave(), "junior")
    expect(chapterToAnnounce(save, "junior")).toBeUndefined()
    expect(chapterToAnnounce(save, "starter")).toBeUndefined()
  })

  it("gives nothing without a record", () => {
    expect(chapterToAnnounce(emptyHomeSave(), "expert")).toBeUndefined()
  })
})

describe(needsChapterRecord, () => {
  it("is true only without a recorded chapter", () => {
    expect(needsChapterRecord(emptyHomeSave())).toBe(true)
    expect(needsChapterRecord(markChapter(emptyHomeSave(), "starter"))).toBe(false)
  })
})

describe(readHomeSave, () => {
  it.each([
    ["nothing", undefined],
    ["a number", 7],
    ["an object without version", { haul: [] }],
    ["version 2", { version: 2, haul: [coins] }],
    ["a chapter that is no tier", { version: 1, haul: [coins], chapter: "bogus" }],
  ])("reads %s as the empty save", (_, stored) => {
    expect(readHomeSave(stored)).toEqual(emptyHomeSave())
  })

  it("returns a version 1 save unchanged, rewards of unknown types included", () => {
    const stored = { version: 1, haul: [{ type: "never-heard-of-it", x: 1 }, coins], chapter: "expert" }
    expect(readHomeSave(stored)).toBe(stored)
  })
})

describe(updateHomeSave, () => {
  it("hands back a value it cannot read itself", () => {
    const newer = { version: 2, haul: [coins] }
    expect(updateHomeSave(newer, save => addToHaul(save, trinket))).toBe(newer)
  })

  it("applies the action to the empty save when nothing is stored", () => {
    expect(updateHomeSave(undefined, save => addToHaul(save, trinket))).toEqual({ version: 1, haul: [trinket] })
  })
})
