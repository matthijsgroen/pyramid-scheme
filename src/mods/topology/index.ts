import type { ModDescriptor } from "../modDescriptor"
import { LIGHTBEAM_META } from "./game/lightbeam/meta"
import { WITNESS_DOOR_META } from "./game/witnessDoor/meta"

// The topology mod descriptor. Owns the families whose board decides where the player may WALK, rather
// than only what they solve: lightbeam aims a corridor's beam, and the witness door mints the key that
// opens one branch of a fork and leaves the other shut. Both are held here together so the fact that a
// room can re-shape a floor stays in one mod, and nothing about it leaks into the general puzzle mod or
// into core. Minimal by design (docs/mods/TARGET.md): only the fields this mod actually uses.
//
// Each family keeps its own folder under game/ and app/, so a family joining the mod is a new folder and
// one more entry in the list below.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The room Components register via
// the app entrypoint (src/mods/topology/app, pulled in by registerModApps), gated on this mod being
// enabled. Toggle the mod off by removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
export const topologyMod: ModDescriptor = {
  id: "topology",
  families: [LIGHTBEAM_META, WITNESS_DOOR_META],
}
