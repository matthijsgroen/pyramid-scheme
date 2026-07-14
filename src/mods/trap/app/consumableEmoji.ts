import type { ConsumableType } from "@/game/siteTypes"

// Consumable subtype → icon. Consumables are trap-owned, so this map lives here (not core): it
// feeds the consumable reward's popup text and the shop's supplies list. Consumable subtypes
// aren't reward types, so they don't get a RewardHandler — this is the one place mapping them.
export const CONSUMABLE_EMOJI: Record<ConsumableType, string> = { bandage: "🩹", oil: "🫙", trapTool: "🔧" }
