import { CANISTERS_META } from "@/mods/puzzle/game/canisters/meta"
import { faceFor, withAmbience } from "../faceFor"
import { AMPHORA, CANOPIC, INKPOT, MEASURE, type VesselShape } from "./vesselShapes"

/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * The family emits logical state only — how full each vessel is, which one is held, which pour the hint
 * names — and a skin decides the pixels (`docs/instructions/puzzle-screens.md` §2).
 *
 * **Six places, which is the most any family here wears**, and they are not recolours of one another: the
 * vessel changes shape, the ground changes, and what is in them behaves differently. Measuring grain into
 * a korenmaat and decanting wine between amphorae are different acts, and the board says so before a word
 * of the rules is read.
 */
export type CanistersSkin = {
  /**
   * Which place this is, as its own name. Carried so anything that has to SAY what the room is can ask
   * the skin: the title over the board, the goal above the rules, and the rules themselves.
   */
  name: string
  /** The vessel this place measures into (`Vessel.tsx`). */
  shape: VesselShape
  /**
   * Whether the contents find their own level.
   *
   * Water, wine, oil and ink do. Grain and natron do not: they heap, and they ride round with the vessel
   * when it is tipped rather than holding flat. One flag, and both of those follow from it.
   */
  settles: boolean
  /** The ground the vessels stand on. */
  board: string
  /** The vessel's own outline, and the outline of the one the player has picked up. */
  outline: string
  held: string
  /** What is in it, and what is in it during the completion run. */
  liquid: string
  measured: string
  /**
   * The number written under each vessel.
   *
   * **Its own colour, because it is the one thing on this board that must never be hard to read.** Drawn
   * inside the vessel it disappeared against an empty one; it belongs under the shape, in ink of its own.
   */
  label: string
  /** The hint's own mark, which is never one of the board's own colours. */
  lit: string
}

/** **The river.** Reed-green amphorae on silt, and Nile water in them. */
const river: CanistersSkin = {
  name: "default",
  shape: AMPHORA,
  settles: true,
  board: "bg-gradient-to-b from-stone-800 to-stone-900 ring-1 ring-emerald-900/40",
  outline: "stroke-amber-200",
  held: "stroke-amber-300",
  liquid: "fill-sky-600",
  measured: "fill-emerald-400",
  label: "text-amber-100",
  lit: "ring-2 ring-rose-300",
}

/**
 * **The granary.** The same counting, in korenmaten rather than jars — and the hekat this family is really
 * about was a grain measure before it was anything else.
 *
 * Grain does not pour, it is scooped; it does not level, it heaps; and it does not stay put when the
 * measure is tipped. All three come out of the shape and the one flag.
 */
const granary: CanistersSkin = {
  name: "grain",
  shape: MEASURE,
  settles: false,
  board: "bg-gradient-to-b from-amber-950 to-stone-900 ring-1 ring-amber-800/40",
  outline: "stroke-amber-100",
  held: "stroke-amber-300",
  liquid: "fill-amber-400",
  measured: "fill-emerald-400",
  label: "text-amber-50",
  lit: "ring-2 ring-sky-300",
}

/** **The lamp room.** Oil measured out for the lamps, which is what a light this deep underground runs on. */
const lamps: CanistersSkin = {
  name: "oil",
  shape: AMPHORA,
  settles: true,
  board: "bg-gradient-to-b from-stone-900 to-black ring-1 ring-amber-700/40",
  outline: "stroke-amber-300",
  held: "stroke-amber-100",
  // Lamp oil catches what light there is, which on this ground is the only bright thing.
  liquid: "fill-amber-500",
  measured: "fill-emerald-400",
  label: "text-amber-100",
  lit: "ring-2 ring-sky-300",
}

/** **The merchant's cellar.** Wine decanted between sealed amphorae — the vessel trade actually moved in. */
const cellar: CanistersSkin = {
  name: "wine",
  shape: AMPHORA,
  settles: true,
  board: "bg-gradient-to-b from-stone-800 to-red-950 ring-1 ring-red-900/50",
  outline: "stroke-stone-200",
  held: "stroke-amber-200",
  liquid: "fill-red-800",
  measured: "fill-emerald-400",
  label: "text-stone-100",
  lit: "ring-2 ring-sky-300",
}

/**
 * **The embalming table.** Natron measured into canopic jars for the rites.
 *
 * A mineral salt rather than a liquid, so it behaves as grain does — the pale heap in a lidded jar is what
 * tells this place from the wine cellar at a glance, more than the colour does.
 */
const rites: CanistersSkin = {
  name: "natron",
  shape: CANOPIC,
  settles: false,
  board: "bg-gradient-to-b from-stone-900 to-stone-950 ring-1 ring-stone-600/40",
  outline: "stroke-stone-300",
  held: "stroke-amber-200",
  liquid: "fill-stone-200",
  measured: "fill-emerald-400",
  label: "text-stone-100",
  lit: "ring-2 ring-rose-300",
}

/**
 * **The scriptorium.** Ink ground and measured into pots.
 *
 * **The one face drawn on a LIGHT ground**, and it has to be: ink is black, and black on the dark board
 * every other place uses is not a colour, it is an absence. The outline and the numbers go dark with it.
 */
const scriptorium: CanistersSkin = {
  name: "ink",
  shape: INKPOT,
  settles: true,
  board: "bg-gradient-to-b from-amber-100 to-amber-200 ring-1 ring-amber-900/30",
  outline: "stroke-stone-700",
  held: "stroke-red-700",
  liquid: "fill-stone-900",
  measured: "fill-emerald-600",
  label: "text-stone-800",
  lit: "ring-2 ring-sky-700",
}

const SKINS: Record<string, CanistersSkin> = {
  default: river,
  grain: granary,
  oil: lamps,
  wine: cellar,
  natron: rites,
  ink: scriptorium,
}

/**
 * Which place this room is, resolved the same way every family resolves it (`app/faceFor.ts`).
 *
 * The map itself lives on this family's `FamilyMeta`, where world-gen can read it too
 * (`docs/instructions/puzzle-screens.md` §2).
 */
export const skinFor = (role: string | string[] | undefined, theme: string | undefined, board = 0): CanistersSkin =>
  withAmbience(SKINS[faceFor(CANISTERS_META.faces, role, theme, Object.keys(SKINS), board)] ?? SKINS.default, theme)
