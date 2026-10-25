// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { readModState } from "@/app/state/useModState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { useCampProgress } from "./useCampProgress"

const table: CampStepTable = [
  { id: "seedling", spot: "palmGarden", tier: "junior", source: "found" },
  { id: "sprig", spot: "palmGarden", tier: "junior", source: "grows", growsFrom: ["seedling"] },
  { id: "hut", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
]

beforeEach(async () => {
  await clearGameData()
})

describe("useCampProgress", () => {
  it("shows a structure once every part is recorded", async () => {
    const { result } = renderHook(() => useCampProgress(table))
    await act(async () => result.current.recordPart("hut", "poles"))
    expect(result.current.found.sleeping).toBeUndefined()
    await act(async () => result.current.recordPart("hut", "cloth"))
    expect(result.current.found.sleeping).toEqual(["hut"])
  })

  it("grows the sprig on a homecoming after the seedling is found", async () => {
    const { result } = renderHook(() => useCampProgress(table))
    await act(async () => result.current.recordFind("seedling"))
    await act(async () => result.current.grow())
    expect(result.current.found.palmGarden).toEqual(["seedling", "sprig"])
  })

  it("stores version 1 and authoring ids only", async () => {
    const { result } = renderHook(() => useCampProgress(table))
    await act(async () => result.current.recordFind("seedling"))
    await act(async () => result.current.recordPart("hut", "poles"))
    await act(async () => result.current.grow())
    expect(readModState("camp")).toEqual({
      version: 1,
      finds: ["seedling"],
      parts: { hut: ["poles"] },
      grown: ["sprig"],
    })
  })
})

describe("a save this build cannot read", () => {
  it("shows as the empty camp and survives a record untouched", async () => {
    const newer = { version: 2, finds: ["seedling"], parts: {}, grown: [] }
    await writeGameData({ "pyramid-scheme-mod-camp": newer })
    const { result } = renderHook(() => useCampProgress(table))
    await act(async () => result.current.recordFind("seedling"))
    expect(result.current.found).toEqual({})
    expect(readModState("camp")).toEqual(newer)
  })
})
