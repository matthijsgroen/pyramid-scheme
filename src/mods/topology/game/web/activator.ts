import type { TreasureReward } from "@/game/siteTypes"
import { potKey, webKey } from "@/game/webLine"
import type { ShippedActivator } from "@/game/webKeys"
import type { WebLook } from "@/game/webNotation"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import type { WebActivatorReward } from "@/worldGen/webPlacement"

// A WEB ACTIVATOR AS A REWARD (docs/instructions/sand-pyramid.md, "Keys open named places"): a sand lever or a web key
// standing in a reward slot, carrying the pots it counts in so play and the solver derive the same keys from it.
export const WEB_ACTIVATOR = "webActivator"

export type WebActivatorShape = { type: typeof WEB_ACTIVATOR; name: string; look: WebLook; pots: string[] }

export const isWebActivator = (reward: TreasureReward | undefined): reward is WebActivatorShape & TreasureReward =>
  reward?.type === WEB_ACTIVATOR && typeof reward.name === "string" && Array.isArray(reward.pots)

export const webActivatorReward: WebActivatorReward = ({ name, look, pots }) => ({
  type: WEB_ACTIVATOR,
  name,
  look,
  pots,
})

/** The counter a pot keeps in the solver: one per lever of it reached. */
const potCounter = (pot: string) => `web:${pot}#`

// THE SOLVER'S READING OF AN ACTIVATOR: it is the key `web:<name>`, and one more lever of each pot it counts in; a pot
// holding n levers holds its first n stops.
export const WEB_REACHABILITY: ReachabilitySupport = {
  bucketForReward: reward => (isWebActivator(reward) ? webKey(reward.name) : undefined),
  alsoHarvests: reward => (isWebActivator(reward) ? reward.pots.map(potCounter) : []),
  factsForCount: (bucket, count) =>
    bucket.startsWith("web:") && bucket.endsWith("#")
      ? Array.from({ length: count }, (_, k) => potKey(bucket.slice("web:".length, -1), k + 1))
      : [],
}

/** Every activator a world's authoring holds, as play derives its keys from them. */
export const shippedActivators = (rewards: Iterable<TreasureReward | undefined>): ShippedActivator[] =>
  [...rewards].flatMap(reward => (isWebActivator(reward) ? [{ name: reward.name, pots: reward.pots }] : []))
