import { describe, expect, it } from "vitest"
import { configHash } from "./configHash"

describe("configHash", () => {
  it("ignores the order options were written in", () => {
    expect(configHash({ size: 4, cap: "parity" })).toBe(configHash({ cap: "parity", size: 4 }))
  })

  it("reads an option left out the same as one written as undefined", () => {
    expect(configHash({ size: 4, maxValue: undefined })).toBe(configHash({ size: 4 }))
  })

  it("changes when any dial changes, which is what makes a stale list unreachable", () => {
    expect(configHash({ size: 4, cap: "parity" })).not.toBe(configHash({ size: 5, cap: "parity" }))
    expect(configHash({ size: 4, cap: "parity" })).not.toBe(configHash({ size: 4, cap: "onlyCombination" }))
  })

  it("distinguishes a nested dial from a top-level one of the same name", () => {
    expect(configHash({ trap: { size: 4 } })).not.toBe(configHash({ size: 4 }))
  })

  it("keeps array order, which carries meaning where key order does not", () => {
    expect(configHash({ requires: ["a", "b"] })).not.toBe(configHash({ requires: ["b", "a"] }))
  })
})
