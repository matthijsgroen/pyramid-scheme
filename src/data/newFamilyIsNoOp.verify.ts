import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { SiteConfig } from "@/game/siteTypes"
import { buildConfigs } from "@/worldGen/configBuilder"
import { assignFragmentPieceIndices } from "../mods/hieroglyph/game/fragmentFinalize"
import { ALL_CURRENCY_DISTRIBUTIONS } from "@/mods/allCurrencyDistributions"
import {
  ALL_FAMILY_META,
  allocateEncounterSpread,
  familyCapacityFor,
  familyIsTrap,
  familyPriorityFor,
  resolveEncounterMeta,
  resolveKeyRequirements,
} from "@/mods/allFamilyMeta"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_REACHABILITY_SUPPORT,
  MOD_RESERVED_TREASURE_INDICES,
  MOD_SHOP_STOCK,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_WORLD_VALIDATORS,
  REGISTERED_MOD_IDS,
} from "@/mods/registeredMods"
import { difficulties } from "./difficultyLevels"
import { generatedWorldConfigs } from "./generatedWorld"
import { journeys } from "./journeys"
import expected from "./tierFingerprints.json"
import { stableStringify, tierFingerprints } from "./tierFingerprints"

// The requirement (owner, 2026-09-30): registering a puzzle family leaves the authored world's structure
// and loot where they were, and so every tier's fingerprint. Which family stands in which room is free
// to move: one player may meet a different puzzle than another, but both find the same loot. World-gen
// deals each room's family from a bag built out of the registered families, so this builds the world
// twice, once without and once with a family the registry has never seen, and compares the two.

// A plausible new puzzle: it carries the tags most pools are made of, debuts at the bottom, and its id
// sorts into the middle of the registry rather than at either end.
const NEW_FAMILY: FamilyMeta = {
  id: "kakuro",
  ownerMod: "puzzle",
  tags: ["puzzle", "agriculture", "water", "scribe", "funerary"],
  faces: { water: ["default"], agriculture: ["default"], scribe: ["default"], funerary: ["default"] },
  minTier: "starter",
  icon: "🔢",
  color: "amber",
  rewardPriority: 60,
}

type World = ReturnType<typeof build>

const build = () => {
  const configs = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )
  assignFragmentPieceIndices(configs)
  return configs
}

// What a floor or section carries that is a reward, and what it carries that names the family of a room.
const LOOT_KEYS = new Set(["mainEndReward", "endReward", "rewards"])
const FAMILY_KEYS = new Set(["encounter", "encountersByIndex", "role"])

type Plain = unknown

// Every field of the config except the ones `drop` names, at every depth.
const without = (value: Plain, drop: (key: string) => boolean): Plain => {
  if (Array.isArray(value)) return value.map(item => without(item, drop))
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !drop(key))
      .map(([key, v]) => [key, without(v, drop)])
  )
}

// Only the fields `keep` names, at every depth, with the shape around them kept so a reward is still
// found at the floor and section it sits on. A branch holding none of them is left out, so two views
// of the same world differ only where a kept field does.
const prune = (value: Plain, keep: (key: string) => boolean): Plain => {
  if (Array.isArray(value)) return value.map(item => prune(item, keep) ?? null)
  if (value === null || typeof value !== "object") return undefined
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, v]) => {
    const kept = keep(key) ? v : prune(v, keep)
    return kept === undefined ? [] : [[key, kept] as const]
  })
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}
const only = (value: Plain, keep: (key: string) => boolean): Plain => prune(value, keep) ?? {}

const structure = (configs: World) => without(configs, key => LOOT_KEYS.has(key) || FAMILY_KEYS.has(key))
const loot = (configs: World) => only(configs, key => LOOT_KEYS.has(key))
const familyChoices = (configs: World) => only(configs, key => FAMILY_KEYS.has(key))

// The first difference between two values, as a path — `expect(...).toEqual` on the whole world would
// print a diff too large to read.
const firstDifference = (a: Plain, b: Plain, path = ""): string | undefined => {
  if (stableStringify(a) === stableStringify(b)) return undefined
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const at = firstDifference(a[i], b[i], `${path}[${i}]`)
      if (at) return at
    }
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const at = firstDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${path}.${key}`
      )
      if (at) return at
    }
  }
  return `${path}: ${stableStringify(a).slice(0, 80)} -> ${stableStringify(b).slice(0, 80)}`
}

const shipped = journeys.filter(j => !j.dev)

// The builder and the fingerprint name two structurally compatible SiteConfig types that TypeScript
// cannot see through (a gate colour is a string in one and a KeyColor in the other).
const fingerprints = (world: World) => tierFingerprints(shipped, world as unknown as Record<string, SiteConfig[]>)

// Per-journey comparison, so a failure names the first journey and the first spot that moved rather
// than "the world differs".
const movedJourneys = (before: World, after: World, view: (configs: World) => Plain): string[] => {
  const a = view(before) as Record<string, unknown>
  const b = view(after) as Record<string, unknown>
  return shipped.flatMap(j => {
    const at = firstDifference(a[j.id], b[j.id])
    return at ? [`${j.id}${at}`] : []
  })
}

// Runs a build with the registry changed, and puts the registry back however the build ends.
const buildWithRegistry = (change: () => () => void): World => {
  const restore = change()
  try {
    return build()
  } finally {
    restore()
  }
}

const registerNewFamily = () => {
  ALL_FAMILY_META.push(NEW_FAMILY)
  return () => {
    ALL_FAMILY_META.splice(ALL_FAMILY_META.indexOf(NEW_FAMILY), 1)
  }
}

describe("registering a new puzzle family is a no-op for the authored world", () => {
  let before: World
  let after: World

  beforeAll(() => {
    before = build()
    after = buildWithRegistry(registerNewFamily)
  }, 600_000)

  afterAll(() => {
    expect(ALL_FAMILY_META).not.toContain(NEW_FAMILY)
  })

  it("the fake family sits in the middle of the registry's sort order, not at an end", () => {
    const ids = [...ALL_FAMILY_META.map(m => m.id), NEW_FAMILY.id].sort((a, b) => a.localeCompare(b))
    expect(ids.indexOf(NEW_FAMILY.id)).toBeGreaterThan(0)
    expect(ids.indexOf(NEW_FAMILY.id)).toBeLessThan(ids.length - 1)
  })

  // The bake raises a floor's `packing` to the smallest value that carves it, and the build alone has not
  // run the bake; the shipped value is laid over each floor so the build is compared like for like.
  const withBakedPacking = (world: World): World => {
    const copy = structuredClone(world) as unknown as Record<string, { packing?: number }[][]>
    for (const [journeyId, levels] of Object.entries(copy))
      levels.forEach((floors, level) =>
        floors.forEach((floor, index) => {
          const baked = (generatedWorldConfigs as unknown as typeof copy)[journeyId]?.[level]?.[index]?.packing
          if (baked !== undefined) floor.packing = baked
        })
      )
    return copy as unknown as World
  }

  it("the baseline build is the shipped world: every tier hashes to tierFingerprints.json", () => {
    const actual = fingerprints(withBakedPacking(before))
    expect(difficulties.map(tier => actual[tier].hash)).toEqual(difficulties.map(tier => expected[tier].hash))
  })

  // A view that came out empty would compare equal for any change, so each view must hold something.
  it("each view under comparison holds the world's structure, loot and family choices", () => {
    const count = (view: Plain, key: string): number => JSON.stringify(view).split(`"${key}"`).length - 1
    expect(count(loot(before), "rewards")).toBeGreaterThan(100)
    expect(count(loot(before), "endReward")).toBeGreaterThan(100)
    expect(count(familyChoices(before), "encounter")).toBeGreaterThan(100)
    expect(count(structure(before), "pathPuzzles")).toBeGreaterThan(100)
    expect(count(structure(before), "encounter")).toBe(0)
    expect(count(structure(before), "endReward")).toBe(0)
  })

  it("every tier's fingerprint is unchanged", () => {
    const a = fingerprints(before)
    const b = fingerprints(after)
    const moved = difficulties.filter(tier => a[tier].hash !== b[tier].hash)
    expect(moved, `tiers whose fingerprint moved: ${moved.join(", ")}`).toEqual([])
  })

  it("the level structure is unchanged: rooms, paths, sections, gates", () => {
    const moved = movedJourneys(before, after, structure)
    expect(moved, `journeys whose structure moved (first difference each): ${moved.slice(0, 5).join(" | ")}`).toEqual(
      []
    )
  })

  it("the loot distribution is unchanged: what each chest holds, junk versus coins, treasure placement", () => {
    const moved = movedJourneys(before, after, loot)
    expect(moved, `journeys whose loot moved (first difference each): ${moved.slice(0, 5).join(" | ")}`).toEqual([])
  })
})
