import { describe, expect, it } from "vitest"
import type { FloorConfig, SiteConfig } from "@/game/siteTypes"
import { difficulties, type Difficulty } from "./difficultyLevels"
import { stableStringify, tierFingerprints } from "./tierFingerprints"

// A world of two journeys per tier, each one site of two floors. Every floor and every side section
// carries a family record, a carve pin and loot, so every test below has something of each to change.
const floor = (tier: Difficulty, n: number): FloorConfig => ({
  pathPuzzles: n,
  difficulty: tier,
  end: "treasure",
  exitOrStaircase: "exit",
  encounter: "family-a",
  encountersByIndex: { 0: "family-a" },
  seed: n,
  packing: 1.5,
  sideSections: [
    {
      pathPuzzles: 1,
      difficulty: tier,
      end: "treasure",
      endReward: { type: "money", amount: n },
      encounter: "family-b",
      encountersByIndex: { 0: "family-b" },
    },
  ],
})

const shipped = difficulties.flatMap(tier => [1, 2].map(i => ({ id: `${tier}_${i}`, difficulty: tier })))
const FLOORS_PER_JOURNEY = 2

const world = (): Record<string, SiteConfig[]> =>
  Object.fromEntries(shipped.map((j, i) => [j.id, [[floor(j.difficulty, i), floor(j.difficulty, i + 100)]]]))

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
  const actual = tierFingerprints(shipped, world())

  describe("independence", () => {
    // The first journey of each tier is changed in turn; every OTHER tier must hash as before.
    it.each(difficulties)("changing %s moves that tier and no other", tier => {
      const target = actual[tier].journeys[0]
      const after = tierFingerprints(shipped, touch(world(), target))
      for (const other of difficulties) {
        if (other === tier) expect(after[other].hash, `${other} must move`).not.toBe(actual[other].hash)
        else expect(after[other].hash, `${other} must not move when ${tier} changes`).toBe(actual[other].hash)
      }
    })

    it.each(difficulties)("changing only the loot of %s moves no other tier", tier => {
      const configs = world()
      expect(touchLoot(configs, actual[tier].journeys[0]), "the journey must hold loot to change").toBeGreaterThan(0)
      const after = tierFingerprints(shipped, configs)
      for (const other of difficulties) {
        if (other === tier) expect(after[other].hash, `${other} must move`).not.toBe(actual[other].hash)
        else
          expect(after[other].hash, `${other} must not move when the loot of ${tier} changes`).toBe(actual[other].hash)
      }
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
      const configs = world()
      const records = shipped.flatMap(j => [
        ...holders(configs[j.id], "encounter"),
        ...holders(configs[j.id], "encountersByIndex"),
      ])
      // A floor and its side section each hold both records.
      expect(records).toHaveLength(shipped.length * FLOORS_PER_JOURNEY * 4)
      for (const holder of records) {
        if ("encounter" in holder) holder.encounter = "some-other-family"
        if ("encountersByIndex" in holder) holder.encountersByIndex = { 0: "some-other-family" }
      }
      expect(tierFingerprints(shipped, configs)).toEqual(actual)
    })

    it("ignores a stamped carve seed, in every tier", () => {
      const configs = world()
      for (const j of shipped) for (const site of configs[j.id]) for (const floor of site) floor.seed = 123456
      expect(tierFingerprints(shipped, configs)).toEqual(actual)
    })

    it("ignores a pinned packing, on every floor of every tier", () => {
      const configs = world()
      const floors = shipped.flatMap(j => configs[j.id].flat())
      expect(floors).toHaveLength(shipped.length * FLOORS_PER_JOURNEY)
      for (const floor of floors) floor.packing = 7.5
      expect(tierFingerprints(shipped, configs)).toEqual(actual)
    })

    it("hashes the same whatever order the journeys are listed in", () => {
      expect(tierFingerprints([...shipped].reverse(), world())).toEqual(actual)
    })

    it("hashes the same with the playtesting journey present and its config baked", () => {
      const devId = "dev_topology"
      const configs = world()
      const withDev = { ...configs, [devId]: configs[shipped[0].id] }
      const devJourney = { id: devId, difficulty: "wizard" as const, dev: true }
      expect(tierFingerprints([...shipped, devJourney], withDev)).toEqual(actual)
    })
  })

  describe("a tier that cannot be fingerprinted", () => {
    it.each(difficulties)("throws when %s has no journeys", tier => {
      const without = shipped.filter(j => j.difficulty !== tier)
      expect(() => tierFingerprints(without, world())).toThrow(`Tier "${tier}" has no journeys`)
    })

    it("throws when a journey has no baked config", () => {
      const configs = world()
      delete configs[shipped[0].id]
      expect(() => tierFingerprints(shipped, configs)).toThrow(`Journey "${shipped[0].id}" has no baked config`)
    })
  })
})
