import { describe, expect, it } from "vitest"
import { PASSES, TAIL_READS } from "./passes"
import type { CarveState } from "./state"

// What the attempt loop itself hands every pass.
const GIVEN: (keyof CarveState)[] = ["attempt", "rung", "rand"]

describe("PASSES", () => {
  it("has every written key written by exactly one pass", () => {
    const writes = PASSES.flatMap(entry => entry.writes)
    expect(writes.filter((key, at) => writes.indexOf(key) !== at)).toEqual([])
    expect(writes.filter(key => GIVEN.includes(key))).toEqual([])
  })

  it("has every read written by an earlier pass or given by the loop", () => {
    const written = new Set<keyof CarveState>(GIVEN)
    const unwritten: string[] = []
    for (const { name, reads, writes } of PASSES) {
      for (const key of reads) if (!written.has(key)) unwritten.push(`${name} reads ${key}`)
      for (const key of writes) written.add(key)
    }
    expect(unwritten).toEqual([])
  })

  it("has every key the tail reads written by a pass", () => {
    const written = new Set(PASSES.flatMap(entry => entry.writes))
    expect(TAIL_READS.filter(key => !written.has(key))).toEqual([])
  })
})
