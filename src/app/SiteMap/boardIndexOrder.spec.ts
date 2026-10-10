import { describe, expect, it } from "vitest"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "@/data/journeyStructure"
import { worldLevelSites } from "@/data/worldLevels"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"
import { buildBoardIndexes, chainsOf, journeysInDealOrder, switchAddress } from "@/game/seeds/boardIndex"
import { plainSwitchId } from "@/game/cellSlot"
import type { FloorConfig } from "@/game/siteTypes"
import { forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { configHash } from "@/game/seeds/configHash"

const tierById = new Map<string, Difficulty>(
  [...PYRAMID_STRUCTURES, ...TOMB_STRUCTURES].map(({ id, tier }) => [id, tier])
)
const tierOf = (id: string): Difficulty => {
  const tier = tierById.get(id)
  if (!tier) throw new Error(`no tier for ${id}`)
  return tier
}
const byId = new Map(ALL_FAMILY_META.map(family => [family.id, family]))

type Room = { journeyId: string; tier: Difficulty; bucket: string; ordinal: number; key: string }

const roomsOf = (world: typeof worldLevelSites): Room[] => {
  const indexes = buildBoardIndexes(world, ALL_FAMILY_META, resolveEncounter, tierOf)
  const rooms: Room[] = []
  for (const [journeyId, levels] of Object.entries(world))
    levels.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        for (const { section, address } of chainsOf(floor))
          for (let pathIndex = 0; pathIndex < section.pathPuzzles; pathIndex++) {
            const { familyId } = resolveEncounter(section.encountersByIndex?.[pathIndex] ?? section.encounter, "puzzle")
            const seedable = byId.get(familyId)?.seedable
            if (!seedable) continue
            const ordinal = indexes(journeyId, levelIndex, floorIndex, familyId, { section: address, pathIndex })
            if (ordinal === undefined)
              throw new Error(`no ordinal for ${journeyId} ${levelIndex} ${floorIndex} ${address}`)
            rooms.push({
              journeyId,
              tier: tierOf(journeyId),
              bucket: configHash(seedable.resolveOptions({ difficulty: section.difficulty })),
              ordinal,
              key: `${journeyId}|${levelIndex}|${floorIndex}|${address}|${pathIndex}`,
            })
          }
      })
    )
  return rooms
}

describe("buildBoardIndexes over the real world", () => {
  const rooms = roomsOf(worldLevelSites)

  it("has puzzle rooms in every tier", () => {
    for (const tier of difficulties) expect(rooms.filter(room => room.tier === tier).length).toBeGreaterThan(0)
  })

  it("never gives a higher tier an ordinal before a lower tier in the same bucket", () => {
    const violations: string[] = []
    const buckets = new Map<string, Room[]>()
    for (const room of rooms) buckets.set(room.bucket, [...(buckets.get(room.bucket) ?? []), room])
    for (const inBucket of buckets.values())
      for (const low of inBucket)
        for (const high of inBucket)
          if (difficultyCompare(low.tier, high.tier) < 0 && low.ordinal > high.ordinal)
            violations.push(
              `${low.key} (${low.tier}, ${low.ordinal}) after ${high.key} (${high.tier}, ${high.ordinal})`
            )
    expect(violations).toEqual([])
  })

  it("holds at every tier boundary, in a bucket that spans both sides", () => {
    const buckets = new Map<string, Room[]>()
    for (const room of rooms) buckets.set(room.bucket, [...(buckets.get(room.bucket) ?? []), room])
    difficulties.slice(0, -1).forEach((lowTier, i) => {
      const highTier = difficulties[i + 1]
      const spanning = [...buckets.values()].filter(
        inBucket => inBucket.some(room => room.tier === lowTier) && inBucket.some(room => room.tier === highTier)
      )
      expect(spanning.length, `${lowTier}/${highTier} share no bucket`).toBeGreaterThan(0)
      for (const inBucket of spanning) {
        const lowMax = Math.max(...inBucket.filter(room => room.tier === lowTier).map(room => room.ordinal))
        const highMin = Math.min(...inBucket.filter(room => room.tier === highTier).map(room => room.ordinal))
        expect(lowMax).toBeLessThan(highMin)
      }
    })
  })

  it("deals every room in a bucket a different ordinal", () => {
    const seen = new Set<string>()
    for (const room of rooms) {
      const slot = `${room.bucket}#${room.ordinal}`
      expect(seen.has(slot), `${room.key} repeats ${slot}`).toBe(false)
      seen.add(slot)
    }
  })

  it("deals identically whatever order the world's keys arrive in", () => {
    const reversed = Object.fromEntries(Object.entries(worldLevelSites).reverse())
    expect(roomsOf(reversed).sort((a, b) => a.key.localeCompare(b.key))).toEqual(
      [...rooms].sort((a, b) => a.key.localeCompare(b.key))
    )
  })
})

describe("journeysInDealOrder", () => {
  it("lists every journey by tier, then alphabetically within a tier", () => {
    const order = journeysInDealOrder(worldLevelSites, tierOf)
    expect([...order].sort()).toEqual(Object.keys(worldLevelSites).sort())
    order.slice(1).forEach((id, i) => {
      const previous = order[i]
      const byTier = difficultyCompare(tierOf(previous), tierOf(id))
      expect(byTier, `${previous} before ${id}`).toBeLessThanOrEqual(0)
      if (byTier === 0) expect(previous < id, `${previous} before ${id}`).toBe(true)
    })
  })

  it("puts a master journey after every starter journey even though 'master' sorts first", () => {
    const order = journeysInDealOrder(
      { starter_a: [], master_a: [], expert_a: [] },
      id => id.split("_")[0] as Difficulty
    )
    expect(order).toEqual(["starter_a", "expert_a", "master_a"])
  })
})

describe("buildBoardIndexes over switches", () => {
  const forkSwitchFloor = (): FloorConfig => forkSwitchFloorConfig()
  const plainSwitchFloor = (): FloorConfig => ({
    pathPuzzles: 0,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [{ pathPuzzles: 0, difficulty: "expert", end: "treasure" }],
    forks: [{ exits: 2, count: 1 }],
    switches: { encounter: "lightbeamSwitch", min: 1, max: 1 },
  })
  const world = { made_up_a: [[forkSwitchFloor()]], made_up_b: [[plainSwitchFloor(), forkSwitchFloor()]] }
  const indexes = buildBoardIndexes(world, ALL_FAMILY_META, resolveEncounter, () => "expert")

  it("deals every switch of one family and tier its own ordinal, a plain switch and a fork-switch alike", () => {
    const dealt = [
      indexes("made_up_a", 0, 0, "lightbeamSwitch", switchAddress("Y")),
      indexes("made_up_b", 0, 0, "lightbeamSwitch", switchAddress(plainSwitchId(0))),
      indexes("made_up_b", 0, 1, "lightbeamSwitch", switchAddress("Y")),
    ]
    expect(dealt).toEqual([0, 1, 2])
  })
})
