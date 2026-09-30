import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/game/siteTypes"
import { difficulties, type Difficulty } from "./difficultyLevels"
import { generatedWorldConfigs } from "./generatedWorld"
import { journeys } from "./journeys"
import expected from "./tierFingerprints.json"
import { stableStringify, tierFingerprints } from "./tierFingerprints"

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

const cloneConfigs = (): Record<string, SiteConfig[]> => structuredClone(generatedWorldConfigs)

// Changes one site of one journey, in memory.
const touch = (configs: Record<string, SiteConfig[]>, journeyId: string): Record<string, SiteConfig[]> => {
  configs[journeyId][0] = [
    { ...configs[journeyId][0][0], pathPuzzles: configs[journeyId][0][0].pathPuzzles + 1 },
    ...configs[journeyId][0].slice(1),
  ]
  return configs
}

// Every object in the config that holds `key`, at every depth.
const holders = (value: unknown, key: string): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.flatMap(item => holders(item, key))
  if (value === null || typeof value !== "object") return []
  const own = value as Record<string, unknown>
  return [...(key in own ? [own] : []), ...Object.values(own).flatMap(v => holders(v, key))]
}

// Changes what one journey pays out at the end of its sections, in memory. Returns how many it
// changed, so a test can refuse to pass on a journey that held none.
const touchLoot = (configs: Record<string, SiteConfig[]>, journeyId: string): number => {
  const holding = holders(configs[journeyId], "endReward")
  for (const holder of holding) holder.endReward = { type: "money", amount: 987654 }
  return holding.length
}

describe("tier fingerprints", () => {
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

  describe("independence", () => {
    // The first shipped journey of each tier is changed in turn; every OTHER tier must hash as before.
    it.each(difficulties)("changing %s moves that tier and no other", tier => {
      const target = actual[tier].journeys[0]
      const after = tierFingerprints(shipped, touch(cloneConfigs(), target))
      for (const other of difficulties) {
        if (other === tier) expect(after[other].hash, `${other} must move`).not.toBe(actual[other].hash)
        else expect(after[other].hash, `${other} must not move when ${tier} changes`).toBe(actual[other].hash)
      }
    })

    it.each(difficulties)("changing only the loot of %s moves no other tier", tier => {
      const configs = cloneConfigs()
      expect(touchLoot(configs, actual[tier].journeys[0]), "the journey must hold loot to change").toBeGreaterThan(0)
      const after = tierFingerprints(shipped, configs)
      for (const other of difficulties) {
        if (other === tier) expect(after[other].hash, `${other} must move`).not.toBe(actual[other].hash)
        else
          expect(after[other].hash, `${other} must not move when the loot of ${tier} changes`).toBe(actual[other].hash)
      }
    })

    it.each(difficulties)("the failure for a change in %s names %s and no other tier as the one that moved", tier => {
      const after = tierFingerprints(shipped, touch(cloneConfigs(), actual[tier].journeys[0]))
      const message = explain(tier, after)
      expect(message).toContain(`Tier "${tier}" moved`)
      expect(message).toContain("deliberate")
      expect(moved(after)).toEqual([tier])
    })
  })

  describe("what is not authoring", () => {
    it("ignores object key order", () => {
      expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }))
    })

    it("ignores a field that is undefined", () => {
      expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }))
    })

    it("keeps array order", () => {
      expect(stableStringify(["a", "b"])).not.toBe(stableStringify(["b", "a"]))
    })

    it("ignores which family stands in a room, in every tier", () => {
      const configs = cloneConfigs()
      const records = shipped.flatMap(j => [
        ...holders(configs[j.id], "encounter"),
        ...holders(configs[j.id], "encountersByIndex"),
      ])
      expect(records.length).toBeGreaterThan(100)
      for (const holder of records) {
        if ("encounter" in holder) holder.encounter = "some-other-family"
        if ("encountersByIndex" in holder) holder.encountersByIndex = { 0: "some-other-family" }
      }
      expect(tierFingerprints(shipped, configs)).toEqual(actual)
    })

    it("ignores a stamped carve seed, in every tier", () => {
      const configs = cloneConfigs()
      for (const j of shipped) for (const site of configs[j.id]) for (const floor of site) floor.seed = 123456
      expect(tierFingerprints(shipped, configs)).toEqual(actual)
    })

    it("hashes the same whatever order the journeys are listed in", () => {
      expect(tierFingerprints([...shipped].reverse(), generatedWorldConfigs)).toEqual(actual)
    })

    it("hashes the same with the playtesting journey present and its config baked", () => {
      const devId = "dev_topology"
      const withDev = { ...generatedWorldConfigs, [devId]: generatedWorldConfigs[shipped[0].id] }
      const devJourney = { id: devId, difficulty: "wizard" as const, dev: true }
      expect(tierFingerprints([...shipped, devJourney], withDev)).toEqual(actual)
    })
  })

  describe("a tier that cannot be fingerprinted", () => {
    it.each(difficulties)("throws when %s has no journeys", tier => {
      const without = shipped.filter(j => j.difficulty !== tier)
      expect(() => tierFingerprints(without, generatedWorldConfigs)).toThrow(`Tier "${tier}" has no journeys`)
    })

    it("throws when a journey has no baked config", () => {
      const configs = cloneConfigs()
      delete configs[shipped[0].id]
      expect(() => tierFingerprints(shipped, configs)).toThrow(`Journey "${shipped[0].id}" has no baked config`)
    })
  })
})
