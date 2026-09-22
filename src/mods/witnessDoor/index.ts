import type { ModDescriptor } from "../modDescriptor"
import { WITNESS_DOOR_META } from "./game/meta"

// The witnessDoor mod descriptor. Minimal by design (docs/mods/TARGET.md): only the fields this
// mod actually uses. The shared ModDescriptor type lives in ../modDescriptor. Toggle the mod off
// by removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The witness-door SCREEN
// and its key minting are wired app-side (src/mods/witnessDoor/app/plugin.tsx), gated on this
// mod being enabled.
export const witnessDoorMod: ModDescriptor = {
  id: "witnessDoor",
  families: [WITNESS_DOOR_META],
}
