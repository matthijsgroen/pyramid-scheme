import { describe, expect, it } from "vitest"
import { authoredKindsFor } from "./authoredKinds"
import type { Difficulty } from "@/data/difficultyLevels"

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

// The PropSheet story renders whatever this returns, so a derivation that silently stops finding the
// pools — a renamed field, a nesting level the walk misses — shows up as an EMPTY sheet, which reads as
// "no art needed here" rather than as a bug. Nothing pins the exact contents on purpose: the world is
// regenerated, and a list to update on every regeneration is a list that gets updated wrong.
describe("what each rank is furnished with", () => {
  it("finds pools for every rank", () => {
    for (const tier of TIERS) {
      const { props, wallItems } = authoredKindsFor(tier)
      expect(props.length, `${tier} props`).toBeGreaterThan(5)
      expect(wallItems.length, `${tier} wall items`).toBeGreaterThan(0)
    }
  })

  it("narrows rather than listing the whole vocabulary", () => {
    // Every rank drawing every kind would mean the scan is picking up a catalogue instead of the pools.
    for (const tier of TIERS) expect(authoredKindsFor(tier).wallItems.length, `${tier}`).toBeLessThan(8)
  })
})
