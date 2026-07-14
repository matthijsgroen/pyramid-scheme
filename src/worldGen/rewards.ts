import type { ConsumableType, Tier, TreasureReward } from "./types"
import { TOMB_PERK_IDS } from "../data/treasurePerks"
import type { RewardHint, RewardSpec, GateSpec } from "./dsl"
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
    default:
      // Every other hint is a currency id (e.g. "mosaicPiece", "hieroglyph") — opaque to core.
      // It becomes a preference-tagged open slot the placement solver / capped pass fills;
      // core never branches on what the bucket means and never bakes the currency reward
      // itself, so an unregistered currency's slot simply falls through to filler loot
      // (docs/mods/TARGET.md rule 2; the DSL-as-preference model).
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

export const pathEndToReward = (end: string): TreasureReward | undefined => {
  // Authored path ends are preference-tagged OPEN slots the placement pass fills — never baked
  // reward literals. Core doesn't know what a currency means beyond the tag, and never rolls a
  // variant (docs/mods/distribution-primitive-design.md). "junk" is a plain loot slot: the shop's
  // money economy fills it (junk or coins), and with shop off it falls to empty like any other —
  // so core no longer names `sellable` here.
  if (end === "mosaic") return { type: "fragmentSlot", prefers: "mosaicPiece" }
  if (end === "fragment") return { type: "fragmentSlot" }
  if (end === "junk") return { type: "fragmentSlot", prefers: "junk" }
  return undefined // "treasure" = no specific endReward
}
