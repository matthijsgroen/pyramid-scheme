import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, straightWalk } from "./carveFixtures"
import { placeMainContent } from "./placeMainContent"

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
