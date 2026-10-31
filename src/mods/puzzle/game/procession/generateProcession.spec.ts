import { describe, expect, it } from "vitest"
import { difficulties, difficultyCompare } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { gradeProcession } from "./generateProcession"
import type { ProcessionPuzzle } from "./procession"
import { doorVariant, PROCESSION_CONFIG, processionOptions } from "./processionConfig"
import { PROCESSION_META } from "./meta"

const chain = { ...PROCESSION_CONFIG.starter, minRung: "chain", maxRung: "chain", minSplits: 0, maxSplits: 0 } as const

const pinnedAt = (ticks: number[]): ProcessionPuzzle => ({
  ticks: 10,
  bars: ticks.map(() => ({ len: 2, start: 9 - 2 })),
  marks: ticks.map((tick, a) => ({ kind: "pin", a, tick })),
})

describe("a door's board", () => {
  it("is refused when two bars start together in the answer, and only when starts must differ", () => {
    const tied = pinnedAt([5, 5, 0])
    expect(gradeProcession(tied, chain)).not.toBeNull()
    expect(gradeProcession(tied, { ...chain, distinctStarts: true })).toBeNull()
    expect(gradeProcession(pinnedAt([5, 2, 0]), { ...chain, distinctStarts: true })).not.toBeNull()
  })

  it.each(difficulties)("a %s floor's door board is set by its steps alone", tier => {
    expect(processionOptions(tier, doorVariant(3))).toEqual({
      ...PROCESSION_CONFIG.starter,
      distinctStarts: true,
    })
    expect(processionOptions(tier, doorVariant(6))).toEqual({
      ...PROCESSION_CONFIG.wizard,
      distinctStarts: true,
    })
  })

  it.each(difficulties)("leaves the %s room's bucket where its seeds are listed", tier => {
    expect(configHash(processionOptions(tier))).toBe(configHash(PROCESSION_CONFIG[tier]))
  })

  // The world deals procession boards from its minTier up, so only those tiers have listed seeds.
  it.each(difficulties.filter(tier => difficultyCompare(tier, PROCESSION_META.minTier ?? "starter") >= 0))(
    "lists seeds for the %s room's bucket",
    tier => {
      expect(puzzleSeeds[configHash(processionOptions(tier))]?.length).toBeGreaterThan(0)
    }
  )
})
