import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import { PROCESSION_CASTS } from "@/mods/puzzle/game/procession/casts"
import { faceFor, withAmbience } from "../faceFor"

/**
 * What a day is made of, and how a room works out whose day it is.
 *
 * **A face here is a CAST, not a coat of paint.** Every place this family serves is the same ruled track
 * with the same chips and the same colours — what changes is which doings fill the rows, and that is a row
 * of signs plus a row of names. So the visual half is written once (`GROUND`) and each face adds six
 * hieroglyphs; the names live beside them in the locale files, aligned by index, because a name is
 * language and a sign is not.
 *
 * **The signs are hieroglyphs rather than emoji**, and the reasons are practical rather than thematic:
 * they take the row's own colour (an emoji is painted and cannot), they are drawn from the subset this
 * game already ships (`ui/tokens/hieroglyphFont.generated.ts`, so no device is trusted to own a face), and
 * the vocabulary reaches things emoji has never heard of — a coffin, an offering table, an irrigation
 * basin. The signs are the casts' (`game/procession/casts.ts`), which a procession door's tiles wear too.
 */
export type ProcessionSkin = {
  /** Which place this is, as its own name — the title, the goal and the doings are keyed on it. */
  name: string
  /** The day itself: its ground, and the line between two ticks. */
  ground: string
  seam: string
  /** A row's own strip, and the bar standing in it. One colour a row, so a mark can name a row by colour. */
  row: string
  bars: readonly string[]
  /**
   * What each row IS, one sign a row, in the order the rows are drawn.
   *
   * **A row is identified three ways over** — its sign, its colour and its position — because the marks
   * under the board have to name one without a word, and one channel is never enough: colour alone fails a
   * player who reads no hue, and position alone fails the moment two chips sit side by side.
   */
  glyphs: readonly string[]
  /** A mark that holds, and one that does not. Shape carries it too — see the board. */
  markHeld: string
  markBroken: string
  /** The tick a pin names, drawn under the row it pins. */
  pin: string
  /** The hour numbers under the track, which is what makes a gap of two countable rather than eyeballed. */
  scale: string
  /** What a hint points at: the ticks it settles, and the row it is about. */
  hatch: string
  focus: string
  /** What a finished day wears (`puzzle-screens.md` §3). */
  celebrate: string
}

/** Everything a face does NOT change. One board, five places. */
const GROUND = {
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
  markBroken: "border-red-800/80 bg-red-950/30 text-red-200",
  pin: "bg-stone-300",
  scale: "text-stone-500",
  hatch: "rgb(250 204 21 / 0.55)",
  focus: "ring-amber-400",
  celebrate: "animate-pulse",
}

const cast = (name: string, glyphs: readonly string[]): ProcessionSkin => ({ name, glyphs, ...GROUND })

const SKINS: Record<string, ProcessionSkin> = Object.fromEntries(
  Object.entries(PROCESSION_CASTS).map(([name, glyphs]) => [name, cast(name, glyphs)])
)

export const skinFor = (role?: string | string[], theme?: string, room?: string): ProcessionSkin =>
  withAmbience(
    SKINS[faceFor(PROCESSION_META.faces, role, theme, Object.keys(SKINS), undefined, room)] ?? SKINS.default,
    theme
  )
