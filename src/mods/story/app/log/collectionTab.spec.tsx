// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

const scenes = vi.hoisted(() => ({ all: [] as { id: string; journeyId: string; parts: string[] }[] }))
vi.mock("@/mods/story/game/log/heardScenes", () => ({
  heardScenes: (played: Record<string, boolean>) => scenes.all.filter(scene => played[scene.id] === true),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { useStoryTab } = await import("./collectionTab")

beforeEach(async () => {
  scenes.all = [
    { id: "scene-a", journeyId: "j", parts: [] },
    { id: "scene-b", journeyId: "j", parts: [] },
    { id: "scene-c", journeyId: "j", parts: [] },
  ]
  await clearGameData()
})
afterEach(cleanup)

describe("useStoryTab", () => {
  it("is not shown and holds nothing when no scene was heard", async () => {
    const { result } = renderHook(() => useStoryTab())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(false)
    expect(result.current.ids).toEqual([])
    expect(result.current.label).toBe("collection.tabs.stories")
  })

  it("is shown once a scene was heard, and marks none as news", async () => {
    await writeGameData({ conversations: { "scene-a": true, "scene-c": true } })
    const { result } = renderHook(() => useStoryTab())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.shown).toBe(true)
    expect(result.current.ids).toEqual([])
  })

  it("is not loaded before the conversations save has been read", async () => {
    await writeGameData({ conversations: { "scene-a": true } })
    const { result } = renderHook(() => useStoryTab())
    expect(result.current.loaded).toBe(false)
    await waitFor(() => expect(result.current.loaded).toBe(true))
  })
})
