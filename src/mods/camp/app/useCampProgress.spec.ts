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
    await act(async () => result.current.comeHome(new Set()))
    expect(result.current.found.palmGarden).toEqual(["seedling", "sprig"])
  })

  it("stores version 2 and authoring ids only", async () => {
    const { result } = renderHook(() => useCampProgress(table))
    await act(async () => result.current.recordFind("seedling"))
    await act(async () => result.current.recordPart("hut", "poles"))
    await act(async () => result.current.comeHome(new Set()))
    expect(readModState("camp")).toEqual({
      version: 2,
      finds: ["seedling"],
      parts: { hut: ["poles"] },
      grown: ["sprig"],
      arrived: [],
    })
  })
})

describe("a save this build cannot read", () => {
  it("shows as the empty camp and survives a record untouched", async () => {
    const newer = { version: 3, finds: ["seedling"], parts: {}, grown: [], arrived: [] }
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

  it("brings a bought step home only on a homecoming, once its purchase is held", async () => {
    vi.resetModules()
    vi.doMock("@/mods/camp/game/campSteps", async importOriginal => ({
      ...(await importOriginal<typeof import("@/mods/camp/game/campSteps")>()),
      CAMP_STEPS: [
        { id: "seed", spot: "palmGarden", tier: "junior", source: "found" },
        { id: "sprout", spot: "palmGarden", tier: "junior", source: "grows", growsFrom: ["seed"] },
        { id: "mule", spot: "donkey", tier: "junior", source: "bought", purchase: "purchase:mule" },
        { id: "halter", spot: "donkey", tier: "junior", source: "bought", purchase: "purchase:mule" },
        { id: "flag", spot: "camel", tier: "junior", source: "bought", purchase: "purchase:flag" },
      ],
    }))
    const { registerHeldKeysProvider } = await import("@/app/SiteMap/keyProviders")
    let held: ReadonlySet<string> = new Set()
    registerHeldKeysProvider(() => held)
    await import("./index")
    const { useHomecoming } = await import("@/app/homecomingRegistry")
    const { useCampProgress: useCamp } = await import("./useCampProgress")
    const { readModState: readFreshModState } = await import("@/app/state/useModState")
    const { latestGameValue: latestFresh } = await import("@/support/useGameStorage")
    await writeGameData({ "pyramid-scheme-mod-camp": { version: 1, finds: ["seed"], parts: {}, grown: [] } })
    const { result, rerender } = renderHook(() => ({ home: useHomecoming(), camp: useCamp() }))
    await act(async () => {})
    held = new Set(["purchase:mule"])
    rerender()
    expect(result.current.camp.found.donkey).toBeUndefined()
    await act(async () => result.current.home())
    expect(result.current.camp.found.donkey).toEqual(["mule", "halter"])
    expect(result.current.camp.found.camel).toBeUndefined()
    expect(readFreshModState("camp")).toEqual({
      version: 2,
      finds: ["seed"],
      parts: {},
      grown: ["sprout"],
      arrived: ["mule", "halter"],
    })
    // The coming-home screen reads the haul: one arrival per purchase, and none on the homecoming after.
    expect(latestFresh("homecoming")).toEqual({
      version: 1,
      haul: [{ type: "campArrival", purchase: "purchase:mule" }],
    })
    await act(async () => result.current.home())
    expect(latestFresh("homecoming")).toEqual({
      version: 1,
      haul: [{ type: "campArrival", purchase: "purchase:mule" }],
    })
    vi.doUnmock("@/mods/camp/game/campSteps")
  })
})
