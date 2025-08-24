import { describe, expect, it } from "vitest"
import { journeys, type PyramidJourney } from "./journeys"
import { mulberry32 } from "@/game/random"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import { difficulties, type Difficulty } from "./difficultyLevels"

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
    describe("completion should reward the proper range of items", () => {
      describe.each(difficulties)("%s", (difficulty) => {
        const diffJourneys = journeys.filter(
          (j): j is PyramidJourney =>
            j.difficulty === difficulty && j.type === "pyramid"
        )

        const map: Record<
          Difficulty,
          Record<PyramidJourney["journeyLength"], [number, number]>
        > = {
          starter: {
            short: [1, 2],
            medium: [2, 2],
            long: [2, 3],
          },
          junior: {
            short: [2, 3],
            medium: [3, 3],
            long: [3, 4],
          },
          expert: {
            short: [3, 4],
            medium: [4, 4],
            long: [4, 5],
          },
          master: {
            short: [4, 5],
            medium: [5, 5],
            long: [5, 6],
          },
          wizard: {
            short: [5, 6],
            medium: [6, 6],
            long: [6, 7],
          },
        }

        it("rewards the proper range of items, related to journey length", () => {
          const ranges = map[difficulty]
          diffJourneys.forEach((journey) => {
            const [min, max] = ranges[journey.journeyLength]
            expect(journey.rewards.completed.pieces, journey.id).toEqual([
              min,
              max,
            ])
          })
        })
      })
    })
  })
})
