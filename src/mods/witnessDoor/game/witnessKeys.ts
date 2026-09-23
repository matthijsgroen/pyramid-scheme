/** Which of a witness door's two shrines a key belongs to. */
export type WitnessShrine = "east" | "north"

export const WITNESS_SHRINES: readonly WitnessShrine[] = ["east", "north"]

/**
 * The key a shrine mints. Keyed by site as well as shrine, so two doors on the same floor never open
 * each other's branch.
 */
export const witnessKeyId = (site: string, shrine: WitnessShrine): string => `witness:${site}:${shrine}`

/**
 * The door's own address — what its keys are filed under, and what an author writes into the gate that
 * consumes one.
 *
 * All three parts earn their place: a journey authors one site per level, so two pyramids of one journey
 * can each hold a door at the same floor index, and an id missing the level would have the second door's
 * fork already open before its board was touched.
 */
export const witnessSite = (journeyId: string, levelNr: number, floorIndex: number): string =>
  `${journeyId}#${levelNr}#${floorIndex}`
