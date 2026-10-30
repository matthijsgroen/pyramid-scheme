import { isRegionless, type StarBattlePuzzle } from "@/mods/puzzle/game/starBattle/starBattle"
import { STAR_BATTLE_META } from "@/mods/puzzle/game/starBattle/meta"
import { REGIONLESS_BATTLE_META } from "@/mods/puzzle/game/starBattle/regionlessMeta"
import { faceFor, withAmbience } from "../faceFor"
import type { FC } from "react"
import { Cat, Farmstead, Lotus, MarketStall, OilLamp, Star } from "./glyphs"

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
  /**
   * A wall cell: raised stone that nothing can stand on. Every skin carries one, but only a board with
   * `walls` draws it.
   */
  stone: string
  /** A square the player may still use, and one a placed answer has already ruled out. */
  cell: string
  spent: string
  /**
   * Where two regions meet, and where they do not — **as CSS colours rather than classes.**
   *
   * The wall is the stroke `Walls` paints along a boundary and the seam is the border every square draws on
   * all four of its edges, so neither can be a Tailwind class: one is an SVG `stroke`, the other is set on an
   * element that is not always the one a Tailwind class would reach.
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
    stone: "bg-stone-600",
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
    stone: "bg-[#8a7a5a]",
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
 * What a regionless board wears, one dress per kind of room. Walls are raised blocks that nothing can stand on,
 * so each skin's `stone` is the thing that place is built of, lit from the top left so it reads as standing up
 * out of the ground rather than as a darker square. There is no boundary stroke: a regionless board draws only
 * its rim.
 *
 * `name` is what the copy is keyed on (it must not collide with a region skin's name), and the table key is
 * what `REGIONLESS_BATTLE_META.faces` names.
 */
const LIT = "shadow-[inset_3px_3px_0_rgba(255,255,255,0.3),inset_-3px_-3px_0_rgba(0,0,0,0.4)]"

export const REGIONLESS_SKINS: Record<string, StarBattleSkin> = {
  /**
   * **Oil lamps on a dark temple floor** — the plain dress, worn by light rooms and by some rooms with no role of their own. The
   * ground is dark so a lamp is the brightest thing on it and a spent square is simply unlit; the answer is
   * warm amber and the walls are cool stone blocks, so piece and wall differ in hue as well as in shape.
   */
  default: {
    name: "lamps",
    token: "🪔",
    stone: `bg-slate-500 ${LIT}`,
    cell: "bg-stone-800",
    spent: "bg-stone-900",
    wall: "rgb(120 113 108 / 0.9)",
    seam: "rgb(120 113 108 / 0.5)",
    Glyph: OilLamp,
    answer: "text-amber-300",
    dark: "text-stone-500",
    hatch: "rgba(252,211,77,0.45)",
    evidence: "ring-sky-300/60",
    focus: "ring-amber-300",
    conflict: "ring-red-500/80",
    // A lamp catching: light only, no swell, since a lamp stands on the floor rather than hanging in the sky.
    celebrate: "animate-flare",
  },
  /**
   * **Stalls in a market square** — daylight on packed earth. The stall is dark red-brown against pale dust, and
   * the houses are warm plastered blocks around the square.
   */
  market: {
    name: "market",
    token: "🏪",
    stone: `bg-[#b98a66] ${LIT}`,
    cell: "bg-[#ecd9b0]",
    spent: "bg-[#d8c08c]",
    wall: "rgb(120 53 15 / 0.8)",
    seam: "rgb(120 90 40 / 0.4)",
    Glyph: MarketStall,
    answer: "text-red-900",
    dark: "text-stone-700/70",
    hatch: "rgba(120,53,15,0.4)",
    evidence: "ring-sky-800/70",
    focus: "ring-red-950",
    conflict: "ring-red-800",
    // A stall opening for the day: a flash of light, no swell.
    celebrate: "animate-flare",
  },
  /**
   * **Lotus on a pond** — dark green water, the flower a pale pink so it is the brightest thing on it, and rocks
   * as grey-brown islets standing out of the water.
   */
  lotus: {
    name: "lotus",
    token: "🪷",
    stone: `bg-stone-500 ${LIT}`,
    cell: "bg-teal-900",
    spent: "bg-teal-950",
    wall: "rgb(94 234 212 / 0.6)",
    seam: "rgb(94 234 212 / 0.25)",
    Glyph: Lotus,
    answer: "text-pink-200",
    dark: "text-teal-300/60",
    hatch: "rgba(251,207,232,0.45)",
    evidence: "ring-sky-300/60",
    focus: "ring-pink-300",
    conflict: "ring-red-400/90",
    // A flower opening: it swells as it brightens.
    celebrate: "animate-bloom",
  },
  /**
   * **Cats on a temple floor** — warm sunlit flagstones, the cat dark against them, and pale pillars. The
   * celebration is the flare: a cat does not leap, it stretches into the sun.
   */
  cats: {
    name: "cats",
    token: "🐈",
    stone: `bg-stone-300 ${LIT}`,
    cell: "bg-[#efe0b8]",
    spent: "bg-[#dcc794]",
    wall: "rgb(120 113 108 / 0.9)",
    seam: "rgb(146 100 40 / 0.35)",
    Glyph: Cat,
    answer: "text-stone-800",
    dark: "text-stone-600/70",
    hatch: "rgba(120,53,15,0.4)",
    evidence: "ring-sky-800/70",
    focus: "ring-amber-900",
    conflict: "ring-red-800",
    celebrate: "animate-flare",
  },
}

/**
 * Which place this room is, resolved the same way every family resolves it (`app/faceFor.ts`).
 *
 * The map itself lives on this family's `FamilyMeta`, where world-gen can read it too
 * (`docs/instructions/puzzle-screens.md` §2).
 */
export const skinFor = (
  puzzle: StarBattlePuzzle,
  role: string | string[] | undefined,
  theme: string | undefined,
  board = 0,
  room?: string
): StarBattleSkin => {
  const regionless = isRegionless(puzzle)
  const skins = regionless ? REGIONLESS_SKINS : SKINS
  const meta = regionless ? REGIONLESS_BATTLE_META : STAR_BATTLE_META
  return withAmbience(skins[faceFor(meta.faces, role, theme, Object.keys(skins), board, room)] ?? skins.default, theme)
}
