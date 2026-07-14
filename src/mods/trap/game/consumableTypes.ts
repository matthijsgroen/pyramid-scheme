import { hashStr } from "@/worldGen/rewards"

// Trap owns the consumable vocabulary: bandages heal, oil fully heals, trap tools disarm. These
// are trap's own reward payload subtypes, not a core reward id — core enumerates no reward
// vocabulary (docs/mods/distribution-primitive-design.md §D). Toggling trap off drops the type
// and its roll together.
export type ConsumableType = "bandage" | "oil" | "trapTool"

// Seeded pick of a consumable type, weighted by rates. hashStr (the generic per-seed hash) stays
// in worldGen/rewards; only the trap-specific enumeration lives here.
export const rollConsumable = (
  seed: string,
  rates: { bandage: number; oil: number; trapTool: number }
): ConsumableType => {
  const total = rates.bandage + rates.oil + rates.trapTool
  const roll = hashStr(seed) % total
  return roll < rates.bandage ? "bandage" : roll < rates.bandage + rates.oil ? "oil" : "trapTool"
}
