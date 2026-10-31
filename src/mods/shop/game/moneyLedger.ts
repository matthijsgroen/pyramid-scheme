import type { TreasureReward } from "@/worldGen/types"
import type { Ground } from "@/worldGen/grounds"

// One row per ground a player can stand in (grounds.ts): the money lying in it against the price of everything its
// shops sell. A ground whose margin is negative is one where a player can spend the money a key still needs.

export type MoneyRow = {
  /** The key pieces bought to stand in the ground, or "nothing". */
  label: string
  income: number
  buyable: number
  margin: number
}

/** A reward as a person reads it: a purchase by its id, anything else by its type and its names. */
export const rewardName = (reward: TreasureReward): string => {
  if (reward.type === "purchase" && typeof reward.id === "string") return reward.id
  const names = Object.entries(reward)
    .filter(([field, value]) => field !== "type" && (typeof value === "string" || typeof value === "number"))
    .map(([, value]) => String(value))
  return [reward.type, ...names].join(" ")
}

const sum = (rewards: readonly TreasureReward[], worth: (reward: TreasureReward) => number): number =>
  rewards.reduce((total, reward) => total + worth(reward), 0)

export const moneyLedger = (
  grounds: readonly Ground[],
  priceFor: (reward: TreasureReward) => number,
  incomeOf: (reward: TreasureReward) => number
): MoneyRow[] =>
  grounds.map(ground => {
    const income = sum(ground.rewards, incomeOf)
    const buyable = sum(ground.stock, priceFor)
    return {
      label: ground.bought.length === 0 ? "nothing" : ground.bought.map(rewardName).join(", "),
      income,
      buyable,
      margin: income - buyable,
    }
  })
