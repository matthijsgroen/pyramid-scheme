import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import { faceFor, withAmbience } from "../faceFor"

/**
 * What this day looks like, and how a room works out which day it is.
 *
 * **One face today, and it is deliberately no place at all**: bars on a ruled track, told apart by their
 * row and their colour. The places this mechanic is for — a funeral procession walked hour by hour, decans
 * crossing a night sky, sluice gates on a flood channel — arrive as painted art per face
 * (`docs/game-design/puzzles/procession.md` §8), and a face is where that art will hang.
 */
export type ProcessionSkin = {
  /** Which place this is, as its own name — the goal, the rules and every hint sentence are keyed on it. */
  name: string
  /** The day itself: its ground, and the line between two ticks. */
  ground: string
  seam: string
  /** A row's own strip, and the bar standing in it. One colour a row, so a mark can name a row by colour. */
  row: string
  bars: readonly string[]
  /** A mark that holds, and one that does not. Shape carries it too — see the board. */
  markHeld: string
  markBroken: string
  /** The tick a pin names, drawn under the row it pins. */
  pin: string
  /** What a hint points at: the ticks it settles, and the row it is about. */
  hatch: string
  focus: string
  /** What a finished day wears (`puzzle-screens.md` §3). */
  celebrate: string
}

const SKINS: Record<string, ProcessionSkin> = {
  /**
   * **Bars on a ruled track** — the plainest reading of the mechanic, and the one it has before it is
   * dressed as anywhere. Everything that carries meaning is geometry: a bar's WIDTH is how long the thing
   * lasts, its row is which thing it is, and the ticks under it are the hours of the day.
   *
   * **A row is a colour and a position, never a colour alone.** The marks below the board name rows by
   * their swatch, so a player who reads no hue has the row order to fall back on — the swatches are listed
   * top to bottom in the same order the rows are drawn.
   */
  default: {
    name: "default",
    ground: "bg-stone-950",
    seam: "rgb(120 113 108 / 0.3)",
    row: "bg-stone-900/60",
    bars: [
      "bg-teal-700 border-teal-500",
      "bg-amber-700 border-amber-500",
      "bg-rose-800 border-rose-600",
      "bg-indigo-700 border-indigo-500",
      "bg-lime-700 border-lime-500",
      "bg-fuchsia-800 border-fuchsia-600",
    ],
    markHeld: "border-stone-600 bg-stone-900 text-stone-400",
    markBroken: "border-red-700 bg-red-950/70 text-red-300",
    pin: "bg-stone-300",
    hatch: "rgb(250 204 21 / 0.55)",
    focus: "ring-amber-400",
    celebrate: "animate-pulse",
  },
}

export const skinFor = (role?: string | string[], theme?: string): ProcessionSkin =>
  withAmbience(
    SKINS[faceFor(PROCESSION_META.faces, role, theme, Object.keys(SKINS), undefined)] ?? SKINS.default,
    theme
  )
