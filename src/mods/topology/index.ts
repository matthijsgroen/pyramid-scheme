import type { ModDescriptor } from "../modDescriptor"
import { GATE_FACE_META } from "./game/gateFace/meta"
import { LIGHTBEAM_META } from "./game/lightbeam/meta"
import { LIGHTBEAM_SWITCH_META } from "./game/lightbeamSwitch/meta"
import { NARROW_PASSAGE_META } from "./game/narrowPassage/meta"
import { HANDLE_META } from "./game/handle/meta"
import { TORCH_META } from "./game/torch/meta"
import { PRESSURE_PLATE_META } from "./game/pressurePlate/meta"
import { STONE_PLATE_META } from "./game/stonePlate/meta"
import { SAND_META, WATER_META } from "./game/regionBarrier/meta"
import { ZIPLINE_META } from "./game/zipline/meta"

// The topology mod descriptor. Owns the families whose board decides where the player may WALK, rather
// than only what they solve: lightbeam aims a corridor's beam, the lightbeam switch routes its beam to
// one of the ways out of the fork it stands in and shuts the rest, and the handle is a lever standing in
// one section that opens gates on another. They are held here together so the fact that a room can
// re-shape a floor stays in one mod, and nothing about it leaks into the general puzzle mod or into
// core. Minimal by design (docs/mods/TARGET.md): only the fields this mod actually uses.
//
// The control KINDS are core's (src/game/mechanics) and stay when this mod is off. What this mod provides is
// their REALISATIONS: the handle and torch dress a toggle and an activator, the lightbeam switch a fork-switch,
// the pressure plate a sequence, the stone plate a lock's stones, the zipline a one-way, water and sand a region
// barrier, the narrow passage a gate empty hands alone open, the gate face the reader of a door. A floor authoring a
// mechanic is refused by name where none of these is registered.
//
// Each family keeps its own folder under game/ and app/, so a family joining the mod is a new folder and
// one more entry in the list below.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The room Components register via
// the app entrypoint (src/mods/topology/app, pulled in by registerModApps), gated on this mod being
// enabled. Toggle the mod off by removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
export const topologyMod: ModDescriptor = {
  id: "topology",
  families: [
    LIGHTBEAM_META,
    LIGHTBEAM_SWITCH_META,
    HANDLE_META,
    TORCH_META,
    GATE_FACE_META,
    PRESSURE_PLATE_META,
    STONE_PLATE_META,
  ],
  oneWayRealisations: [ZIPLINE_META],
  regionBarrierRealisations: [WATER_META, SAND_META],
  passageRealisations: [NARROW_PASSAGE_META],
}
