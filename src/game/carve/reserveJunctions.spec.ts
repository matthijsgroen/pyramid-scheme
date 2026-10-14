import { describe, expect, it } from "vitest"
import type { FloorConfig } from "../siteTypes"
import { carveFloor } from "./carveFloor"
import { firstCarved, plainFloor, prepOf } from "./carveFixtures"
import { freeWaysOut, rooms } from "./derive"
import { PASSES, finishAttempt } from "./passes"

describe("reserveJunctions", () => {
  it("reserves a fork room with as many free ways out as the demand asks", () => {
    const state = firstCarved(
      prepOf(
        plainFloor({
          pathPuzzles: 2,
          sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
          forks: [{ exits: 2, count: 1 }],
        })
      )
    )
    const full = state as Required<typeof state>
    const { reserved, switchesPlaced } = state.forks!
    expect(reserved).toHaveLength(1)
    expect(rooms(full).get(reserved[0])?.roomType).toBe("fork")
    expect(freeWaysOut(full)(reserved[0]).length).toBeGreaterThanOrEqual(2)
    expect(switchesPlaced).toBe(0)
  })

  it("names the demand no junction answers, where the only branch is a ward's", () => {
    const config: FloorConfig = plainFloor({
      difficulty: "junior",
      sideSections: [
        { pathPuzzles: 0, difficulty: "junior", end: "treasure", gate: { type: "tomb-key", wardKeyId: "ward:k" } },
      ],
      forks: [{ exits: 2, count: 1 }],
    })
    const result = carveFloor(prepOf(config, 3), PASSES, finishAttempt)
    expect(result.success === false && result.reasons).toContainEqual({
      type: "forksUnsatisfied",
      exits: 2,
      count: 1,
      carved: 0,
    })
  })
})
