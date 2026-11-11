import { describe, expect, it } from "vitest"
import { READING_META } from "./meta"

describe("a reading room", () => {
  it("is walked back into once finished, so a wall left unfixed can be fixed with the sign later", () => {
    expect(READING_META.reEnterable).toBe(true)
  })
})
