import { climb, firstRung } from "./ladder"
import { pickPlan } from "./pickPlan"
import { DEFAULT_PACKING } from "../carveConstants"
import { finishAttempt, finishInRooms, PASSES } from "./passes"
import type { Finish, FloorPrep, PassEntry, Rung } from "./state"

/** What carves a floor: the passes an attempt runs, the tail that renders and validates, and the ladder it climbs. */
export type Engine = {
  passes: readonly PassEntry[]
  finish: Finish
  firstRung: (prep: FloorPrep) => Rung
  climb: (prep: FloorPrep, attempt: number, rung: Rung) => Rung
}

export const LATTICE_ENGINE: Engine = { passes: PASSES, finish: finishAttempt, firstRung, climb }

/** The engine every floor is carved with unless a caller passes another. */
export const CARVE_ENGINE: Engine = LATTICE_ENGINE

/** The lattice as a sketch, a floor plan steering it, given real space by the embed (`finishInRooms`). The sketch
 * walks the default wish whatever the floor authors, on the grid the floor's own wish sizes, so a lock lays on it as
 * on the lattice; its growth up the ladder is never seen: the floor's size follows from the embed. */
export const ROOMS_ENGINE: Engine = {
  passes: [pickPlan, ...PASSES],
  finish: finishInRooms,
  firstRung: prep => {
    const rung = firstRung({ ...prep, sizing: { ...prep.sizing, packing: DEFAULT_PACKING } })
    const authored = firstRung(prep)
    return { ...rung, n: authored.n, startingN: authored.startingN }
  },
  climb,
}

/** The engine a verify file carves with: `CARVE_ENGINE_OVERRIDE=rooms` asks for the rooms engine, anything else the
 * one every floor ships with. */
export const engineFromEnv = (): Engine =>
  typeof process !== "undefined" && process.env.CARVE_ENGINE_OVERRIDE === "rooms" ? ROOMS_ENGINE : CARVE_ENGINE
