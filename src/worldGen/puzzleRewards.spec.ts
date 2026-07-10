import { describe, expect, it } from "vitest"
import { assignPuzzleRewards } from "./puzzleRewards"
import type { FloorConfig } from "./types"

const RATES = { bandage: 3, oil: 1, trapTool: 1 }

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

describe("assignPuzzleRewards", () => {
  it("is deterministic for the same journeyId and floor shape", () => {
    const a = makeFloors(20, [3, 4])
    const b = makeFloors(20, [3, 4])
    assignPuzzleRewards("journey-a", a, RATES)
    assignPuzzleRewards("journey-a", b, RATES)
    expect(a).toEqual(b)
  })

  it("produces a different split for a different journeyId", () => {
    const a = makeFloors(30, [4, 4])
    const b = makeFloors(30, [4, 4])
    assignPuzzleRewards("journey-a", a, RATES)
    assignPuzzleRewards("journey-b", b, RATES)
    expect(a).not.toEqual(b)
  })

  it("never assigns more rewards than total puzzle slots", () => {
    const floors = makeFloors(10, [2, 2])
    assignPuzzleRewards("journey-c", floors, RATES)
    const total =
      (floors[0].puzzleRewards?.length ?? 0) +
      floors[0].sideSections.reduce((s, sec) => s + (sec.puzzleRewards?.length ?? 0), 0)
    expect(total).toBe(14) // 10 + 2 + 2
    const rewarded = [
      ...(floors[0].puzzleRewards ?? []),
      ...floors[0].sideSections.flatMap(sec => sec.puzzleRewards ?? []),
    ].filter(Boolean)
    expect(rewarded.length).toBeLessThanOrEqual(total)
  })

  it("is stable when there are no side sections (empty sections array)", () => {
    const floors = makeFloors(5, [])
    expect(() => assignPuzzleRewards("journey-d", floors, RATES)).not.toThrow()
    expect(floors[0].puzzleRewards).toHaveLength(5)
  })

  it("excludes trapped sections — their puzzles never carry a reward", () => {
    const floors: FloorConfig[] = [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [{ pathPuzzles: 5, difficulty: "starter", end: "treasure", encounter: "trap" }],
      },
    ]
    assignPuzzleRewards("journey-e", floors, RATES)
    expect(floors[0].sideSections[0].puzzleRewards).toBeUndefined()
  })

  it("only assigns consumable or money rewards, never a collectible type", () => {
    const floors = makeFloors(50, [10, 10])
    assignPuzzleRewards("journey-f", floors, RATES)
    const rewarded = [
      ...(floors[0].puzzleRewards ?? []),
      ...floors[0].sideSections.flatMap(sec => sec.puzzleRewards ?? []),
    ].filter(Boolean)
    expect(rewarded.length).toBeGreaterThan(0)
    for (const r of rewarded) expect(["consumable", "money"]).toContain(r?.type)
  })
})
