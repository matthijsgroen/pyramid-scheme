import type { FC } from "react"
import { Farmstead, Star } from "./glyphs"

/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * Separate from the board because the board is a component file, and separate from the glyphs because a file
 * exporting components may export nothing else.
 */

/**
 * A skin: everything on the board that is a place rather than a rule.
 *
 * The family emits logical state only — a square is empty, ruled out by the player, or holds the answer; a
 * boundary either separates two regions or does not — and a skin decides the pixels
 * (`docs/instructions/puzzle-screens.md` §2).
 *
 * **The rings are skinned along with the ground, and they have to be.** They are what a hint points with,
 * and an amber ring drawn for a night sky disappears on a sunlit board — an affordance that survives only on
 * one skin is not an affordance.
 */
export type StarBattleSkin = {
  /**
   * Which place this is, as its own name.
   *
   * Carried so anything that has to SAY what the room is can ask the skin: the goal above the rules, the
   * rules themselves, and every sentence the hint engine reaches for are all keyed on it.
   */
  name: string
  /** The token this place's sentences put in their glyph slot, so a hint can say the thing rather than name it. */
  token: string
  /** A square the player may still use, and one a placed answer has already ruled out. */
  cell: string
  spent: string
  /**
   * Where two regions meet, and where they do not — **as CSS colours rather than classes, and that is
   * load-bearing.**
   *
   * A Tailwind `border-*` colour class sets all four sides at once, so a square with one wall edge and three
   * seams paints the seams in the wall's colour as well. The widths stay classes (they are per-side already);
   * the colours are applied per side, which is the only way a boundary can be told from a grid line.
   *
   * **The seam is not decoration and must not be drawn as if it were.** Half this family's reasoning is
   * counting squares along a line — "this row is down to two squares" — and a player who cannot see where one
   * square ends has to count the gaps instead. It stays quieter than the wall, because which of the two a
   * boundary is has to be readable at a glance; quieter is not the same as nearly absent.
   */
  wall: string
  seam: string
  /** What the answer looks like standing in a square, and its colour. */
  Glyph: FC
  answer: string
  /** The player's own "not here" — deliberately slight, since it is the mark they make most of. */
  dark: string
  /** The hint's hatch, as the stripe colour of a repeating gradient. */
  hatch: string
  /** What a hint argues FROM, the one square it is ABOUT, and a rule already broken. */
  evidence: string
  focus: string
  conflict: string
  /** What an answer wears for its turn in the completion run (`puzzle-screens.md` §3), and it is a per-skin
   *  choice rather than one house style: a STAR swelling as it brightens reads as catching the light, and the
   *  same swell on a farmstead standing in a plot — a building set in the ground — reads as the board twitching.
   *  So the sky blooms and the flood plain only flares (see index.css). */
  celebrate: string
}

const SKINS: Record<string, StarBattleSkin> = {
  /**
   * **Stars in a night sky** — the plainest possible face for the `sky` pool, and the one the name already
   * describes. Dark ground so a star is the brightest thing on the board, and amber walls because a drawn
   * boundary has to read as a boundary rather than as another mark.
   */
  default: {
    name: "default",
    token: "⭐",
    cell: "bg-stone-800",
    spent: "bg-stone-900",
    wall: "rgb(253 230 138 / 0.85)",
    // Bright enough to count squares by on a dark ground. Drawn at stone-600/50 it sat about one step off
    // the squares either side of it, and an 8×8 read as blocks of dark with walls round them.
    seam: "rgb(120 113 108 / 0.5)",
    Glyph: Star,
    answer: "text-amber-200",
    dark: "text-stone-500",
    hatch: "rgba(252,211,77,0.45)",
    evidence: "ring-sky-300/60",
    focus: "ring-amber-300",
    conflict: "ring-red-500/80",
    // Stars twinkle, size and all: a star is a point of light, so a swell IS the reading.
    celebrate: "animate-bloom",
  },
  /**
   * **Farmsteads on the flood plain** (PUZZLE_FAMILIES.md §11.1, Water & Agriculture, and the family doc
   * §11.3). The rules read straight across and the reason for each one is the place: a holding takes its
   * quota of households, a row of plots takes the same, and two farmsteads may not sit within reach of each
   * other because that close they would be drawing on the same well.
   *
   * **Daylight, which is the deliberate opposite of the sky the same board wears by default** — you work a
   * field under the sun. Everything follows from the ground being LIGHT: the walls are the water in the
   * channels between holdings, the farmstead is dark against the soil rather than glowing on it, and the hint
   * rings are drawn in ink instead of light.
   *
   * Worn by both families on this board. Two households to a holding is the fiction the place was written
   * for, and it is twin stars' outright; at one star the same holding takes one farmstead, which the copy
   * already says in the singular (`starBattle.goal.fields_one`). What makes the place read is the
   * no-touching rule — two farmsteads that close would share a well — and that rule is the same at either
   * count.
   */
  fields: {
    name: "fields",
    token: "🛖",
    // Tilled earth, and the ruled-out square is ground already in somebody's shadow.
    cell: "bg-[#e0c896]",
    spent: "bg-[#c9ac74]",
    // The channel between two holdings is water, which is the one thing on a sunlit board that cannot be
    // mistaken for more soil.
    wall: "rgb(3 105 161 / 0.9)",
    // A furrow inside one holding: countable, but nothing to reason from.
    seam: "rgb(120 53 15 / 0.35)",
    Glyph: Farmstead,
    answer: "text-emerald-900",
    dark: "text-stone-700/70",
    hatch: "rgba(120,53,15,0.4)",
    evidence: "ring-sky-800/70",
    focus: "ring-emerald-950",
    conflict: "ring-red-800",
    // Light only. A farmstead standing in a plot cannot swell without the plot appearing to move with it.
    celebrate: "animate-flare",
  },
}

/**
 * Which place a room is, out of the two things it is told: the **role** it was allocated for and the
 * **ambience** its site authored (`puzzle-screens.md` §2).
 *
 * The same resolution constellation uses, for the same reason: core hands over both and decides nothing,
 * because any precedence rule core picked would be wrong for some family.
 *
 * **No ambience overlay exists here yet.** The default skin already IS night, so a `night` theme over
 * farmland is the one combination that would want one — a `night` partial on `fields` rather than a fallback
 * to the sky. Nothing authors it yet.
 */
const ROLE_SKINS: Record<string, string> = {
  sky: "default",
  light: "default",
  water: "fields",
  agriculture: "fields",
}

/**
 * Names that mean "nothing was said" rather than naming a skin.
 *
 * `default` is in the skin table AND is what a picker shows when no theme is chosen, so it has to be read as
 * silence — otherwise it wins the override below and quietly cancels the role.
 */
const UNSPOKEN = ["default", "night"]

export const skinFor = (role: string | string[] | undefined, theme: string | undefined): StarBattleSkin => {
  // A theme naming one of this family's own skins is an explicit override — the lab, and any site that wants
  // a particular dress.
  const named = theme && !UNSPOKEN.includes(theme) ? SKINS[theme] : undefined
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  // A list of roles is a union the allocator drew from, so the first one this family has an identity for is
  // the one this room is.
  const byRole = roles.map(each => ROLE_SKINS[each]).find(skin => skin && SKINS[skin])
  return named ?? (byRole ? SKINS[byRole] : SKINS.default)
}
