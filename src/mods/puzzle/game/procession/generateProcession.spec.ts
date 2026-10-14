import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { gradeProcession } from "./generateProcession"
import type { ProcessionPuzzle } from "./procession"
import { doorVariant, PROCESSION_CONFIG, processionOptions } from "./processionConfig"

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

  it("is the tier's board sized by the steps, with distinct starts", () => {
    expect(processionOptions("master", doorVariant(3))).toEqual({
      ...PROCESSION_CONFIG.master,
      bars: 3,
      distinctStarts: true,
    })
  })

  it.each(difficulties)("leaves the %s room's bucket where its seeds are listed", tier => {
    expect(configHash(processionOptions(tier))).toBe(configHash(PROCESSION_CONFIG[tier]))
    expect(puzzleSeeds[configHash(processionOptions(tier))]?.length).toBeGreaterThan(0)
  })
})
