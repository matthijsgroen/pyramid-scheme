import type { ModDescriptor } from "../modDescriptor"
import { ARITHMETIC_REFLEX_META } from "./game/arithmeticReflex/meta"

// The trap mod descriptor. Owns the arithmetic-reflex trap encounter family. Toggle off by
// removing it from src/mods/registeredMods.ts — trap-tagged rooms then resolve via the
// family-absence pass-through (SiteMapScreen) instead of rendering a challenge.
//
// Game-side only (no React) — the trap challenge Component registers app-side
// (registerAllFamilies → trap/app/arithmeticReflex/plugin), gated on this mod being enabled.
// Consumable ownership, health currency, and the HUD land in later stages of Slice 3b.
export const trapMod: ModDescriptor = {
  id: "trap",
  families: [ARITHMETIC_REFLEX_META],
}
