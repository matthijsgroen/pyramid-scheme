import type { Glyph } from "@/mods/puzzle/game/balanceScale/techniques"

/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * **The face here is the SYMBOLS**, which is unusual and is what makes it cheap. The unknowns on this board
 * are the pieces whose weight the player is solving for, and `generateBalance.ts` says the thing that
 * matters about them: _"Weights whose value is not written on them. Any distinguishable set works — the
 * solver never reads a glyph, it only cares that the same one weighs the same everywhere."_ So a glyph is
 * an identity and the symbol standing for it is presentation, exactly as a sudoku value is a position and
 * the sign drawn for it is the skin's call (`docs/instructions/puzzle-screens.md` §2).
 *
 * Which is why weighing a heart against a feather needs no new rule: it is this family's own mechanic with
 * its unknowns renamed. `PUZZLE_FAMILIES.md` titles it "§4.2 Balance scale (weighing of the heart)", so the
 * funerary reading is what the family was before `trade` was attached to it.
 *
 * ponytail: the GROUND is not skinned — the board's stone-and-amber stays hardcoded in `BalanceBoard.tsx`.
 * A judgement hall is cut stone, so the default ground is already right for both places, and tokenizing ten
 * render sites would buy nothing here. Add a ground when a face wants one that differs.
 */
export type BalanceSkin = {
  /**
   * Which place this is, as its own name.
   *
   * Carried so anything that has to SAY what the room is can ask the skin: the title over the board and the
   * goal above the rules are both keyed on it.
   */
  name: string
  /**
   * The symbol drawn for an unknown. Total by construction — a glyph this face has no symbol for is drawn
   * as itself, so a face can never blank a piece the player has to tell apart.
   */
  symbol: (glyph: Glyph) => string
}

/** The pieces as the generator hands them over: its own pool, drawn as itself. */
const scale: BalanceSkin = {
  name: "default",
  symbol: glyph => glyph,
}

/**
 * **The weighing of the heart.** The heart of the dead is set against the feather of truth, and the pans
 * settle or they do not — which is this board, unaltered. The other four unknowns are what stands around
 * that scene: the canopic jar, the scarab of rebirth, the serpent, and the scorpion that guards the dead.
 *
 * Picked for **silhouette** first, the way sudoku picks its signs: telling one piece from another at a
 * sixth of a phone screen is the mechanic, so six variations on a seated figure would be authentic and
 * unplayable. And picked to be a **bijection** over the generator's pool — two unknowns sharing a symbol
 * would make a solvable board unsolvable, which is the one way a skin here could break a puzzle.
 *
 * ponytail: emoji, like the pool it replaces. The game ships a subset hieroglyph font, so real signs are
 * the better face — but the heart is Gardiner F34 and nothing in this repo can confirm its code point, and
 * a sign that renders perfectly and is the wrong sign is worse than an emoji that is plainly right. Swap
 * the set here once the code points are confirmed; nothing else has to move.
 */
const SYMBOLS: Record<string, string> = {
  "🪲": "🫀", // the heart, which is the piece the myth is about
  "🏺": "🏺", // a canopic jar, already right
  "🐍": "🐍", // the serpent, already right
  "🦅": "🦂", // the scorpion of Serqet, who guards the dead
  "🐈": "🪲", // the scarab of rebirth, freed by the heart taking its place
  "🪶": "🪶", // the feather of truth, and the whole point of the scene
}

const weighing: BalanceSkin = {
  name: "weighing",
  symbol: glyph => SYMBOLS[glyph] ?? glyph,
}

const SKINS: Record<string, BalanceSkin> = { default: scale, weighing }

/**
 * Which place a room is, out of the two things it is told: the **role** it was allocated for and the
 * **ambience** its site authored (`puzzle-screens.md` §2).
 *
 * The same resolution constellation, hidato, star battle and sudoku use, for the same reason: core hands
 * over both and decides nothing, because any precedence rule core picked would be wrong for some family.
 *
 * **Both funerary roles land on one face.** `judgement` is the narrow place inside the wide `funerary` one
 * (`docs/game-design/journeys.md` §9), and for this family they are the same room — the weighing IS what it
 * does in a tomb. A journey authoring `["judgement", "funerary"]` therefore gets the same board here and a
 * different one from every other family in that pool, which is the point of authoring the pair.
 */
const ROLE_SKINS: Record<string, string> = {
  funerary: "weighing",
  judgement: "weighing",
}

/**
 * Names that mean "nothing was said" rather than naming a face. `default` is in the skin table AND is what a
 * picker shows when no theme is chosen, so it has to be read as silence — otherwise it wins the override
 * below and quietly cancels the role.
 */
const UNSPOKEN = ["default", "night"]

export const skinFor = (role: string | string[] | undefined, theme: string | undefined): BalanceSkin => {
  // A theme naming one of this family's own faces is an explicit override — the lab, and any site that
  // wants a particular dress.
  const named = theme && !UNSPOKEN.includes(theme) ? SKINS[theme] : undefined
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  // A list of roles is a union the allocator drew from, so the first one this family has a face for is the
  // one this room is.
  const byRole = roles.map(each => ROLE_SKINS[each]).find(face => face && SKINS[face])
  return named ?? (byRole ? SKINS[byRole] : SKINS.default)
}
