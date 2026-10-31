import type { TreasureReward } from "./types"

const identities = new WeakMap<TreasureReward, number>()
let lastIdentity = 0

/** A reward told apart from every other by the object it is, never by its contents: two pieces that read the same
 * stand apart. The sorted identities of a set of rewards name that set. */
export const identitiesOf = (rewards: Iterable<TreasureReward>): number[] =>
  [...rewards]
    .map(reward => {
      const known = identities.get(reward)
      if (known !== undefined) return known
      identities.set(reward, ++lastIdentity)
      return lastIdentity
    })
    .sort((a, b) => a - b)
