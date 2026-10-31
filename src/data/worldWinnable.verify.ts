import { describe, expect, it } from "vitest"
import { worldGateWalk } from "@/mods/worldGateWalk"
import { stuckPoints } from "@/worldGen/validate"
import { generatedWorldConfigs } from "./generatedWorld"

// The bake's last guard, run over the committed world: what ships is what the strict walk from empty hands was asked.
describe("the committed world", () => {
  it("lets the strict walk enter every journey, open every tier and pass every lock", () => {
    const { walk, journeyMeta } = worldGateWalk(generatedWorldConfigs)
    const stuck = stuckPoints(walk, journeyMeta)
    const entered = walk().enteredJourneys.size
    const header = `strict walk enters ${entered} of ${Object.keys(journeyMeta).length} journeys`
    expect(stuck, `${header}:\n  ${stuck.join("\n  ")}`).toEqual([])
  })
})
