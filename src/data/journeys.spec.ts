import { describe, expect, it } from "vitest"
import { journeys, type PyramidJourney } from "./journeys"
import { mulberry32 } from "@/game/random"
import { generateJourneyLevel } from "@/game/generateJourneyLevel"
import { difficulties, type Difficulty } from "./difficultyLevels"

describe("Pyramid journeys", () => {
  it("generates playable levels", () => {
    const random = mulberry32(1234567)

    journeys.forEach(journey => {
      if (journey.type !== "pyramid") return
      expect(journey.levelCount).toBeGreaterThan(0)
      for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
        const level = generateJourneyLevel(journey, levelNr, random)
        expect(level).toBeDefined()
      }
    })
  })

  describe.each(difficulties)("%s", difficulty => {
    const diffJourneys = journeys.filter(
      (j): j is PyramidJourney => j.difficulty === difficulty && j.type === "pyramid"
    )

    const map: Record<Difficulty, Record<PyramidJourney["journeyLength"], [number, number]>> = {
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
      diffJourneys.forEach(journey => {
        const [min, max] = ranges[journey.journeyLength]
        expect(journey.rewards.completed.pieces, journey.id).toEqual([min, max])
      })
    })

    const longJourneysFor: Difficulty[] = ["junior", "expert", "master", "wizard"]

    const blockedBlocksFor: Difficulty[] = ["expert", "master", "wizard"]

    const numberRangeMax: Record<Difficulty, number> = {
      starter: 4,
      junior: 10,
      expert: 10,
      master: 12,
      wizard: 20,
    }

    const maxNumberFloors: Record<Difficulty, number> = {
      starter: 4,
      junior: 5,
      expert: 6,
      master: 7,
      wizard: 10,
    }

    it("respects a number max for difficulty if not multipleOf", () => {
      const max = numberRangeMax[difficulty]
      diffJourneys.forEach(journey => {
        if (journey.levelSettings.useMultiplesOf) return
        expect(journey.levelSettings.startNumberRange[1]).toBeLessThanOrEqual(max)
      })
    })

    it("respects the max amount of floors", () => {
      const max = maxNumberFloors[difficulty]
      diffJourneys.forEach(journey => {
        expect(journey.levelSettings.endFloorCount ?? journey.levelSettings.startFloorCount).toBeLessThanOrEqual(max)
      })
    })

    if (longJourneysFor.includes(difficulty)) {
      it("has 'long' journeys", () => {
        const longJourneyCount = diffJourneys.filter(j => j.journeyLength === "long").length
        expect(longJourneyCount).toBeGreaterThan(0)
      })
    } else {
      it("has no 'long' journeys", () => {
        const longJourneyCount = diffJourneys.filter(j => j.journeyLength === "long").length
        expect(longJourneyCount).toEqual(0)
      })
    }

    if (blockedBlocksFor.includes(difficulty)) {
      it("has blocked blocks", () => {
        const blockedJourneyCount = diffJourneys.filter(j => j.levelSettings.blocksBlocked).length
        expect(blockedJourneyCount).toBeGreaterThan(0)
      })
    } else {
      it("has no blocked blocks", () => {
        const blockedJourneyCount = diffJourneys.filter(j => j.levelSettings.blocksBlocked).length
        expect(blockedJourneyCount).toEqual(0)
      })
    }
  })
})
