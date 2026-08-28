import { CONSTELLATION_META } from "@/mods/puzzle/game/constellation/meta"
import { faceFor, withAmbience } from "../faceFor"
import type { FC } from "react"
import { Plant, Pyramid } from "./glyphs"

/**
 * What each of this family’s places looks like, and how a room works out which place it is.
 *
 * Separate from the board because the board is a component file, and separate from the glyphs because a file
 * exporting components may export nothing else.
 */

/**
 * A skin: what the board, its lines and its nodes look like. The family emits logical state only — a node
 * that is short of its number, has it, or holds too many; a line drawn, doubled or previewed — and a skin
 * decides the pixels (docs/instructions/puzzle-screens.md §2).
 *
 * The same rule holds in every one of them, and it is the accessibility floor rather than a style note: the
 * three node states differ in **fill and outline**, not only in hue, and a node that has its count always
 * reads as the one that lit up. A skin the family does not have falls back to `default` silently.
 */
export type Skin = {
  /**
   * Which place this is, as its own name.
   *
   * Carried so anything that has to SAY what the room is can ask the skin — the goal sentence above the
   * rules, for one (`puzzle-screens.md` §2). Deliberately absent from the `night` overlays: a causeway
   * after dark is still a causeway, so the ambience never renames the place.
   */
  name: string
  /** The board itself — background and frame. */
  board: string
  /** Far-off specks behind the board: stars, silt, whatever the place is made of. Empty = none. */
  backdrop: string
  /** A line already drawn, and a line the drag is about to add. */
  line: string
  pending: string
  /** The glow a line carries, as a Tailwind drop-shadow. */
  lineGlow: string
  /** A node short of its count, one that has it, and one holding too many. */
  unlit: string
  lit: string
  over: string
  /** Drawn out of a node — a place whose nodes are things that grow says so. */
  Glyph?: FC<{ grown: boolean; flowering?: boolean }>
  /** The glyph's own colour, short of its count and once it has it. A glyph inheriting the node's text
   *  colour came out the colour of stone, which is the one thing a plant must not be. */
  glyphUnlit?: string
  glyphLit?: string
  /** What this place looks like after dark, as an overlay on itself. Only what changes: the ground and its
   *  frame, mostly. A causeway at night is still a causeway. */
  /**
   * What each hour changes about this place, and nothing more.
   *
   * Keyed by the ambience so a second one — dusk, a sandstorm — is a key rather than a rewrite, and read
   * by `withAmbience` after the role has decided which place this is (`app/faceFor.ts`). A face with
   * nothing to say about the hour leaves it out: the default sky IS night, so it has no entry.
   */
  ambience?: Record<string, Partial<Skin>>
  /** What a node wears for its turn in the completion run, and it is a per-skin choice rather than one
   *  house style: a STAR swelling as it brightens reads as catching the light, and the same swell on a basin
   *  — a thing rooted in the ground, with a plant growing out of it — reads as the board twitching. So the
   *  sky blooms and the places on the earth only flare (see index.css). */
  celebrate: string
}

const SKINS: Record<string, Skin> = {
  // The night sky. Stars burn once they have their light; the unlit ones are quiet and readable.
  default: {
    name: "default",
    board: "bg-[radial-gradient(ellipse_at_50%_15%,#16204a_0%,#0a0f24_45%,#04060f_100%)] ring-1 ring-indigo-300/15",
    backdrop: "fill-slate-200",
    line: "stroke-amber-100",
    pending: "stroke-amber-100/40",
    lineGlow: "drop-shadow-[0_0_2px_rgb(254_243_199_/_0.7)]",
    unlit: "border-slate-300/40 bg-radial from-slate-800/60 to-indigo-950/80 text-amber-50",
    lit: "border-amber-100 bg-radial from-amber-100/70 to-amber-200/20 text-amber-950 shadow-[0_0_18px_5px_rgb(254_243_199_/_0.45)]",
    over: "border-red-400/80 bg-radial from-red-500/35 to-red-950/70 text-red-300 shadow-[0_0_10px_2px_rgb(248_113_113_/_0.35)]",
    // Stars twinkle, size and all: a star is a point of light, so a swell IS the reading.
    celebrate: "animate-bloom",
    // The default sky IS night, so there is nothing for the ambience to change.
  },
  // **Basins and channels** (PUZZLE_FAMILIES.md §11.1, Water & Nile). The rules read straight across: a
  // number is how many channels a basin feeds, no crossing is channels that cannot cross, and one group is
  // one network watering every field. A dry basin is a stone ring; a fed one holds water.
  irrigation: {
    name: "irrigation",
    // **Daylight on sand**, which is the deliberate opposite of the night sky the same board wears by
    // default: a waterworks is a thing you dig under the sun. Everything else follows from the board being
    // LIGHT — the water is deep enough to read against it, and the numbers are dark rather than pale.
    board: "bg-[radial-gradient(ellipse_at_50%_20%,#ecd9ad_0%,#dcc088_45%,#c5a86c_100%)] ring-1 ring-amber-900/25",
    // Silt and grit rather than far-off stars.
    backdrop: "fill-amber-900/25",
    line: "stroke-sky-700",
    pending: "stroke-sky-700/40",
    // A shadow rather than a glow: light does not bloom on a sunlit board, it casts.
    lineGlow: "drop-shadow-[0_1px_1px_rgb(120_53_15_/_0.35)]",
    // A dry basin is cut stone; a fed one is water you can see the depth of.
    unlit: "border-stone-600/70 bg-radial from-stone-200/90 to-stone-400/70 text-stone-800",
    lit: "border-sky-800 bg-radial from-sky-400/95 to-sky-600/80 text-sky-950 shadow-[0_0_14px_3px_rgb(3_105_161_/_0.35)]",
    over: "border-red-800 bg-radial from-red-300/90 to-red-500/70 text-red-950 shadow-[0_0_10px_2px_rgb(153_27_27_/_0.3)]",
    // Light only. A basin cannot swell, and the plant growing out of it is what the run really says — the
    // flower is the animation here, and the glyph does that part.
    celebrate: "animate-flare",
    Glyph: Plant,
    glyphUnlit: "text-lime-600",
    glyphLit: "text-lime-500",
    // The delta after dark: the sand goes cold and the water goes deep, and the plants keep their green
    // because a field at night is still a field.
    ambience: {
      night: {
        board:
          "bg-[radial-gradient(ellipse_at_50%_20%,#4a4433_0%,#2b291f_45%,#171613_100%)] ring-1 ring-emerald-200/15",
        backdrop: "fill-emerald-100/30",
        unlit: "border-stone-400/50 bg-radial from-stone-700/70 to-stone-950/80 text-stone-100",
        lit: "border-sky-300 bg-radial from-sky-500/60 to-sky-800/70 text-sky-50 shadow-[0_0_14px_3px_rgb(56_189_248_/_0.3)]",
      },
    },
  },
  // **Junctions and haul roads** (§11.1, Logistics / Caravan). A number is how many roads meet a site, and
  // the network has to reach every one of them. A bare stake is a junction nobody has paved yet; a served one
  // is finished stone. Daylight rather than night, so the lines read as limestone rather than light.
  causeway: {
    name: "causeway",
    // Sand, like the delta — a building site is outdoors too — but drier and greyer, so the two daylight
    // skins do not read as the same place. What tells them apart is what stands on them: basins and plants
    // there, staked-out pyramids here, water against packed road.
    board: "bg-[radial-gradient(ellipse_at_50%_20%,#ded3b6_0%,#c8bb98_45%,#ada078_100%)] ring-1 ring-stone-800/25",
    // Dust and chippings.
    backdrop: "fill-stone-800/20",
    // A haul road is packed rubble: darker than the sand it crosses, which is the only way it reads on it.
    line: "stroke-stone-700",
    pending: "stroke-stone-700/40",
    lineGlow: "drop-shadow-[0_1px_1px_rgb(41_37_36_/_0.35)]",
    // An unserved site is bare ground; a served one is finished stone.
    unlit: "border-stone-700/60 bg-radial from-amber-100/80 to-amber-200/50 text-stone-800",
    lit: "border-stone-800 bg-radial from-stone-100/95 to-stone-300/80 text-stone-900 shadow-[0_0_12px_3px_rgb(68_64_60_/_0.25)]",
    over: "border-red-800 bg-radial from-red-300/90 to-red-500/70 text-red-950 shadow-[0_0_10px_2px_rgb(153_27_27_/_0.3)]",
    // Light only, for the same reason as the basin: a junction is a place, and places do not pulse. The
    // last stone going in catches the sun instead.
    celebrate: "animate-flare",
    Glyph: Pyramid,
    glyphUnlit: "text-stone-700",
    glyphLit: "text-stone-800",
    // A causeway at night: the ground goes blue-grey and the finished stone catches moonlight instead of sun.
    ambience: {
      night: {
        // Warm, not neutral: the sand is still under there. Drawn cold, the same board stopped reading as
        // the same place after dark, which is the one thing an ambience overlay must not do.
        board: "bg-[radial-gradient(ellipse_at_50%_20%,#3a3226_0%,#241f17_45%,#14110c_100%)] ring-1 ring-amber-100/15",
        backdrop: "fill-stone-200/25",
        line: "stroke-stone-400",
        pending: "stroke-stone-400/40",
        unlit: "border-stone-400/50 bg-radial from-stone-700/70 to-stone-950/80 text-stone-100",
        lit: "border-stone-200 bg-radial from-stone-300/80 to-stone-500/50 text-stone-950 shadow-[0_0_12px_3px_rgb(214_211_209_/_0.3)]",
        glyphUnlit: "text-stone-200",
        glyphLit: "text-stone-100",
      },
    },
  },
  // **A painted ceiling** (PUZZLE_FAMILIES.md §11.1, Tomb / Burial Logic). The same board read as the
  // starred sky over a burial chamber: the stars are pigment, and the lines are cords of gold leaf tying
  // them into one figure. Nefertari's is the ceiling this is drawn from, which is also what journeys.md §7
  // records master_4 asking for — a fresco in queen's blue.
  //
  // **The nearest face to the default, and that is the risk.** Both are a sky full of stars, so what has to
  // separate them is MATERIAL: the default is depth, a gradient falling away into black with stars burning
  // in it, and this is a surface — flat plaster, a wall an arm's length overhead, with pigment sitting on
  // it. Drawn as another gradient the two became the same room, so this one is flat.
  ceiling: {
    name: "ceiling",
    // Egyptian blue laid on plaster, and flat on purpose: see above. The frame is the chamber's own edge.
    board: "bg-[#1b2a6b] ring-1 ring-amber-200/25",
    // Not stars behind the board — there is no behind. The specks are the plaster's own grain.
    backdrop: "fill-amber-100/15",
    // A cord of gold leaf: warmer and more solid than a line of light, because it is a thing laid on a
    // wall rather than something shining through.
    line: "stroke-amber-300",
    pending: "stroke-amber-300/40",
    // Leaf catches lamplight, it does not glow — so a tight highlight rather than the default's halo.
    lineGlow: "drop-shadow-[0_1px_1px_rgb(69_26_3_/_0.55)]",
    // An unpainted star is scored into the plaster; a painted one is gilded.
    unlit: "border-amber-200/40 bg-[#16225a] text-amber-100",
    lit: "border-amber-200 bg-radial from-amber-200/90 to-amber-400/60 text-amber-950 shadow-[0_0_12px_3px_rgb(253_230_138_/_0.35)]",
    over: "border-red-400/80 bg-radial from-red-500/35 to-red-950/70 text-red-200 shadow-[0_0_10px_2px_rgb(248_113_113_/_0.35)]",
    // **Flare, not bloom**, and the existing rule decides it rather than taste: a star swells because a
    // point of light can, and a thing rooted in the ground only brightens. Pigment on plaster is the second
    // kind — a painted star that swelled would read as the wall moving.
    celebrate: "animate-flare",
    // No `night` overlay, for the same reason the default sky has none: a burial chamber has no hour. This
    // ceiling is only ever seen by the lamp somebody carried in, so there is nothing for the ambience to
    // change.
  },
}

/**
 * Which place this room is, resolved the same way every family resolves it (`app/faceFor.ts`).
 *
 * The map itself lives on this family's `FamilyMeta`, where world-gen can read it too
 * (`docs/instructions/puzzle-screens.md` §2).
 */
export const skinFor = (role: string | string[] | undefined, theme: string | undefined, board = 0): Skin =>
  withAmbience(SKINS[faceFor(CONSTELLATION_META.faces, role, theme, Object.keys(SKINS), board)] ?? SKINS.default, theme)
