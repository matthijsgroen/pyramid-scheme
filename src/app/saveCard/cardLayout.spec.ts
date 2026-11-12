import { describe, expect, it } from "vitest"
import { cardLayout } from "./cardLayout"

describe("card layout", () => {
  it.each([1, 10, 40])("is never wider than tall, at version %i", version => {
    for (let n = 1; n <= 9; n++) {
      const { W, H } = cardLayout(n, version)
      expect(H, `${n} codes`).toBeGreaterThanOrEqual(W)
    }
  })

  it("stacks two codes on top of each other", () => {
    const { cells } = cardLayout(2, 10)
    expect(cells[0].x).toBe(cells[1].x)
    expect(cells[1].y).toBeGreaterThan(cells[0].y)
  })
})
