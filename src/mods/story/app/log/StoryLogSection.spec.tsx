// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

const scenes = vi.hoisted(() => ({ list: [] as { id: string; journeyId: string; parts: string[] }[] }))
vi.mock("@/mods/story/game/log/heardScenes", () => ({ heardScenes: () => scenes.list }))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { exists: () => false } }),
}))

const { StoryLogSection } = await import("./StoryLogSection")

beforeEach(async () => {
  scenes.list = []
  await clearGameData()
})
afterEach(cleanup)

describe("StoryLogSection", () => {
  it("shows the empty note for an empty log", async () => {
    await act(async () => void render(<StoryLogSection />))
    expect(screen.getByText("story.log.empty")).toBeTruthy()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("lists a played conversation by its journey", async () => {
    scenes.list = [{ id: "made-up-scene", journeyId: "made-up-journey", parts: ["made-up-part"] }]
    await writeGameData({ conversations: { "made-up-part": true } })
    await act(async () => void render(<StoryLogSection />))
    expect(screen.getByText("made-up-journey.name")).toBeTruthy()
    expect(screen.queryByText("story.log.empty")).toBeNull()
  })
})
