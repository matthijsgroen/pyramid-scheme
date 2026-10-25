// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Reaction } from "@/app/reactions/reactionContributions"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("@/mods/camp/game/campSteps", async importOriginal => ({
  ...(await importOriginal<typeof import("@/mods/camp/game/campSteps")>()),
  CAMP_STEPS: [
    { id: "seed", spot: "palmGarden", tier: "junior", source: "found" },
    { id: "tent", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "canvas"] },
  ],
}))

await import("./index")
const { HomeHooks } = await import("@/app/home/HomeShowing")
const { registerReactionContribution } = await import("@/app/reactions/reactionContributions")

const reported: Reaction[] = []
registerReactionContribution(() => reaction => reported.push(reaction))

beforeEach(async () => {
  reported.length = 0
  await clearGameData()
})

// A fresh mount starts from the default save; the showing must wait for the stored one.
describe("the home showing", () => {
  it("carries the tags of a find and a standing structure from the stored save", async () => {
    await writeGameData({
      "pyramid-scheme-mod-camp": { version: 1, finds: ["seed"], parts: { tent: ["poles", "canvas"] }, grown: [] },
    })
    render(<HomeHooks onReported={() => {}} />)

    await vi.waitFor(() => expect(reported.filter(r => r.kind === "homeShown")).toHaveLength(1))
    expect(reported.find(r => r.kind === "homeShown")).toMatchObject({ tags: ["camp.found", "camp.structureDone"] })
  })
})
