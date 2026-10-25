import type { ModDescriptor } from "../modDescriptor"
import { campLoot } from "./game/campLoot"
import { campLootTotals } from "./game/lootTotals"

// The camp mod descriptor. Owns the camp's finds and structure parts (placed on puzzle slots of their
// step's tier), the camp save, and the camp's Collection section. Toggle off by removing it from
// src/mods/registeredMods.ts — the puzzle slots it took go back to the shop, no camp save is read, and the
// Collection has no Constructies.
//
// Game-side only (no React). The app contributions register via the camp app entrypoint
// (src/mods/camp/app, pulled in by registerModApps), gated on this mod being enabled.
export const campMod: ModDescriptor = {
  id: "camp",
  dynamicDistributions: [campLoot],
  lootTotals: campLootTotals,
}
