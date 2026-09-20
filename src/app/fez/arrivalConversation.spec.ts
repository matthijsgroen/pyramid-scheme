import { describe, expect, it } from "vitest"
import { arrivalConversationId, arrivalLineKeys, JOURNEYS_WITH_ARRIVAL } from "./arrivalConversation"

describe(arrivalConversationId, () => {
  it("falls back to the shared intro for a journey with no beat of its own", () => {
    expect(arrivalConversationId("nothing_written_here")).toBe("pyramidIntro")
  })

  it("names the journey's own arrival once it is in the script", () => {
    for (const journeyId of JOURNEYS_WITH_ARRIVAL) expect(arrivalConversationId(journeyId)).toBe(`arrival.${journeyId}`)
  })
})

describe(arrivalLineKeys, () => {
  it("reads consecutive lines until one is missing", () => {
    const written = new Set(["arrival.starter_1.1", "arrival.starter_1.2", "arrival.starter_1.3"])

    expect(arrivalLineKeys("starter_1", key => written.has(key))).toEqual([...written])
  })

  it("stops at the gap rather than skipping it, so a missing line is loud", () => {
    const written = new Set(["arrival.starter_1.1", "arrival.starter_1.3"])

    expect(arrivalLineKeys("starter_1", key => written.has(key))).toEqual(["arrival.starter_1.1"])
  })

  it("has nothing to say about a journey with no beat", () => {
    expect(arrivalLineKeys("expert_2", () => false)).toEqual([])
  })
})
