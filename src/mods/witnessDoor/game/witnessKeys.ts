/** Which of a witness door's two shrines a key belongs to. */
export type WitnessShrine = "east" | "north"

export const WITNESS_SHRINES: readonly WitnessShrine[] = ["east", "north"]

/**
 * The key a shrine mints. Keyed by site as well as shrine, so two doors on the same floor never open
 * each other's branch.
 */
export const witnessKeyId = (site: string, shrine: WitnessShrine): string => `witness:${site}:${shrine}`

/**
 * The floor a witness door and the fork it opens both stand on — what its keys are filed under, and what
 * an author writes into the gate that consumes one.
 *
 * The level is deliberately not part of it: a tomb re-enters one authored site every level, and an
 * authored key id has to name the door once rather than once per visit.
 */
export const witnessSite = (journeyId: string, floorIndex: number): string => `${journeyId}#${floorIndex}`
