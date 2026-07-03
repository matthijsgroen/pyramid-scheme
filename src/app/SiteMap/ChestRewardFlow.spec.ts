import { describe, expect, it } from "vitest"
import { hieroglyphCategory } from "./hieroglyphCategory"

describe("hieroglyphCategory", () => {
  it("maps deities (d*) to the deities namespace", () => {
    expect(hieroglyphCategory("d1")).toBe("deities")
    expect(hieroglyphCategory("d10")).toBe("deities")
  })

  it("maps professions (p*) to the professions namespace", () => {
    expect(hieroglyphCategory("p1")).toBe("professions")
    expect(hieroglyphCategory("p12")).toBe("professions")
  })

  it("maps artifacts (art*) to the artifacts namespace — not animals", () => {
    expect(hieroglyphCategory("art1")).toBe("artifacts")
    expect(hieroglyphCategory("art10")).toBe("artifacts")
  })

  it("maps animals (a*) to the animals namespace", () => {
    expect(hieroglyphCategory("a1")).toBe("animals")
    expect(hieroglyphCategory("a15")).toBe("animals")
  })
})
