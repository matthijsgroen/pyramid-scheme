/**
 * What each of this mechanic's places looks like, and how a room works out which place it is.
 *
 * The family emits logical state only — how full each vessel is, which one is held, which move the hint
 * names — and a skin decides the pixels (`docs/instructions/puzzle-screens.md` §2).
 */
export type CanistersSkin = {
  /**
   * Which place this is, as its own name. Carried so anything that has to SAY what the room is can ask
   * the skin: the title over the board and the goal above the rules.
   */
  name: string
  /** The ground the vessels stand on. */
  board: string
  /** A vessel's wall, and the wall of the one the player has picked up. */
  vessel: string
  held: string
  /** What is in it, and what is in it once it is the volume that was asked for. */
  liquid: string
  measured: string
  /** Laid over a part-full vessel whose amount is withheld, so it reads as "some, and not saying". */
  uncertain: string
  /** The source the vessels are filled from, and the ground they are emptied onto. */
  source: string
  drain: string
  /** The hint's own mark, which is never one of the board's own colours. */
  lit: string
}

/** **The river.** Reed-green vessels on silt, and Nile water in them. */
const river: CanistersSkin = {
  name: "default",
  board: "bg-gradient-to-b from-stone-800 to-stone-900 ring-1 ring-emerald-900/40",
  vessel: "border-emerald-800/70 bg-stone-950/60",
  held: "border-amber-300 ring-2 ring-amber-300",
  liquid: "bg-gradient-to-t from-sky-800 to-sky-600",
  // The volume that was asked for, standing in the vessel: the one thing on this board worth a glow.
  measured: "bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-[0_0_16px_2px_rgb(52_211_153_/_0.5)]",
  uncertain: "[background-image:repeating-linear-gradient(45deg,transparent_0_4px,rgb(255_255_255_/_0.18)_4px_8px)]",
  source: "text-sky-300",
  drain: "text-stone-400",
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
