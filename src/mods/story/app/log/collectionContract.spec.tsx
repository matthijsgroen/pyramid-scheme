// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { markedItemCounts } from "@/app/pages/collectionTabContract"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("@/mods/story/game/log/heardScenes", () => ({
  heardScenes: (played: Record<string, boolean>) =>
    ["scene-a", "scene-b", "scene-c"]
      .filter(id => played[id] === true)
      .map(id => ({ id, journeyId: "made-up-journey", parts: [] })),
}))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", exists: () => false } }),
}))

const { StoryLogSection } = await import("./StoryLogSection")
const { useStoryTab } = await import("./collectionTab")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("story tab and section", () => {
  it("marks exactly the scenes the tab lists", async () => {
    await writeGameData({ conversations: { "scene-a": true, "scene-c": true } })

    const counts = await markedItemCounts(useStoryTab, StoryLogSection)

    expect(counts.ids).toEqual(["scene-a", "scene-c"])
    expect(counts.allNew).toBe(2)
    expect(counts.eachNew).toEqual({ "scene-a": 1, "scene-c": 1 })
  })
})
