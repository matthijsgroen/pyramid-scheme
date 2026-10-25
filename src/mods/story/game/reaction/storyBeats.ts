import { DRAFT_BEATS } from "../drafts"

/** The bond beats beatFor can produce; `bond.master` waits on the offering arc, which is not built. */
const BOND_BEATS = ["bond.starter", "bond.starterTomb", "bond.junior", "bond.expert", "bond.wizard"]

/**
 * Every beat the rail may play: the drafted tomb, camp and structure beats, and the bond beats.
 *
 * A beat written but not listed here stays silent, which is how the animal scenes wait for their
 * seams (WAITING_BEATS); listing it is the whole of wiring it.
 */
export const STORY_BEATS: ReadonlySet<string> = new Set([
  ...DRAFT_BEATS.tombs,
  ...DRAFT_BEATS.camp,
  ...DRAFT_BEATS.structures,
  ...BOND_BEATS,
])
