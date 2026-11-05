import { describe, expect, it } from "vitest"
import { ratchet } from "./carveSlack"

describe("the carve slack ratchet", () => {
  it("fails a floor passing at fewer seeds than recorded and keeps its record", () => {
    expect(ratchet({ a: 30, b: 10 }, { a: 29, b: 10 }, false)).toEqual({ lost: ["a"], next: { a: 30, b: 10 } })
  })

  it("writes down a floor that gained slack and a floor not yet recorded", () => {
    expect(ratchet({ a: 30 }, { a: 35, c: 4 }, false)).toEqual({ lost: [], next: { a: 35, c: 4 } })
  })

  it("writes every count as measured when updating", () => {
    expect(ratchet({ a: 30 }, { a: 20 }, true)).toEqual({ lost: ["a"], next: { a: 20 } })
  })
})
