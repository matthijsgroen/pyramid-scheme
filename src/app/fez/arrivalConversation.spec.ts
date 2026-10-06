import { describe, expect, it } from "vitest"
import { arrivalConversationId, spokenLines, JOURNEYS_WITH_ARRIVAL } from "./arrivalConversation"

const lines = (...keys: string[]) => {
  const written = new Set(keys)
  return spokenLines("arrival.starter_1", key => written.has(key))
}

describe(arrivalConversationId, () => {
  it("falls back to the shared intro for a journey with no beat of its own", () => {
    expect(arrivalConversationId("nothing_written_here")).toBe("pyramidIntro")
  })

  it("names the journey's own arrival once it is in the script", () => {
    for (const journeyId of JOURNEYS_WITH_ARRIVAL) expect(arrivalConversationId(journeyId)).toBe(`arrival.${journeyId}`)
  })
})

describe(spokenLines, () => {
  it("reads who speaks from the key, so a discovered beat still knows", () => {
    expect(lines("arrival.starter_1.1.fez", "arrival.starter_1.2.explorer")).toEqual([
      { speaker: "fez", key: "arrival.starter_1.1.fez" },
      { speaker: "explorer", key: "arrival.starter_1.2.explorer" },
    ])
  })

  it("lets the two of them alternate however the scene wants", () => {
    const spoken = lines(
      "arrival.starter_1.1.fez",
      "arrival.starter_1.2.explorer",
      "arrival.starter_1.3.fez",
      "arrival.starter_1.4.fez"
    ).map(line => line.speaker)

    expect(spoken).toEqual(["fez", "explorer", "fez", "fez"])
  })

  it("stops at the gap rather than skipping it, so a missing line is loud", () => {
    expect(lines("arrival.starter_1.1.fez", "arrival.starter_1.3.fez")).toHaveLength(1)
  })

  it("has nothing to say about a journey with no beat", () => {
    expect(spokenLines("arrival.expert_2", () => false)).toEqual([])
  })
})
