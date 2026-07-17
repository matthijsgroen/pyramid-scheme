import { describe, expect, it } from "vitest"
import { rollConsumable } from "./consumableTypes"

describe("rollConsumable", () => {
  it("only ever returns bandage, oil, or trapTool", () => {
    const rates = { bandage: 3, oil: 1, trapTool: 1 }
    for (let i = 0; i < 20; i++) {
      expect(["bandage", "oil", "trapTool"]).toContain(rollConsumable(`seed:${i}`, rates))
    }
  })

  it("is deterministic for the same seed and rates", () => {
    const rates = { bandage: 3, oil: 1, trapTool: 1 }
    expect(rollConsumable("seed", rates)).toBe(rollConsumable("seed", rates))
  })

  it("a zero-weighted type is never rolled", () => {
    const rates = { bandage: 1, oil: 0, trapTool: 0 }
    for (let i = 0; i < 20; i++) {
      expect(rollConsumable(`seed:${i}`, rates)).toBe("bandage")
    }
  })
})
