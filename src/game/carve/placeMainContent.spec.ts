import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, straightWalk, isPuzzleRoom } from "./carveFixtures"
import { placeMainContent } from "./placeMainContent"
import { assembleFloor } from "./assembleFloor"
import { validateSite } from "../siteValidator"
import type { FloorConfig, RoomCell } from "../siteTypes"
describe("placeMainContent", () => {
  const prep = prepOf(plainFloor({ pathPuzzles: 2 }))
  const onWalk = (steps: number, seams: number[] = []) => ({
    ...freshState(prep),
    lay: null,
    maze: straightWalk(steps),
    regions: { stepRegion: [], seams: new Set(seams) },
  })

  it("spreads the puzzles along the walk and puts the goal last, before the exit", () => {
    const state = onWalk(9)
    expect(placeMainContent(prep, state)).toBeUndefined()
    const { placed, goal, puzzleRole } = state.content!
    expect(goal).toBe(Math.max(...placed))
    expect(goal).toBeLessThan(8)
    expect([...puzzleRole.values()]).toEqual([0, 1])
  })

  it("moves content forward off a seam", () => {
    const bare = onWalk(9)
    placeMainContent(prep, bare)
    const [first] = bare.content!.placed
    const seamed = onWalk(9, [first])
    placeMainContent(prep, seamed)
    expect(seamed.content!.placed).not.toContain(first)
  })

  it("retries a walk too short for its content and a distinct exit", () => {
    expect(placeMainContent(prep, onWalk(4))).toEqual({ retry: [] })
  })
})

describe("carved through assembleFloor", () => {
  it("places exactly pathPuzzles puzzle rooms on the main path", () => {
    for (const pathPuzzles of [0, 1, 2, 3]) {
      const config: FloorConfig = {
        pathPuzzles,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
      }
      const result = assembleFloor("site-1", config, 42)
      expect(result.success, `pathPuzzles=${pathPuzzles} failed`).toBe(true)
      if (result.success) {
        const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c))
        expect(puzzles.length, `pathPuzzles=${pathPuzzles} wrong count`).toBe(pathPuzzles)
      }
    }
  })

  it("rewards: attaches config.rewards[k] onto the k-th main-path puzzle room, in order", () => {
    const config: FloorConfig = {
      pathPuzzles: 4,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [],
      rewards: [undefined, { type: "money", amount: 5 }, undefined, { type: "consumable", consumable: "oil" }],
    }
    const result = assembleFloor("site-1", config, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      const puzzles = result.grid.cells.flat().filter(c => c.type === "room" && isPuzzleRoom(c)) as RoomCell[]
      expect(puzzles).toHaveLength(4)
      const rewards = puzzles.map(p => p.reward?.type)
      expect(rewards).toContain("money")
      expect(rewards).toContain("consumable")
      expect(rewards.filter(r => r === undefined)).toHaveLength(2)
      expect(validateSite(result.grid)).toEqual({ valid: true })
    }
  })
})
