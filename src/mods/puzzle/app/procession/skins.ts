import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
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
 * basin. Anything used here must be a literal in a `.ts` file for `yarn generate-font` to see it.
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

const SKINS: Record<string, ProcessionSkin> = {
  /**
   * **A day's work**, and the face a room wears when its site asked for nothing in particular: a fire,
   * water carried, bread baked, a boat worked, oxen driven, a watch kept through the night.
   */
  default: cast("default", ["𓊮", "𓈗", "𓏏", "𓊛", "𓃒", "𓇹"]),
  /**
   * **The day of a burial** — the largest pool in the game, and the one this mechanic was named for. The
   * rites are the doings: the opening of the mouth, the wrapping, the anointing, the walk to the tomb, the
   * offering laid down, the sealing.
   */
  funerary: cast("funerary", ["𓁹", "𓋴", "𓏊", "𓂻", "𓊵", "𓊭"]),
  /**
   * **A night of the sky** — decans and lights crossing it, each visible for its own stretch. This is the
   * face `wizard_4` has been waiting for: the one journey no pool serves (`journeys.md` §9).
   */
  cosmos: cast("cosmos", ["𓇳", "𓇼", "𓇹", "𓇯", "𓈍", "𓆳"]),
  /**
   * **A day on the flood plain**: the water let in, the channel, the basin, the field, the ferrying, the
   * reaping.
   */
  water: cast("water", ["𓈗", "𓈘", "𓈙", "𓈇", "𓊛", "𓌳"]),
  /**
   * **A day at the quay**: goods, bread, beer, the ferry, the hauling, and the tally that says what moved.
   */
  trade: cast("trade", ["𓎟", "𓏏", "𓏊", "𓊛", "𓂻", "𓏛"]),
}

export const skinFor = (role?: string | string[], theme?: string): ProcessionSkin =>
  withAmbience(
    SKINS[faceFor(PROCESSION_META.faces, role, theme, Object.keys(SKINS), undefined)] ?? SKINS.default,
    theme
  )
