// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { useCampHomeTags } from "./homeTags"

const table: CampStepTable = [
  { id: "shell", spot: "shore", tier: "junior", source: "found" },
  { id: "tent", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "canvas"] },
]

const expectTags = async (save: unknown, expected: string[]) => {
  await writeGameData({ "pyramid-scheme-mod-camp": save })
  const { result } = renderHook(() => useCampHomeTags(table))
  await waitFor(() => expect(result.current).toEqual(expected))
}

beforeEach(async () => {
  await clearGameData()
})

describe("the camp's home tags", () => {
  it("are none for an empty camp", async () => {
    await expectTags({ version: 1, finds: [], parts: {}, grown: [] }, [])
  })

  it("say camp.found once the save holds a find", async () => {
    await expectTags({ version: 1, finds: ["shell"], parts: {}, grown: [] }, ["camp.found"])
  })

  it("say camp.structureDone once a structure has all its parts", async () => {
    await expectTags({ version: 1, finds: [], parts: { tent: ["poles", "canvas"] }, grown: [] }, ["camp.structureDone"])
  })

  it("say nothing of a structure still missing a part", async () => {
    await expectTags({ version: 1, finds: ["shell"], parts: { tent: ["poles"] }, grown: [] }, ["camp.found"])
  })

  it("are none for a save this build cannot read", async () => {
    await expectTags({ version: 2, finds: ["shell"], parts: { tent: ["poles", "canvas"] }, grown: [] }, [])
  })
})
