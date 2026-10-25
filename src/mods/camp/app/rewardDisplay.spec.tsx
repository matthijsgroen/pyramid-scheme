// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { emptyCampSave } from "@/mods/camp/game/campState"
import { campFindDisplay, campPartDisplay } from "./rewardDisplay"

const table: CampStepTable = [
  { id: "seedling", spot: "palmGarden", tier: "junior", source: "found" },
  { id: "fig", spot: "palmGarden", tier: "junior", source: "found" },
  { id: "hut", spot: "sleeping", tier: "junior", source: "structure", parts: ["poles", "cloth"] },
]

// A test `t` that shows the key and the counts it was given.
const t = (key: string, opts?: Record<string, unknown>) =>
  key === "reward.progress" ? `${opts?.name} · ${opts?.found} of ${opts?.total}` : key

describe("campPartDisplay", () => {
  const reward = { type: "campPart", structure: "hut", part: "cloth" }

  it("counts the part being shown, not yet recorded, and shows the structure's name", () => {
    const save = { ...emptyCampSave(), parts: { hut: ["poles"] } }
    const display = campPartDisplay(reward, t, save, table)
    expect(display.itemEffectDescription).toBe("structures.hut · 2 of 2")
    expect(display.itemName).toContain("parts.hut.cloth")
  })

  it("counts a recorded part once", () => {
    const save = { ...emptyCampSave(), parts: { hut: ["poles", "cloth"] } }
    expect(campPartDisplay(reward, t, save, table).itemEffectDescription).toBe("structures.hut · 2 of 2")
  })

  it("shows a stand-in picture while no part icon exists", () => {
    const { container } = render(<>{campPartDisplay(reward, t, emptyCampSave(), table).ItemVisual}</>)
    expect(container.textContent).toBe("🧱")
  })
})

describe("campFindDisplay", () => {
  it("reads its spot's progress including the pick-up", () => {
    const save = { ...emptyCampSave(), finds: ["fig"] }
    const display = campFindDisplay({ type: "campFind", step: "seedling" }, t, save, table)
    expect(display.itemEffectDescription).toBe("spots.palmGarden · 2 of 2")
  })
})
