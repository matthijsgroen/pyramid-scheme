import type { TreasureReward } from "@/game/siteTypes"

// How a mod plugs into reward claiming without core knowing the mod exists. A contribution is a
// HOOK (so it can read the mod's own state, e.g. useTrapProgress) returning:
//   - effects: what to do when a reward of a given type is claimed (the mod owns the state write)
//   - canAccept: whether a reward can be taken right now (e.g. a full consumable pack refuses one)
// Core merges every registered contribution and dispatches by reward type — it never names a mod
// or threads mod-specific state into the reward context. See docs/mods/app-plugins-design.md.
export type RewardContribution = {
  effects?: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>>
  canAccept?: (reward: TreasureReward) => boolean
}

export type UseRewardContribution = () => RewardContribution

const registry: UseRewardContribution[] = []

export const registerRewardContribution = (useContribution: UseRewardContribution) => registry.push(useContribution)

export type MergedRewardContributions = {
  effects: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>>
  canAccept: (reward: TreasureReward) => boolean
}

// Merges every registered contribution. Calls each contribution hook in a fixed order (the
// registry is populated once at module load, so the call order is stable — rules-of-hooks safe).
export const useMergedRewardContributions = (): MergedRewardContributions => {
  const effects: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>> = {}
  const accepts: Array<(reward: TreasureReward) => boolean> = []
  for (const useContribution of registry) {
    // Safe despite the loop: `registry` is populated once at module load (each mod's app
    // entrypoint pushes exactly once) and never mutated, so the hooks run in the same order
    // every render — the invariant rules-of-hooks actually protects. See app-plugins-design.md.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const c = useContribution()
    Object.assign(effects, c.effects)
    if (c.canAccept) accepts.push(c.canAccept)
  }
  return {
    effects,
    canAccept: reward => accepts.every(fn => fn(reward)),
  }
}
