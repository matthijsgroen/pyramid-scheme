import { describe, it, expect } from "vitest"
import { validateWorldSpec } from "./validateWorldSpec"

describe("validateWorldSpec", () => {
  it("current worldSpec has no errors", () => {
    expect(validateWorldSpec()).toEqual([])
  })
})
