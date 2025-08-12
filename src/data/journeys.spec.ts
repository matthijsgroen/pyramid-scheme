import { describe, expect, it } from "vitest"
import { journeys } from "./journeys"
import { mulberry32 } from "@/game/random"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"

describe("Testing journeys", () => {
  describe("Pyramid journeys", () => {
    it("should generate playable levels", () => {
      const random = mulberry32(1234567)

      journeys.forEach((journey) => {
        if (journey.type !== "pyramid") return
        expect(journey.levelCount).toBeGreaterThan(0)
        for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
          const level = generateJourneyLevel(journey, levelNr, random)
          expect(level).toBeDefined()
        }
      })
    })
  })
})
