// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
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

describe("the camp's homecoming", () => {
  it("grows one stage per homecoming, judged on the save as it stood", async () => {
    vi.resetModules()
    vi.doMock("@/mods/camp/game/campSteps", async importOriginal => ({
      ...(await importOriginal<typeof import("@/mods/camp/game/campSteps")>()),
      CAMP_STEPS: [
        { id: "seed", spot: "palmGarden", tier: "junior", source: "found" },
        { id: "sprout", spot: "palmGarden", tier: "junior", source: "grows", growsFrom: ["seed"] },
        { id: "palm", spot: "palmGarden", tier: "junior", source: "grows", growsFrom: ["sprout"] },
      ],
    }))
    await import("./index")
    const { useHomecoming } = await import("@/app/homecomingRegistry")
    const { useCampProgress: useCamp } = await import("./useCampProgress")
    await writeGameData({ "pyramid-scheme-mod-camp": { version: 1, finds: ["seed"], parts: {}, grown: [] } })
    const { result } = renderHook(() => ({ home: useHomecoming(), camp: useCamp() }))
    await act(async () => result.current.home())
    expect(result.current.camp.save.grown).toEqual(["sprout"])
    await act(async () => result.current.home())
    expect(result.current.camp.save.grown).toEqual(["sprout", "palm"])
    vi.doUnmock("@/mods/camp/game/campSteps")
  })
})
