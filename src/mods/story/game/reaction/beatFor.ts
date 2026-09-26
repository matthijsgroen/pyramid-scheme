import type { Reaction } from "@/app/reactions/reactionContributions"

/**
 * Which bond beat a move is worth, if any.
 *
 * Fez remarking on how somebody plays is the rail most likely to ruin him, so the restraint lives
 * here rather than in the copy: **one beat per move, and nearly every move is worth nothing.**
 * There are five of these in the whole game and each plays once ever — the companion skips a
 * conversation it has already shown, which is what keeps a repeatable trigger from repeating.
 *
 * `bond.master` is absent on purpose. Its trigger is the priest refusing a forgery, which is the
 * offering arc, which is not built (docs/game-design/story-and-time-brainstorm.md).
 */
/**
 * Tombs whose last word is said on the threshold.
 *
 * `starter_treasure_tomb` is Ipi's, and "I came for the resale, and I am saying it while it is
 * still true" is what follows him. `wizard_treasure_tomb_c` is the mural, and refusing to price it
 * is the same sentence answered fifty hours later — so it goes where the script puts it, after the
 * picture rather than after any particular piece of it.
 */
const ON_LEAVING: Record<string, string> = {
  starter_treasure_tomb: "bond.starterTomb",
  wizard_treasure_tomb_c: "bond.wizard",
}

export const beatFor = (reaction: Reaction): string | undefined => {
  // Both bond beats that answer a tomb rather than a move play on the way out of it, because
  // both are what somebody says once the room is behind them.
  if (reaction.kind === "siteLeft") return ON_LEAVING[reaction.journeyId]

  // A trap is not a board, and beating one says something different — so the tag decides which
  // beat a solve can reach, and a trap can never reach the "that was quick" one.
  if (reaction.tags.includes("trap")) return reaction.close ? "bond.expert" : undefined

  if (!reaction.unaided) return undefined
  // He notices the first time at each of the two tiers where noticing means something: the tier
  // where solving one is new, and the tier where he stops being surprised by it.
  if (reaction.tier === "starter") return "bond.starter"
  if (reaction.tier === "junior") return "bond.junior"
  return undefined
}
