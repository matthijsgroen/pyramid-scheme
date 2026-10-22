import { describe, it, expect } from "vitest"
import { validateWorldSpec } from "./validateWorldSpec"
import { rules, tomb } from "./dsl"

describe("validateWorldSpec", () => {
  it("current worldSpec has no errors", () => {
    expect(validateWorldSpec()).toEqual([])
  })

  it("refuses a tomb whose authored floors differ from its floorCount", () => {
    const spec = rules([tomb("t", { floors: [{}, {}] })])
    const errors = validateWorldSpec(spec, [{ id: "t", tier: "starter", floorCount: 3, levelCount: 1 }])
    expect(errors[0].message).toContain("floorCount is 3")
  })
})
