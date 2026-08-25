import type { FC } from "react"
import { Figure, Sign } from "./glyphs"

/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * The family emits logical state only — a square is empty, holds a value the puzzle wrote in or one
 * the player wrote, is pencilled with options, repeats a value, is what a hint settles or argues from
 * — and a skin decides the pixels (`docs/instructions/puzzle-screens.md` §2).
 *
 * **What a value LOOKS like is skinned along with the ground, and that is the whole second face.** A
 * value is a position in this family's rules and nothing more: a 4 and a drawn ripple are the same
 * claim about a square, so what a board shows is a skin's decision and not the solver's. The squares,
 * the pencil marks, the pad and every sentence a hint reaches for all ask the skin.
 */
export type SudokuSkin = {
  /**
   * Which place this is, as its own name.
   *
   * Carried so anything that has to SAY what the room is can ask the skin: the name over the board,
   * the goal above the rules, the rules themselves and every hint sentence are keyed on it.
   */
  name: string
  /** What a value looks like standing in a square — a figure cut in, or the sign that means it. */
  Glyph: FC<{ value: number }>
  /**
   * What a SENTENCE puts in its slot when it has to say a value, since a hint is a string and a drawn
   * sign is not. The carved board says "4"; the register says 𓈖, the character the sign next door is
   * drawn from — so a device with no hieroglyph font loses a character out of an optional sentence
   * rather than the board it is about.
   */
  token: (value: number) => string
  /** The ground the grid is ruled on. */
  board: string
  /**
   * The grain of that ground, as a CSS `background-image`, or nothing for a ground with none.
   *
   * Laid on the SQUARES rather than on the board behind them, because the squares cover it — a sheet
   * whose fibre only shows in the margin is a sheet with a coloured rectangle on it.
   */
  grain?: string
  /** A square the player writes in, one the puzzle already wrote, and one showing a value twice. */
  cell: string
  given: string
  conflict: string
  /** The ink each of those three is written in. */
  ink: string
  givenInk: string
  conflictInk: string
  /** A pencilled option, and one a value written elsewhere has since ruled out. */
  note: string
  strandedNote: string
  /**
   * The wash a square wears when it holds the value the player has picked, as a CSS colour.
   *
   * A WASH rather than a ring or a hatch, and that is the whole reason it can exist: the rings and the
   * hatching are the hint's vocabulary and a treatment means one thing (`puzzle-screens.md` §4.2). It
   * is laid over the ground instead of replacing it, so a pre-filled square that is also a twin still
   * reads as the puzzle's own — which is what a colour on the background could not do.
   */
  twin: string
  /** The same answer one step earlier: a pencilled copy of that value, in a square that may still take it. */
  twinNote: string
  /**
   * Where two chambers meet, and where two squares inside one do — **as CSS colours rather than
   * classes, and that is load-bearing.** A Tailwind `border-*` colour sets all four sides at once, so
   * a square with one chamber wall and three seams would paint the seams in the wall's colour too.
   *
   * The wall is not decoration: which six squares are one chamber is half of what this board asks the
   * player to see, and a grid ruled evenly is a Latin square with no chambers in it at all.
   */
  wall: string
  seam: string
  /** The hint's hatching, the ring it argues from, and the square the player has picked. */
  hatch: string
  evidence: string
  focus: string
  /** The pad the values are typed on, which stands on the same ground the board does. */
  pad: {
    key: string
    pencilKey: string
    disabledKey: string
    control: string
    controlOn: string
    controlOff: string
  }
  /** What a value wears for its turn in the completion run (`puzzle-screens.md` §3). */
  celebrate: string
  /**
   * How a chamber of this board is TAKEN UP when the run reaches it, or nothing for a face whose
   * chambers do not roll.
   *
   * Carrying it here is what makes the completion run the skin's and not the family's: a sheet finishes
   * by being rolled and put away, a wall cut with figures finishes by catching the light. So the two
   * faces count different things — a face with a scroll counts CHAMBERS, one without counts VALUES
   * (design doc §9.1) — and both are the same rule said back, each in the half its own ground can say.
   */
  scroll?: {
    /** The roll seen edge-on, as a CSS `background`: a sheet wound on itself has a thickness to draw. */
    roll: string
    /** What that roll casts — up onto the sheet it has not reached, and down into the space it left. */
    shade: string
  }
}

/**
 * The six signs as CHARACTERS, in the order the values 1…6 run and matching what `glyphs.tsx` draws.
 *
 * Only ever put in a sentence — water, the sun, an ankh, a house, a mouth, a feather. The board draws
 * its own (a device without an Egyptian Hieroglyphs font would otherwise show six identical boxes and
 * no puzzle at all), and this list is what a hint says while pointing at one.
 */
const SIGN_CHARACTERS = ["𓈖", "𓇳", "𓋹", "𓉐", "𓂋", "𓆄"] as const

/**
 * **Figures cut into stone.** The default: a dark chamber wall with the answer carved into it, the
 * same ground every other grid family in the catalogue is drawn on, so a player meeting this one
 * after a Sumplete or a Greater-and-Lesser board reads it without being taught anything.
 */
const carved: SudokuSkin = {
  name: "default",
  Glyph: Figure,
  token: value => `${value}`,
  board: "bg-stone-950",
  // Cut stone, drawn flat: every other grid family in the catalogue is a flat dark board, and a
  // texture here would make this one the odd room out rather than the familiar one.
  cell: "bg-stone-800",
  // A pre-filled figure is part of the puzzle, not of the answer — it reads as stone, not as ink.
  given: "bg-stone-700",
  // A repeat has to be loud: a dark wash behind a pale figure is no tell at all on a dark board at
  // arm's length.
  conflict: "bg-red-900",
  ink: "text-stone-100",
  givenInk: "text-amber-200",
  conflictInk: "text-red-100",
  note: "text-sky-300",
  strandedNote: "text-red-400/80 line-through",
  // Cool, where the hint's marks are amber and a repeat is red — the three things a square can be
  // saying at once stay three different colours.
  // Carried at a heavier alpha than the register's, because a dark board swallows a wash: the same
  // lesson the conflict colour learned here, where a dark tint behind a pale figure read as no tell at
  // all at arm's length.
  twin: "rgb(125 211 252 / 0.22)",
  twinNote: "text-sky-200 font-semibold",
  wall: "rgb(214 211 209 / 0.85)",
  seam: "rgb(120 113 108 / 0.55)",
  hatch: "rgba(252,211,77,0.45)",
  evidence: "ring-sky-300/70",
  focus: "ring-sky-300",
  pad: {
    key: "border-stone-500 bg-stone-700 text-stone-100",
    pencilKey: "border-sky-600 bg-sky-950/60 text-sky-200",
    disabledKey: "border-stone-700 bg-stone-900 text-stone-600",
    control: "border-stone-600 bg-stone-800 text-stone-300",
    controlOn: "border-sky-500 bg-sky-900 text-sky-100",
    controlOff: "border-stone-700 bg-stone-900 text-stone-600",
  },
  celebrate: "animate-bloom",
}

/**
 * **Six signs inked across papyrus.** The same board read as a scribe's register: the ground is a
 * sheet, the grid is ruled in reed pen, and what stands in a square is a sign rather than a figure.
 *
 * **The signs the puzzle wrote in are in red**, which is not decoration: a scribe's rubric is exactly
 * this, the fixed and important parts of a text set down in red against the black of the body. It is
 * also the only way this face has of telling the two apart, since the sheet carries no message of its
 * own — a sheet is written on, it does not become anything.
 *
 * The one skin here that is LIGHT, so every mark on it is picked for pale ground rather than for
 * stone: an amber ring that reads as light against a dark chamber is nearly invisible on papyrus, and
 * an affordance that survives on one skin only is not an affordance.
 */
const register: SudokuSkin = {
  name: "papyrus",
  Glyph: Sign,
  token: value => SIGN_CHARACTERS[value - 1],
  board: "bg-[#b99a63]",
  // Pressed reed: strips laid across strips, so the fibre runs both ways and neither reads as a rule
  // the player has to account for. Kept faint — a sheet is what the signs are ON, not something else
  // to look at.
  grain: [
    "repeating-linear-gradient(90deg, rgba(120,83,44,0.10) 0 1px, transparent 1px 5px)",
    "repeating-linear-gradient(0deg, rgba(120,83,44,0.07) 0 1px, transparent 1px 7px)",
  ].join(", "),
  cell: "bg-[#e8d5a6]",
  // A sheet does not change under the rubric, so a written-in sign is told apart by its ink alone —
  // except for the faintest wash, which is what keeps the two readable at a glance on a small screen.
  given: "bg-[#e2ca93]",
  conflict: "bg-[#d99a86]",
  ink: "text-stone-900",
  givenInk: "text-red-800",
  conflictInk: "text-red-950",
  note: "text-sky-900/80",
  strandedNote: "text-red-700/70 line-through",
  // Ink washed over the sheet rather than light thrown on it, and blue rather than another brown: the
  // grain and the hint's hatching have the warm end of this board between them.
  twin: "rgb(7 89 133 / 0.14)",
  twinNote: "text-sky-900 font-semibold",
  // Ruled in the same reed pen the signs are written with: the chamber rules are the heavy strokes a
  // scribe lays down first, the seams the light ones inside them.
  wall: "rgb(87 47 20 / 0.9)",
  seam: "rgb(120 83 44 / 0.4)",
  hatch: "rgba(120,53,15,0.35)",
  evidence: "ring-sky-800/70",
  focus: "ring-sky-800",
  pad: {
    key: "border-[#8a6a3f] bg-[#e8d5a6] text-stone-900",
    pencilKey: "border-sky-800 bg-[#dfe3e8] text-sky-900",
    disabledKey: "border-[#a89772] bg-[#cbb78d] text-stone-600",
    control: "border-[#8a6a3f] bg-[#e2ca93] text-stone-800",
    controlOn: "border-sky-800 bg-[#dfe3e8] text-sky-900",
    controlOff: "border-[#a89772] bg-[#cbb78d] text-stone-600",
  },
  // Ink does not swell as it dries; a sign that grew would read as the sheet moving under it. So the
  // register only brightens, where the carved board blooms.
  celebrate: "animate-flare",
  // Sheet wound on sheet: pale where the light catches the top of the roll, dark underneath, so the band
  // reads as something with a thickness rather than a line ruled across the chamber. The shade is the
  // reed-pen brown the walls are drawn in, at the weight a shadow on a pale sheet can carry.
  scroll: {
    roll: "linear-gradient(180deg, #cbab72 0 12%, #f2e3bb 38%, #d9bf8c 62%, #8a6a3f)",
    shade: "rgb(87 47 20 / 0.35)",
  },
}

const SKINS: Record<string, SudokuSkin> = { default: carved, papyrus: register }

/**
 * Which place a room is, out of the two things it is told: the **role** it was allocated for and the
 * **ambience** its site authored (`puzzle-screens.md` §2).
 *
 * The same resolution star battle, constellation and hidato use, for the same reason: core hands over
 * both and decides nothing, because any precedence rule core picked would be wrong for some family.
 */
const ROLE_SKINS: Record<string, string> = {
  scribe: "papyrus",
}

/**
 * Names that mean "nothing was said" rather than naming a skin. `default` is in the skin table AND is
 * what a picker shows when no theme is chosen, so it has to be read as silence — otherwise it wins
 * the override below and quietly cancels the role.
 */
const UNSPOKEN = ["default", "night"]

export const skinFor = (role: string | string[] | undefined, theme: string | undefined): SudokuSkin => {
  // A theme naming one of this family's own skins is an explicit override — the lab, and any site that
  // wants a particular dress.
  const named = theme && !UNSPOKEN.includes(theme) ? SKINS[theme] : undefined
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  // A list of roles is a union the allocator drew from, so the first one this family has an identity
  // for is the one this room is.
  const byRole = roles.map(each => ROLE_SKINS[each]).find(skin => skin && SKINS[skin])
  return named ?? (byRole ? SKINS[byRole] : SKINS.default)
}
