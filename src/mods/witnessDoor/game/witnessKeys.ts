/** Which of a witness door's two shrines a key belongs to. */
export type WitnessShrine = "east" | "north"

export const WITNESS_SHRINES: readonly WitnessShrine[] = ["east", "north"]

/**
 * The key a shrine mints. Keyed by site as well as shrine, so two doors on the same floor never open
 * each other's branch.
 */
export const witnessKeyId = (site: string, shrine: WitnessShrine): string => `witness:${site}:${shrine}`
