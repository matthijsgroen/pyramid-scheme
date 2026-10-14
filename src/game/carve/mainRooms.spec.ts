import { describe, expect, it } from "vitest"
import { firstCarved, plainFloor, prepOf } from "./carveFixtures"
import { forkPositions, keyOf, routeStepOf } from "./derive"

describe("mainRooms", () => {
  const carvedWith = (exitOrStaircase: "exit" | "staircase") => {
    const prep = prepOf(
      plainFloor({
        pathPuzzles: 2,
        exitOrStaircase,
        sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      })
    )
    const state = firstCarved(prep)
    return {
      state,
      rooms: state.mainRooms!,
      at: (step: number) => state.mainRooms!.get(keyOf(state.maze!.mainPath[step])),
    }
  }

  it("opens on a portal, numbers the puzzles in path order, and ends on the goal chest", () => {
    const { state, at } = carvedWith("exit")
    const { placed, goal } = state.content!
    expect(at(0)).toEqual({ roomType: "portal" })
    expect(placed.slice(0, -1).map(step => at(step)?.pathIndex)).toEqual([0, 1])
    expect(at(goal)?.family).toBe("treasure-chest")
  })

  it("makes the exit a plain portal, or a stairhead where the floor goes down", () => {
    const exit = (exitOrStaircase: "exit" | "staircase") => {
      const { state, rooms } = carvedWith(exitOrStaircase)
      return rooms.get(keyOf(state.maze!.exit))
    }
    expect(exit("exit")).toEqual({ roomType: "portal" })
    expect(exit("staircase")?.stairId).toBeDefined()
  })

  it("makes every cell a branch hangs from a fork, unless a main-path room already stands there", () => {
    const { state, rooms } = carvedWith("exit")
    const stepOf = routeStepOf(state.maze!)
    const roomed = new Set([0, ...state.content!.placed])
    const junctions = [...forkPositions(state as Required<typeof state>)]
    expect(junctions.length).toBeGreaterThan(0)
    for (const key of junctions) expect(rooms.get(key)?.roomType === "fork").toBe(!roomed.has(stepOf.get(key) ?? -1))
  })
})
