import type { Difficulty } from "@/data/difficultyLevels"

/**
 * What the player just DID, as opposed to where they are.
 *
 * Arrivals are a place speaking; these are the moves. A mod that wants to respond to how somebody
 * plays — rather than to which door they walked through — registers here and is handed every one.
 *
 * Core names no reaction of its own: it reports the facts the room already had (which family, at
 * what tier, in which journey) plus whatever the family said about the outcome, and never decides
 * that any of it is worth remarking on. Deciding is the listener's job, and so is saying nothing.
 */
export type Reaction =
  | {
      kind: "solved"
      /** The family's own tags, so a listener can tell a trap survived from a board finished. */
      tags: readonly string[]
      /** Finished without spending a hint. Absent from families that do not offer one. */
      unaided?: boolean
      /** Came through with little health left. Absent from families that cost none. */
      close?: boolean
      tier?: Difficulty
      journeyId: string
    }
  | { kind: "siteLeft"; journeyId: string }

/** What a family says about HOW it was beaten, handed back through `onSolved`. */
export type SolveOutcome = { unaided?: boolean; close?: boolean }

export type ReactionListener = (reaction: Reaction) => void
export type UseReactionContribution = () => ReactionListener

const registry: UseReactionContribution[] = []

export const registerReactionContribution = (useContribution: UseReactionContribution) => registry.push(useContribution)

/**
 * Every registered listener as one function. Calls each contribution hook in a fixed order (the
 * registry is populated once at module load, so the call order is stable — rules-of-hooks safe),
 * exactly as `useMergedRewardContributions` does.
 */
export const useMergedReactions = (): ReactionListener => {
  const listeners: ReactionListener[] = []
  for (const useContribution of registry) {
    // Safe despite the loop: `registry` is populated once at module load (each mod's app entrypoint
    // pushes exactly once) and never mutated, so the hooks run in the same order every render.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    listeners.push(useContribution())
  }
  return reaction => listeners.forEach(listen => listen(reaction))
}
