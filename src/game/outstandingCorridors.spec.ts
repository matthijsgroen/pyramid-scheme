import { describe, expect, it } from "vitest"
import { outstandingCorridorsByLevel } from "./outstandingCorridors"

describe("outstandingCorridorsByLevel", () => {
  it("counts the corridors seen and not found, per pyramid", () => {
    const counts = outstandingCorridorsByLevel(["1:a", "1:b", "2:c", "3:d"], ["1:a", "3:d"])
    expect([...counts]).toEqual([
      [1, 1],
      [2, 1],
    ])
  })
})
