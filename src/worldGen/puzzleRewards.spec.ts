import { describe, expect, it } from "vitest"
import { initPuzzleChains } from "./puzzleRewards"
import type { FloorConfig } from "./types"

const makeFloors = (pathPuzzles: number, sectionPuzzles: number[] = []): FloorConfig[] => [
  {
    pathPuzzles,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: sectionPuzzles.map(pp => ({
      pathPuzzles: pp,
      difficulty: "starter" as const,
      end: "treasure" as const,
    })),
  },
]

describe("initPuzzleChains", () => {
  it("creates an empty rewards array sized to each chain's puzzle count", () => {
    const floors = makeFloors(10, [2, 3])
    initPuzzleChains(floors)
    expect(floors[0].puzzleRewards).toHaveLength(10)
    expect(floors[0].sideSections[0].puzzleRewards).toHaveLength(2)
    expect(floors[0].sideSections[1].puzzleRewards).toHaveLength(3)
    expect(floors[0].puzzleRewards!.every(r => r === undefined)).toBe(true)
  })

  it("leaves a zero-puzzle main floor without an array", () => {
    const floors = makeFloors(0, [4])
    initPuzzleChains(floors)
    expect(floors[0].puzzleRewards).toBeUndefined()
    expect(floors[0].sideSections[0].puzzleRewards).toHaveLength(4)
  })

  it("excludes trapped sections — their puzzles are never rewardable", () => {
    const floors: FloorConfig[] = [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 5, difficulty: "starter", end: "treasure", encounter: "trap" }],
      },
    ]
    initPuzzleChains(floors)
    expect(floors[0].sideSections[0].puzzleRewards).toBeUndefined()
  })
})
