import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import { faceFor, withAmbience } from "../faceFor"

/**
 * What this day looks like, and how a room works out which day it is.
 *
 * **One face today, and it is a day's work rather than a place**: the things that happen are drawn as what
 * they are — a fire lit, water carried, grain ground — and the track under them is the hours. The places
 * this mechanic is for, each with its own set of doings and its own art, arrive as further faces
 * (`docs/game-design/puzzles/procession.md` §8).
 *
 * **The glyphs are why a row is a THING and not a colour.** Playtesting said it plainly: a board of
 * coloured rectangles is bars being shuffled, and a board where the fire and the grinding are visibly the
 * fire and the grinding is a day being worked out. Nothing about the rules changed with them, and nothing
 * has to be read: a glyph identifies its row, and the marks below the board are sentences about glyphs.
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
  /**
   * What each row IS, one glyph a row, in the order the rows are drawn.
   *
   * **A row is identified three ways over** — its glyph, its colour and its position — because the marks
   * below the board have to name one without a word, and one channel is never enough: colour alone fails a
   * player who reads no hue, and position alone fails the moment two chips sit side by side.
   */
  glyphs: readonly string[]
  /** The hour numbers under the track, which is what makes a gap of two countable rather than eyeballed. */
  scale: string
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
   * **A day's work on a ruled track.** Everything that carries meaning is geometry or glyph: a bar's WIDTH
   * is how long that doing takes, its glyph is which doing it is, and the numbers under the track are the
   * hours it is measured in.
   *
   * The six doings are chosen to be a day rather than a story — a fire, water carried, grain ground, a
   * boat worked, oxen driven, a lamp kept — because the generator decides what happens when, and a set
   * that implied an order would be telling a lie about half the boards it draws.
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
    glyphs: ["🔥", "🏺", "🌾", "🛶", "🐂", "🕯"],
    scale: "text-stone-500",
    markHeld: "border-stone-600 bg-stone-900 text-stone-400",
    markBroken: "border-red-800/80 bg-red-950/30 text-red-200",
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
