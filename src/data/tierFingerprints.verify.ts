import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/game/siteTypes"
import { difficulties, type Difficulty } from "./difficultyLevels"
import { generatedWorldConfigs } from "./generatedWorld"
import { journeys } from "./journeys"
import expected from "./tierFingerprints.json"
import { tierFingerprints } from "./tierFingerprints"

const shipped = journeys.filter(j => !j.dev)

// Names the tier that moved, and every tier that did not, because the accident this guards against is
// authoring one tier and moving another.
const moved = (actual: Record<Difficulty, { hash: string }>): string[] =>
  difficulties.filter(tier => actual[tier].hash !== (expected as Record<string, { hash: string }>)[tier].hash)

const explain = (tier: Difficulty, actual: Record<Difficulty, { hash: string }>): string =>
  `Tier "${tier}" moved: its authored world no longer hashes to src/data/tierFingerprints.json ` +
  `(${expected[tier].hash} -> ${actual[tier].hash}). Tiers are authored independently and the lower ones must stay ` +
  `stable while higher ones are re-authored. If you meant to change "${tier}", update its hash in that file as a deliberate act, not a formality ` +
  `(see docs/game-design/world-spec-stability.md, "Tier fingerprints"); if you were working on another tier, ` +
  `you just changed "${tier}" by accident. Tiers that moved in this run: ${moved(actual).join(", ")}.`

// Changes one site of one journey, in memory.
const touch = (configs: Record<string, SiteConfig[]>, journeyId: string): Record<string, SiteConfig[]> => {
  configs[journeyId][0] = [
    { ...configs[journeyId][0][0], pathPuzzles: configs[journeyId][0][0].pathPuzzles + 1 },
    ...configs[journeyId][0].slice(1),
  ]
  return configs
}

describe("tier fingerprints of the baked world", () => {
  const actual = tierFingerprints(shipped, generatedWorldConfigs)

  it.each(difficulties)("%s is unchanged", tier => {
    expect(actual[tier].hash, explain(tier, actual)).toBe(expected[tier].hash)
  })

  it.each(difficulties)("%s lists the journeys the checked-in count was taken over", tier => {
    expect(actual[tier].journeys.length, `${tier} journeys: ${actual[tier].journeys.join(", ")}`).toBe(
      expected[tier].journeyCount
    )
  })

  it("puts every shipped journey in exactly one tier", () => {
    const listed = difficulties.flatMap(tier => actual[tier].journeys).sort()
    expect(listed).toEqual(shipped.map(j => j.id).sort())
  })

  it("gives every tier its own hash", () => {
    const hashes = difficulties.map(tier => actual[tier].hash)
    expect(new Set(hashes).size).toBe(difficulties.length)
  })

  it.each(difficulties)("the failure for a change in %s names %s and no other tier as the one that moved", tier => {
    const after = tierFingerprints(shipped, touch(structuredClone(generatedWorldConfigs), actual[tier].journeys[0]))
    const message = explain(tier, after)
    expect(message).toContain(`Tier "${tier}" moved`)
    expect(message).toContain("deliberate")
    expect(moved(after)).toEqual([tier])
  })
})
