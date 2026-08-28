/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * The family emits logical state only — how full each canister is, which one is held, which pour the hint
 * names — and a skin decides the pixels (`docs/instructions/puzzle-screens.md` §2).
 */
export type CanistersSkin = {
  /**
   * Which place this is, as its own name. Carried so anything that has to SAY what the room is can ask
   * the skin: the title over the board and the goal above the rules.
   */
  name: string
  /** The ground the canisters stand on. */
  board: string
  /** The vessel's own outline, and the outline of the one the player has picked up. */
  outline: string
  held: string
  /** What is in it, and what is in it during the completion run. */
  liquid: string
  measured: string
  /**
   * Laid over the water where the amount is withheld, so it reads as "some, and not saying" rather than as
   * a level that happens to sit halfway.
   */
  uncertain: string
  /**
   * The number written under each canister.
   *
   * **Its own colour, because it is the one thing on this board that must never be hard to read.** Drawn
   * inside the vessel it disappeared against an empty one; it belongs under the shape, in ink of its own.
   */
  label: string
  /** The hint's own mark, which is never one of the board's own colours. */
  lit: string
}

/** **The river.** Reed-green vessels on silt, and Nile water in them. */
const river: CanistersSkin = {
  name: "default",
  board: "bg-gradient-to-b from-stone-800 to-stone-900 ring-1 ring-emerald-900/40",
  outline: "stroke-amber-200/70",
  held: "stroke-amber-300",
  liquid: "fill-sky-600",
  measured: "fill-emerald-400",
  uncertain: "[fill:repeating-linear-gradient(45deg,transparent_0_4px,rgb(255_255_255_/_0.18)_4px_8px)] opacity-60",
  label: "text-amber-100",
  lit: "ring-2 ring-rose-300",
}

const SKINS: Record<string, CanistersSkin> = { default: river }

/**
 * Which place a room is, out of the two things it is told: the **role** it was allocated for and the
 * **ambience** its site authored (`puzzle-screens.md` §2).
 *
 * One face so far. `water` and `agriculture` are the roles this family serves and the river is what both
 * of them look like — a second face is added when a site asks for one, not before.
 */
const ROLE_SKINS: Record<string, string> = {}

/** Names that mean "nothing was said" rather than naming a face. */
const UNSPOKEN = ["default", "night"]

export const skinFor = (role: string | string[] | undefined, theme: string | undefined): CanistersSkin => {
  const named = theme !== undefined && !UNSPOKEN.includes(theme) ? SKINS[theme] : undefined
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  const byRole = roles.map(each => ROLE_SKINS[each]).find(face => face && SKINS[face])
  return named ?? (byRole ? SKINS[byRole] : SKINS.default)
}
