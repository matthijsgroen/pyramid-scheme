import type { ModDescriptor } from "../modDescriptor"
import { LIGHTBEAM_META } from "./game/lightbeam/meta"
import { LIGHTBEAM_SWITCH_META } from "./game/lightbeamSwitch/meta"
import { HANDLE_META } from "./game/handle/meta"

// The topology mod descriptor. Owns the families whose board decides where the player may WALK, rather
// than only what they solve: lightbeam aims a corridor's beam, the lightbeam switch routes its beam to
// one of the ways out of the fork it stands in and shuts the rest, and the handle is a lever standing in
// one section that opens gates on another. They are held here together so the fact that a room can
// re-shape a floor stays in one mod, and nothing about it leaks into the general puzzle mod or into
// core. Minimal by design (docs/mods/TARGET.md): only the fields this mod actually uses.
//
// Each family keeps its own folder under game/ and app/, so a family joining the mod is a new folder and
// one more entry in the list below.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The room Components register via
// the app entrypoint (src/mods/topology/app, pulled in by registerModApps), gated on this mod being
// enabled. Toggle the mod off by removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
export const topologyMod: ModDescriptor = {
  id: "topology",
  families: [LIGHTBEAM_META, LIGHTBEAM_SWITCH_META, HANDLE_META],
}
