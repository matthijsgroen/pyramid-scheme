/** The realisation kind a gate empty hands alone open is bound under in a `RealisationBinding`. */
export const PASSAGE_KIND = "unladen"

/**
 * How a mod dresses a gate that only empty hands open: a narrow passage. The gate is core's and the walk sees it as
 * a gate whatever is bound; the realisation is what the player is shown and how the crossing is offered.
 */
export type PassageRealisationMeta = {
  id: string
  ownerMod: string
  /** Locale key of the crossing's prompt. */
  prompt: string
  /** The shared tiles (`tiles/default/<key>.png`) the passage is drawn with: the wall across a way running north-south,
   * and along one running east-west. Unset: the passage is drawn as a shut gate. */
  art?: { across: string; along: string }
}

/** Resolves the realisation a passage names; answers nothing for one no registered mod declares, which leaves the
 * gate a plain door. */
export type ResolvePassageRealisation = (id: string | undefined) => PassageRealisationMeta | undefined
