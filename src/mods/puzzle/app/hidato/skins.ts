import type { FC } from "react"
import { Sign, Sprout } from "./glyphs"

/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * The family emits logical state only — a cell is empty, holds a number the puzzle wrote in, holds one the
 * player wrote, and is or is not on the run they have drawn — and a skin decides the pixels
 * (`docs/instructions/puzzle-screens.md` §2).
 */

/** Everything about a cell the skin needs in order to colour it. */
export type CellLook = {
  /** A number the puzzle wrote in, which the player cannot move. */
  given: boolean
  /** Any number at all is standing here. */
  filled: boolean
  /** This cell is on the run drawn from the 1 — the line has got here. */
  reached: boolean
  /** The completion run has counted past it. */
  lit: boolean
}

export type HidatoSkin = {
  /**
   * Which place this is, as its own name.
   *
   * Carried so anything that has to SAY what the room is can ask the skin: the goal above the rules, the
   * rules themselves, and every sentence the hint engine reaches for are all keyed on it.
   */
  name: string
  /** The ground, and the number standing on it. Functions rather than a table: how the four facts above
   *  combine is the skin's own call, and a comb that does not care whether the line has arrived should not
   *  have to invent a state that says so. */
  cell: (look: CellLook) => string
  ink: (look: CellLook) => string
  /** The run the player has drawn, and the part of it the completion light has reached. */
  run: string
  litRun: string
  /** The hint's hatching, the ring it argues from, and the ring on the cell the run is picked up at. */
  hatch: string
  evidence: string
  pen: string
  /**
   * What the completion run leaves on each cell it passes, or nothing where finishing is the light alone.
   *
   * The clock is core's and shared; what it looks like is the skin's entirely (`puzzle-screens.md` §3) —
   * so a skin says what the mark is, how it arrives, and what colour it is in, and the board only places
   * it. A plant grows out of the ground it is rooted in; ink simply appears.
   */
  finish?: {
    /** Drawn in a 24-unit box with its feet on the bottom edge. */
    Mark: FC<{ value: number }>
    /** The animation it arrives with. */
    arrival: string
    ink: string
  }
}

/**
 * **Wax and honey.** The default: a kept hive, where a cell is comb and the run is a thread of honey
 * through it. The line arriving changes nothing about a cell — what the player wrote is what it shows —
 * so `reached` is not asked about at all here.
 */
const hive: HidatoSkin = {
  name: "default",
  cell: ({ given, filled, lit }) =>
    lit
      ? "fill-amber-300 stroke-amber-100"
      : given
        ? "fill-amber-700 stroke-amber-500"
        : filled
          ? "fill-amber-950 stroke-amber-700"
          : "fill-stone-900 stroke-stone-700",
  ink: ({ given, lit }) => (lit ? "fill-amber-950" : given ? "fill-amber-50" : "fill-amber-200"),
  run: "stroke-amber-400",
  litRun: "stroke-amber-100",
  hatch: "stroke-sky-300",
  evidence: "stroke-amber-300",
  pen: "stroke-sky-300",
}

/**
 * **A channel across the flood plain.** The same board read as irrigation: the cells are dry fields, the
 * run is water, and a field the water has reached comes up green.
 *
 * **The green is the whole point of this dress**, and it is why the skin asks about `reached` where the
 * hive does not: on a comb the line is a record of what the player decided, and on a plain it is a thing
 * that DOES something. A number laid in a field the channel has not got to yet is a ditch dug and dry —
 * which is the honest picture, since a stretch that is not joined to the 1 waters nothing.
 */
const channel: HidatoSkin = {
  name: "channel",
  // **A number the puzzle wrote in keeps its bright rim once the water arrives**, and that is not a
  // detail: the green says "the channel got here", which is true of a field the player worked out and of
  // one they were handed alike — so with the ground carrying the whole message, the givens vanished into
  // the crop the moment the line passed through them. The rim is the one part of a cell the water does
  // not touch, so it is what the fixed numbers keep.
  cell: ({ given, filled, reached, lit }) =>
    lit
      ? given
        ? "fill-emerald-500 stroke-amber-200"
        : "fill-emerald-500 stroke-emerald-200"
      : reached
        ? given
          ? "fill-emerald-800 stroke-amber-300"
          : "fill-emerald-800 stroke-emerald-500"
        : given
          ? "fill-amber-700 stroke-amber-300"
          : filled
            ? "fill-amber-800 stroke-amber-600"
            : "fill-amber-900 stroke-amber-700",
  // And its ink stays the colour it was written in, rather than turning the crop's own white.
  ink: ({ given, reached, lit }) =>
    lit ? "fill-emerald-950" : given ? "fill-amber-100" : reached ? "fill-emerald-50" : "fill-amber-100",
  // Blue, because it is water and not a route: the one stroke on this board that is not earth-coloured.
  run: "stroke-sky-400",
  litRun: "stroke-sky-200",
  // A hint speaks in its own colours in every skin — the point of a highlight is that it is NOT the
  // board's own palette, and sand, green and water have taken most of one between them.
  hatch: "stroke-rose-300",
  evidence: "stroke-rose-300",
  pen: "stroke-sky-100",
  finish: { Mark: Sprout, arrival: "animate-sprout", ink: "text-emerald-900" },
}

/**
 * **A scribe's sheet.** The same run read as a line of figures written across papyrus: the ground is the
 * sheet, the run is ink, and nothing about a space changes when the line reaches it — a sheet does not
 * become anything, it is written on.
 *
 * **The numbers the puzzle wrote in are in red**, which is not decoration: a scribe's rubric is exactly
 * this, the fixed and important parts of a text set down in red against the black of the body. It is
 * also the clearest way this skin has of telling the two apart, since the ground carries no message.
 *
 * The one skin that is LIGHT. The hint marks are picked for papyrus rather than for stone, because an
 * amber ring on a pale sheet is an affordance that survives on the other two skins only.
 */
const sheet: HidatoSkin = {
  name: "scribe",
  cell: ({ lit }) => (lit ? "fill-amber-200 stroke-amber-400" : "fill-amber-100 stroke-amber-300"),
  // **The figures are darker than the line they sit on**, which is the other way round from the skins
  // drawn on stone. There the line is the bright thing against a dark board; here both are ink on the
  // same pale sheet, and a stroke as dark as the digits swallowed every number it crossed.
  ink: ({ given }) => (given ? "fill-red-700" : "fill-stone-900"),
  run: "stroke-stone-500",
  litRun: "stroke-stone-600",
  hatch: "stroke-sky-600",
  evidence: "stroke-rose-600",
  pen: "stroke-sky-700",
  finish: { Mark: Sign, arrival: "animate-flower-in", ink: "text-stone-700" },
}

/**
 * **A comb of sealed chambers.** The same board read as a tomb: a cell is a chamber cut out of the rock, and
 * the run is the passage broken through from one to the next (`PUZZLE_FAMILIES.md` §11.1, Tomb / Burial
 * Logic — the reading this family already had there, drawn at last).
 *
 * **The run OPENS a chamber**, which is why this skin asks about `reached` where the hive does not. On a comb
 * the line is a record of what the player decided; in a tomb it is a way in. A number standing in a chamber
 * the passage has not got to is a chamber surveyed and still sealed — the honest picture, since a stretch not
 * joined to the 1 opens nothing.
 *
 * **It moves along temperature rather than into a second hue**, which is the one thing that keeps it apart
 * from the channel. Green says a field was watered; here the ground goes from cold sealed rock to the warm
 * ochre of a chamber somebody has carried a light into. Two skins saying "the run got here" must not say it
 * the same way, or the board stops telling you which place it is.
 */
const chambers: HidatoSkin = {
  name: "chambers",
  // A given is a number the builders cut, so it keeps a pale rim the breaking-through does not touch — the
  // same trick the channel plays with its amber rim, and for the same reason: once the ground carries the
  // whole message, the fixed numbers have nothing left to be told apart by.
  cell: ({ given, filled, reached, lit }) =>
    lit
      ? given
        ? "fill-amber-400 stroke-stone-100"
        : "fill-amber-400 stroke-amber-100"
      : reached
        ? given
          ? "fill-amber-800 stroke-stone-300"
          : "fill-amber-900 stroke-amber-600"
        : given
          ? "fill-stone-700 stroke-stone-400"
          : filled
            ? "fill-stone-800 stroke-stone-600"
            : "fill-stone-900 stroke-stone-700",
  ink: ({ given, reached, lit }) =>
    lit ? "fill-amber-950" : given ? "fill-stone-100" : reached ? "fill-amber-100" : "fill-stone-300",
  // Lamplight carried along the passage: the one warm stroke on a board of cold rock.
  run: "stroke-amber-500",
  litRun: "stroke-amber-200",
  // A hint speaks outside the board's own palette, and stone and lamplight have taken the neutrals and the
  // warms between them.
  hatch: "stroke-sky-300",
  evidence: "stroke-rose-300",
  pen: "stroke-sky-200",
}

const SKINS: Record<string, HidatoSkin> = { default: hive, channel, scribe: sheet, chambers }

/**
 * Which place a room is, out of the two things it is told: the **role** it was allocated for and the
 * **ambience** its site authored (`puzzle-screens.md` §2).
 *
 * The same resolution star battle and constellation use, for the same reason: core hands over both and
 * decides nothing, because any precedence rule core picked would be wrong for some family.
 *
 * Four roles, four places, and each brings its own reasoning about what the board IS: a hive is kept, a
 * plain is watered, a sheet is written on, a tomb is opened.
 */
const ROLE_SKINS: Record<string, string> = {
  water: "channel",
  agriculture: "channel",
  scribe: "scribe",
  funerary: "chambers",
}

/**
 * Names that mean "nothing was said" rather than naming a skin. `default` is in the skin table AND is what a
 * picker shows when no theme is chosen, so it has to be read as silence — otherwise it wins the override
 * below and quietly cancels the role.
 */
const UNSPOKEN = ["default", "night"]

export const skinFor = (role: string | string[] | undefined, theme: string | undefined): HidatoSkin => {
  // A theme naming one of this family's own skins is an explicit override — the lab, and any site that
  // wants a particular dress.
  const named = theme && !UNSPOKEN.includes(theme) ? SKINS[theme] : undefined
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  // A list of roles is a union the allocator drew from, so the first one this family has an identity for is
  // the one this room is.
  const byRole = roles.map(each => ROLE_SKINS[each]).find(skin => skin && SKINS[skin])
  return named ?? (byRole ? SKINS[byRole] : SKINS.default)
}
