// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { useCampHomeTags } from "./homeTags"

const table: CampStepTable = [
  { id: "shell", spot: "shore", tier: "junior", source: "found" },
  { id: "tent", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "canvas"] },
  { id: "mule", spot: "pen", tier: "junior", source: "bought", purchase: "purchase:mule" },
]

const expectTags = async (save: unknown, expected: string[]) => {
  await writeGameData({ "pyramid-scheme-mod-camp": save })
  const { result } = renderHook(() => useCampHomeTags(table))
  await waitFor(() => expect(result.current).toEqual({ tags: expected, loaded: true }))
}

beforeEach(async () => {
  await clearGameData()
})

describe("the camp's home tags", () => {
  it("are none for an empty camp", async () => {
    await expectTags({ version: 1, finds: [], parts: {}, grown: [] }, [])
  })

  it("say nothing of a find in the save: a find is told by the homecoming that brings it", async () => {
    await expectTags({ version: 1, finds: ["shell"], parts: {}, grown: [] }, [])
  })

  it("say camp.structureDone once a structure has all its parts", async () => {
    await expectTags({ version: 1, finds: [], parts: { tent: ["poles", "canvas"] }, grown: [] }, ["camp.structureDone"])
  })

  it("say nothing of a structure still missing a part", async () => {
    await expectTags({ version: 1, finds: ["shell"], parts: { tent: ["poles"] }, grown: [] }, [])
  })

  it("say which purchase has arrived, and none that is only held", async () => {
    await expectTags({ version: 2, finds: [], parts: {}, grown: [], arrived: ["mule"] }, ["camp.arrived:purchase:mule"])
    await expectTags({ version: 2, finds: [], parts: {}, grown: [], arrived: [] }, [])
  })

  it("are none for a save this build cannot read", async () => {
    await expectTags({ version: 2, finds: ["shell"], parts: { tent: ["poles", "canvas"] }, grown: [] }, [])
  })
})

describe("before the camp's save is read", () => {
  it("says it has not loaded", () => {
    expect(renderHook(() => useCampHomeTags(table)).result.current.loaded).toBe(false)
  })
})
