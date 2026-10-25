import type { Reaction } from "@/app/reactions/reactionContributions"
import { STORY_BEATS } from "./storyBeats"

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

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const solvedBeat = (reaction: Extract<Reaction, { kind: "solved" }>): string | undefined => {
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

const candidates = (reaction: Reaction): (string | undefined)[] => {
  switch (reaction.kind) {
    case "siteArrived":
      if (reaction.exterior === "caveMouth") return [`cave.${reaction.journeyId}`]
      if (reaction.exterior === "cavern") return [`cavern.${reaction.journeyId}`]
      return []
    case "exitReached":
      return reaction.exterior === "caveMouth" ? [`pillar.${reaction.journeyId}`] : []
    // A tomb's afterword is what somebody says once the whole tomb is behind them; the cave's exit
    // is only its first level.
    case "siteLeft":
      return reaction.lastLevel ? [ON_LEAVING[reaction.journeyId]] : []
    case "solved":
      return [solvedBeat(reaction)]
    case "homeShown":
      return [
        "camp.firstHome",
        reaction.tags.includes("trap.mended") ? "camp.rested" : undefined,
        reaction.tags.includes("camp.structureDone") ? "camp.structureDone" : undefined,
        reaction.tags.includes("camp.found") ? "camp.firstFind" : undefined,
        reaction.arrived ? (reaction.arrived.haul ? "camp.homeHaul" : "camp.homeEmpty") : undefined,
      ]
    case "chapterOpened":
      return [`camp.chapter${capitalised(reaction.tier)}`]
  }
}

/**
 * The beats a moment could play, in the order they should be offered; the rail plays the first one
 * the player has not heard, so one moment never says two things.
 *
 * Only declared beats come back: a scene that is written but not in `declared` stays silent.
 */
export const beatsFor = (reaction: Reaction, declared: ReadonlySet<string> = STORY_BEATS): string[] =>
  candidates(reaction).filter((id): id is string => id !== undefined && declared.has(id))
