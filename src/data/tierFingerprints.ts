import { createHash } from "node:crypto"
import type { SiteConfig } from "@/game/siteTypes"
import { difficulties, type Difficulty } from "./difficultyLevels"

type FingerprintJourney = { id: string; difficulty: Difficulty; dev?: boolean }

// JSON with object keys sorted, so key order (incidental to how the baked file was written) cannot
// move a hash. Array order is kept: a floor list or a decoration list in a different order IS a
// different authoring. `undefined` object values are dropped, exactly as a JSON round-trip would,
// so a field that is absent and a field that is undefined hash alike.
export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item ?? null)).join(",")}]`
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

// The fields that record WHICH puzzle family stands in a room, and nothing else: `encounter` (a
// section's or floor's family) and `encountersByIndex` (the same, per room). They are the output of
// dealing families out of a bag, so registering a family may reshuffle them while the tier's shape
// and loot stay put. Everything else stays in the hash, including `role` and `encounterArgs`, which
// are what the author asked for rather than what was dealt.
export const FAMILY_RECORD_KEYS: ReadonlySet<string> = new Set(["encounter", "encountersByIndex"])

// A searched carve seed is the bake's output, not the author's: re-pinning it must not read as a tier
// drifting. Removed beside the family records at every depth.
const SEARCHED_KEYS: ReadonlySet<string> = new Set(["seed"])

// `value` with every family record removed at every depth.
export const withoutFamilyRecords = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutFamilyRecords)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !FAMILY_RECORD_KEYS.has(key) && !SEARCHED_KEYS.has(key))
      .map(([key, v]) => [key, withoutFamilyRecords(v)])
  )
}

export type TierFingerprint = { hash: string; journeys: string[] }

// One fingerprint per tier, over the shape and loot of the baked configs (family records left out)
// of the journeys whose `difficulty` is that tier.
// The playtesting journey is left out by name: it exists only in a world generated with
// INCLUDE_DEV, and shipped tiers must hash the same with or without it. A tier with no journeys
// throws instead of hashing to an empty value, because a tier that silently vanished would
// otherwise look like "unchanged".
export const tierFingerprints = (
  journeys: readonly FingerprintJourney[],
  configs: Record<string, SiteConfig[]>
): Record<Difficulty, TierFingerprint> => {
  const result = {} as Record<Difficulty, TierFingerprint>
  for (const tier of difficulties) {
    const ids = journeys
      .filter(j => j.difficulty === tier && !j.dev)
      .map(j => j.id)
      .sort()
    if (ids.length === 0) throw new Error(`Tier "${tier}" has no journeys, so there is nothing to fingerprint`)
    const authored = Object.fromEntries(
      ids.map(id => {
        const config = configs[id]
        if (!config) throw new Error(`Journey "${id}" has no baked config; the world is not generated`)
        return [id, config]
      })
    )
    result[tier] = {
      hash: createHash("sha256")
        .update(stableStringify(withoutFamilyRecords(authored)))
        .digest("hex")
        .slice(0, 16),
      journeys: ids,
    }
  }
  return result
}
