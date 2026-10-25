import type { Reaction } from "@/app/reactions/reactionContributions"
import type { Difficulty } from "@/data/difficultyLevels"
import { journeys } from "@/data/journeys"

/**
 * The animals Fez sells, by the id their draft beats carry (`animal.bought<id>`), with the held fact that says
 * the player has bought one. The story names the facts as plain strings and imports neither the shop that holds
 * them nor the camp that shows the animal. `needed` is whether any gate asks for it; the banner opens nothing.
 */
export const ANIMALS: readonly { id: string; fact: string; needed: boolean }[] = [
  { id: "Donkey", fact: "purchase:donkey", needed: true },
  { id: "Cart", fact: "purchase:cart", needed: true },
  { id: "Camel", fact: "purchase:camel", needed: true },
  { id: "SecondDonkey", fact: "purchase:secondDonkey", needed: true },
  { id: "SecondCamel", fact: "purchase:secondCamel", needed: true },
  { id: "SturdyCart", fact: "purchase:sturdyCart", needed: true },
  { id: "CaravanBanner", fact: "purchase:caravanBanner", needed: false },
]

/** The tag the home carries for an animal that has come to stand in the camp. */
export const arrivedTag = (fact: string) => `camp.arrived:${fact}`

type Gate = { tier: Difficulty } | { journeyId: string }

/** What the game says at the moment: the facts held, the needs on a gate and the tier a journey belongs to. */
export type AnimalWorld = {
  held: ReadonlySet<string>
  needsOn: (gate: Gate) => readonly { key: string }[]
  tierOf?: (journeyId: string) => Difficulty | undefined
}

const tierOfJourney = (journeyId: string) => journeys.find(journey => journey.id === journeyId)?.difficulty

/** The beats for facts that became held, in the animals' order. */
export const boughtBeats = (before: ReadonlySet<string>, now: ReadonlySet<string>): string[] =>
  ANIMALS.filter(({ fact }) => now.has(fact) && !before.has(fact)).map(({ id }) => `animal.bought${id}`)

/**
 * The animal beats a moment could play: entering a journey whose tier or own gate asked for a purchase now held,
 * and coming home to an animal that has arrived. Only declared beats come back.
 */
export const animalBeatsFor = (reaction: Reaction, world: AnimalWorld, declared: ReadonlySet<string>): string[] => {
  const { held, needsOn, tierOf = tierOfJourney } = world
  const ids = (): string[] => {
    switch (reaction.kind) {
      case "siteArrived": {
        const tier = tierOf(reaction.journeyId)
        const gates: Gate[] = [{ journeyId: reaction.journeyId }, ...(tier ? [{ tier }] : [])]
        return ANIMALS.filter(
          ({ fact, needed }) =>
            needed && held.has(fact) && gates.some(gate => needsOn(gate).some(need => need.key === fact))
        ).map(({ id }) => `animal.through${id}`)
      }
      case "homeShown":
        return reaction.arrived
          ? ANIMALS.filter(({ fact }) => reaction.tags.includes(arrivedTag(fact))).map(
              ({ id }) => `animal.arrives${id}`
            )
          : []
      default:
        return []
    }
  }
  return ids().filter(id => declared.has(id))
}
