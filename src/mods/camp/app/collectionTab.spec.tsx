// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import type { CampStepTable } from "@/mods/camp/game/campSteps"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { useCampTab } = await import("./collectionTab")

const table: CampStepTable = [
  { id: "hut", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
  { id: "well", spot: "water", tier: "junior", source: "structure", parts: ["stones", "rope"] },
]

const withSave = async (parts: Record<string, string[]>) =>
  writeGameData({ "pyramid-scheme-mod-camp": { version: 1, finds: [], parts, grown: [] } })

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("useCampTab", () => {
  it("is not shown and holds nothing with no structure started", async () => {
    const { result } = renderHook(() => useCampTab(table))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(false)
    expect(result.current.ids).toEqual([])
    expect(result.current.label).toBe("collection.title")
  })

  it("lists found parts as structure/part", async () => {
    await withSave({ hut: ["poles"], well: ["rope"] })
    const { result } = renderHook(() => useCampTab(table))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(true)
    expect(result.current.ids).toEqual(["hut/poles", "well/rope"])
  })

  it("leaves out a stored part the table does not know", async () => {
    await withSave({ hut: ["poles", "made-up-part"], "made-up-structure": ["x"] })
    const { result } = renderHook(() => useCampTab(table))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.ids).toEqual(["hut/poles"])
  })

  it("is not loaded before the camp save has been read", async () => {
    await withSave({ hut: ["poles"] })
    const { result } = renderHook(() => useCampTab(table))
    expect(result.current.loaded).toBe(false)
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })
})
