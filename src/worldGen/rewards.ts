import type { ConsumableType, Tier, TreasureReward } from "./types"
import { TOMB_SYMBOLS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import type { RewardHint, RewardSpec, GateSpec } from "./dsl"
import { sellablesForDifficulty } from "../data/sellables"
import type { Difficulty } from "../data/difficultyLevels"
import { mapPieceBucket } from "./reachability"

// Simple deterministic hash for per-pyramid seeding of density ranges and reward rolls
export const hashStr = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h >>> 0
}

// Seeded pick of a consumable type, weighted by rates
export const rollConsumable = (
  seed: string,
  rates: { bandage: number; oil: number; trapTool: number }
): ConsumableType => {
  const total = rates.bandage + rates.oil + rates.trapTool
  const roll = hashStr(seed) % total
  return roll < rates.bandage ? "bandage" : roll < rates.bandage + rates.oil ? "oil" : "trapTool"
}

// Seeded loose-money amount, 1-10
export const rollMoney = (seed: string): number => 1 + (hashStr(seed) % 10)

export const hintToReward = (hint: RewardHint, tier: Tier): TreasureReward => {
  switch (hint) {
    case "mapPiece":
      // A preference-tagged open slot, not a baked literal — the worklist solver grants the
      // actual mapPiece reward once discovered blocking tomb entry (keys-and-locks-solver.md,
      // "Structure, then loot"). This is the tier's own primary tomb; a secondary tomb's map
      // piece is always authored via the structured `{type:"mapPiece",tombId}` form below.
      return { type: "fragmentSlot", prefers: mapPieceBucket(`${tier}_treasure_tomb`) }
    case "hieroglyphFragment":
      return { type: "hieroglyphFragment", hieroglyphId: TOMB_SYMBOLS[tier][0] }
    default:
      // Any other hint is a mod-owned capped currency's bucket (e.g. "mosaicPiece") — opaque to
      // core. It becomes a preference-tagged open slot the capped-placement pass fills; core
      // never branches on what the bucket means (docs/mods/TARGET.md rule 2).
      return { type: "fragmentSlot", prefers: hint }
  }
}

// Translates a RewardSpec (string hint or structured object) to a TreasureReward
export const specToReward = (spec: RewardSpec, tier: Tier): TreasureReward => {
  if (typeof spec === "string") return hintToReward(spec, tier)
  // Same "preference-tagged slot, not a baked literal" treatment as the bare hint above —
  // the structured form only differs in naming an explicit (secondary) tomb.
  if (spec.type === "mapPiece") return { type: "fragmentSlot", prefers: mapPieceBucket(spec.tombId) }
  return spec as TreasureReward
}

// Translates a GateSpec to the runtime GateConfig form (undefined = no gate)
export const specToGate = (
  spec: GateSpec | undefined
): { type: "floor-key"; color?: string } | { type: "tomb-key"; wardKeyId: string } | undefined => {
  if (spec == null) return undefined
  if (typeof spec === "string") return spec === "floor-key" ? { type: "floor-key", color: "blue" } : undefined
  if (spec.type === "floor-key") return { type: "floor-key", color: spec.color ?? "blue" }
  const wardKeyId = TOMB_PERK_IDS[spec.tombId]?.[spec.index]
  if (!wardKeyId) return undefined
  return { type: "tomb-key", wardKeyId }
}

export const pathEndToReward = (end: string, tier: string, seed = tier): TreasureReward | undefined => {
  // "mosaic" is a mod currency's authored path end — a preference-tagged open slot the capped
  // pass fills, not a baked literal. Core doesn't know what "mosaic" means beyond the tag.
  if (end === "mosaic") return { type: "fragmentSlot", prefers: "mosaicPiece" }
  if (end === "fragment") {
    return { type: "fragmentSlot" }
  }
  if (end === "junk") {
    const items = sellablesForDifficulty(tier as Difficulty)
    const item = items[hashStr(seed) % items.length]
    return { type: "sellable", itemId: item.id }
  }
  return undefined // "treasure" = no specific endReward
}
