// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { mergeContributions } from "@/app/SiteMap/rewardContributions"
import { emptyCampSave, type CampSave } from "@/mods/camp/game/campState"

const recordFind = vi.fn()
const recordPart = vi.fn()
let save: CampSave = emptyCampSave()
vi.mock("./useCampProgress", () => ({ useCampProgress: () => ({ save, recordFind, recordPart }) }))

const { useCampRewardContribution } = await import("./rewardContribution")
const useMerged = () => mergeContributions([useCampRewardContribution()])

const find = { type: "campFind", step: "seedling" }
const part = { type: "campPart", structure: "hut", part: "poles" }

describe("the camp rewards", () => {
  beforeEach(() => {
    recordFind.mockClear()
    recordPart.mockClear()
    save = emptyCampSave()
  })

  it("records a find and a part through the merged contributions", () => {
    const { result } = renderHook(useMerged)
    result.current.effects.campFind?.(find, { journeyId: "j" })
    result.current.effects.campPart?.(part, { journeyId: "j" })
    expect(recordFind).toHaveBeenCalledWith("seedling")
    expect(recordPart).toHaveBeenCalledWith("hut", "poles")
  })

  it("skips a find or part the save already has", () => {
    save = { ...emptyCampSave(), finds: ["seedling"], parts: { hut: ["poles"] } }
    const { result } = renderHook(useMerged)
    expect(result.current.skip(find)).toBe(true)
    expect(result.current.skip(part)).toBe(true)
    expect(result.current.skip({ type: "campPart", structure: "hut", part: "cloth" })).toBe(false)
  })

  it("does not skip a reward of another type", () => {
    save = { ...emptyCampSave(), finds: ["seedling"] }
    const { result } = renderHook(useMerged)
    expect(result.current.skip({ type: "waterskin" })).toBe(false)
  })
})
