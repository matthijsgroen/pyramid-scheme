/**
 * Which of a family's faces a room wears, out of the two things it is told (`puzzle-screens.md` §2).
 *
 * **One resolver for every family**, where there used to be six near-identical copies. They differed only
 * in ways nobody meant them to: one filtered `night` and another did not, one let a role that maps to the
 * default cancel the roles behind it. The rules are the same for everyone, so they live in one place.
 */
/**
 * How often a room nobody dressed wears one of its family's other faces anyway.
 *
 * The plain face stays what a player expects and the rest are the rooms that stand out — a third is
 * where that reads as a world with more than one kind of room in it rather than as a board that cannot
 * make its mind up.
 */
const ONE_IN = 3

/** A number from a room's address. Any spread will do; what matters is that the same room lands it again. */
const hashOf = (room: string): number => {
  let hash = 2166136261
  for (let at = 0; at < room.length; at++) {
    hash ^= room.charCodeAt(at)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const faceFor = (
  /** The family's role map, from its `FamilyMeta.faces`. */
  faces: Record<string, string[]> | undefined,
  /** The pool this room was allocated for. A list is a union the allocator drew from. */
  role: string | string[] | undefined,
  /** The hour its site authored — never a face name, except from the lab (see below). */
  theme: string | undefined,
  /** The face ids this family actually has, so a name it has never heard of falls through. */
  known: readonly string[],
  /** Any number stable for this room, where a role names several faces. The board's own shape will do. */
  board = 0,
  /** Which room this is (`FamilyContext.address`), which is what an undressed room's face is drawn on. */
  room?: string
): string => {
  // **A theme naming one of this family's own faces wins outright**, which is what makes every face
  // reachable in the puzzle lab, where only a theme can be picked. It is the lab's affordance and not an
  // authoring path (journeys.md §2), so `default` is read as silence rather than as a name.
  if (theme !== undefined && theme !== "default" && known.includes(theme)) return theme

  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]
  const offered = roles
    .map(each => (faces?.[each] ?? []).filter(face => known.includes(face)))
    .filter(candidates => candidates.length > 0)

  // **A role with a face of its own beats one that only answers `default`, and that is a choice BETWEEN
  // roles rather than within one.** Declaring `default` says "I read as this place already", which is the
  // weaker claim — so `["sky", "water"]` draws a waterworks rather than letting sky's default cancel it.
  //
  // Within a single role every entry is a real place that role names, default included: `agriculture` is
  // the granary AND the water that goes on the fields, and dropping the second would narrow the word.
  const chosen = offered.find(candidates => candidates.some(face => face !== "default")) ?? offered[0]
  if (chosen !== undefined) return chosen[Math.abs(board) % chosen.length]

  // **Nobody said what this room is, so one room in three says it for itself.** A face is a place and
  // places do not only exist where a journey asked for one — a family carrying a scriptorium and never
  // authored into a scribe room would otherwise draw its plain board forever. Drawn on the ROOM, so the
  // same room is the same place on every device and after every reload, and a role that names a face is
  // never overruled: this is only ever reached where nothing was said at all.
  const spare = known.filter(face => face !== "default")
  if (room === undefined || spare.length === 0) return "default"
  const roll = hashOf(room)
  return roll % ONE_IN === 0 ? spare[(roll >>> 8) % spare.length] : "default"
}

/**
 * The hour, laid over the place rather than replacing it (`puzzle-screens.md` §2).
 *
 * **A face declares what an ambience changes about it, and nothing else has to know.** A causeway at night
 * is still a causeway: the overlay carries only the ground and what stands on it, so the identity the role
 * picked survives. A face with nothing to say about the hour says nothing, which is why a granary at night
 * is simply a granary.
 *
 * This is what replaced six `UNSPOKEN` lists filtering `night` out of a face lookup it should never have
 * entered — the ambience never went near that lookup; it belongs here, after the place is decided.
 */
export const withAmbience = <T extends object>(skin: T, theme: string | undefined): T => {
  if (theme === undefined) return skin
  const overlay = (skin as { ambience?: Record<string, Partial<T>> }).ambience?.[theme]
  return overlay === undefined ? skin : { ...skin, ...overlay }
}
