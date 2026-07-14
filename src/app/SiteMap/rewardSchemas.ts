import { z } from "zod"
import type { SiteConfig, SubSection, SideSection, TreasureReward } from "@/game/siteTypes"

// Per-reward-type zod schemas, registered by whoever owns the type: core for its own reward
// shapes (fragmentSlot/mapPiece/tombKey — see registerRewardHandlers.ts), each mod for its own
// reward payload from its app entrypoint. This registry is the RUNTIME replacement for the
// compile-time exhaustiveness the open `TreasureReward = {type:string}&Record<string,unknown>`
// union gave up: `validatePlacedRewards` walks the generated world at boot and asserts every
// placed reward type has a registered schema that its payload satisfies. Core names no reward
// type here — it only reads the registry (mod-agnostic).
const schemas = new Map<string, z.ZodType>()

export const registerRewardSchema = (type: string, schema: z.ZodType): void => {
  schemas.set(type, schema)
}

export const getRewardSchema = (type: string): z.ZodType | undefined => schemas.get(type)

// Every reward placed anywhere in a config tree: main-path + side/sub-section ends AND every
// puzzle-chain slot (money/consumables live in puzzle slots, so — unlike validate.ts's end-only
// walk — those must be covered too, or the bulk of placed rewards would go unvalidated).
const collectRewards = (configs: Record<string, SiteConfig[]>): TreasureReward[] => {
  const rewards: TreasureReward[] = []
  const add = (r: TreasureReward | undefined) => {
    if (r) rewards.push(r)
  }
  const tallySub = (s: SubSection) => {
    add(s.endReward)
    for (const r of s.puzzleRewards ?? []) add(r)
  }
  const walkSection = (s: SideSection) => {
    tallySub(s)
    for (const sub of s.sideSections ?? []) tallySub(sub)
  }
  for (const siteConfigs of Object.values(configs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        add(floor.mainEndReward)
        for (const r of floor.puzzleRewards ?? []) add(r)
        for (const s of floor.sideSections) walkSection(s)
      }
    }
  }
  return rewards
}

// Throws (listing every offender) if a placed reward's type has no registered schema, or its
// payload fails the registered schema. Run once at boot after all registrations — the guarantee
// that a stale/mistyped reward id in the generated data is caught loudly instead of silently
// falling through to a missing handler.
export const validatePlacedRewards = (configs: Record<string, SiteConfig[]>): void => {
  const unknown = new Set<string>()
  const invalid: string[] = []
  for (const reward of collectRewards(configs)) {
    const schema = schemas.get(reward.type)
    if (!schema) {
      unknown.add(reward.type)
      continue
    }
    const result = schema.safeParse(reward)
    if (!result.success) invalid.push(`  - "${reward.type}": ${result.error.issues.map(i => i.message).join(", ")}`)
  }
  const errors: string[] = []
  if (unknown.size > 0) errors.push(`unregistered reward type(s): ${[...unknown].join(", ")}`)
  if (invalid.length > 0) errors.push(`reward payload(s) failing their schema:\n${invalid.join("\n")}`)
  if (errors.length > 0)
    throw new Error(
      `[rewardSchemas] Placed-reward validation failed — ${errors.join("; ")}. ` +
        `Every placed reward type must be owned by a registered schema (core or a registered mod).`
    )
}
