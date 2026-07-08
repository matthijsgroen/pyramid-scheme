import type { ConsumableType, Tier, TreasureReward } from "./types"
import { TOMB_SYMBOLS } from "./data"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import type { RewardHint, RewardSpec, GateSpec } from "./dsl"

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

export const hintToReward = (hint: RewardHint, tier: Tier): TreasureReward => {
  switch (hint) {
    case "mosaicPiece":
      return { type: "mosaicPiece" }
    case "mapPiece":
      return { type: "mapPiece", tombId: `${tier}_treasure_tomb` }
    case "hieroglyphs":
      return { type: "hieroglyphs" }
    case "hieroglyphFragment":
      return { type: "hieroglyphFragment", hieroglyphId: TOMB_SYMBOLS[tier][0] }
  }
}

// Translates a RewardSpec (string hint or structured object) to a TreasureReward
export const specToReward = (spec: RewardSpec, tier: Tier): TreasureReward => {
  if (typeof spec === "string") return hintToReward(spec, tier)
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

const CONSUMABLE_THRESHOLDS = [5, 8] as const // <5 → bandage, <8 → oil, else → trapTool

export const pathEndToReward = (end: string, tier: string, index = 0): TreasureReward | undefined => {
  if (end === "mosaic") return { type: "mosaicPiece" }
  if (end === "fragment") {
    return { type: "fragmentSlot" }
  }
  if (end === "consumable") {
    const roll = hashStr(`${tier}:consumable:${index}`) % 10
    const consumable =
      roll < CONSUMABLE_THRESHOLDS[0] ? "bandage" : roll < CONSUMABLE_THRESHOLDS[1] ? "oil" : "trapTool"
    return { type: "consumable", consumable }
  }
  return undefined // "treasure" = no specific endReward
}
