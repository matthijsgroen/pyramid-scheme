import type { TreasureReward } from "@/game/siteTypes"

// How a mod plugs into reward claiming without core knowing the mod exists. A contribution is a
// HOOK (so it can read the mod's own state, e.g. useTrapProgress) returning:
//   - effects: what to do when a reward of a given type is claimed (the mod owns the state write)
//   - canAccept: whether a reward can be taken right now, else it's refused with a "come back later"
//     popup and remembered as skipped (e.g. a full consumable pack — the player returns with room)
//   - skip: whether to SILENTLY ignore the reward — no popup, no side effect, not remembered (e.g.
//     an already-collected hieroglyph fragment the player re-encounters). Distinct from canAccept:
//     skip means "nothing to do here", canAccept=false means "refused for now, come back".
// Core merges every registered contribution and dispatches by reward type — it never names a mod
// or threads mod-specific state into the reward context. See docs/mods/app-plugins-design.md.
export type RewardContribution = {
  effects?: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>>
  canAccept?: (reward: TreasureReward) => boolean
  skip?: (reward: TreasureReward) => boolean
}

export type UseRewardContribution = () => RewardContribution

const registry: UseRewardContribution[] = []

export const registerRewardContribution = (useContribution: UseRewardContribution) => registry.push(useContribution)

export type MergedRewardContributions = {
  effects: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>>
  canAccept: (reward: TreasureReward) => boolean
  skip: (reward: TreasureReward) => boolean
}

// Fold resolved contributions into one: effects merge by type; a reward is acceptable only if
// EVERY contribution accepts it (any one can refuse-for-now); a reward is skipped if ANY
// contribution silently ignores it. `canAccept` and `skip` are deliberately independent — a
// full pack refuses (come back), an owned fragment skips (nothing to do). Pure, so the
// distinction is testable without the registry/hooks.
export const mergeContributions = (contributions: readonly RewardContribution[]): MergedRewardContributions => {
  const effects: Partial<Record<TreasureReward["type"], (reward: TreasureReward) => void>> = {}
  const accepts: Array<(reward: TreasureReward) => boolean> = []
  const skips: Array<(reward: TreasureReward) => boolean> = []
  for (const c of contributions) {
    Object.assign(effects, c.effects)
    if (c.canAccept) accepts.push(c.canAccept)
    if (c.skip) skips.push(c.skip)
  }
  return {
    effects,
    canAccept: reward => accepts.every(fn => fn(reward)),
    skip: reward => skips.some(fn => fn(reward)),
  }
}

// Merges every registered contribution. Calls each contribution hook in a fixed order (the
// registry is populated once at module load, so the call order is stable — rules-of-hooks safe).
export const useMergedRewardContributions = (): MergedRewardContributions => {
  const resolved: RewardContribution[] = []
  for (const useContribution of registry) {
    // Safe despite the loop: `registry` is populated once at module load (each mod's app
    // entrypoint pushes exactly once) and never mutated, so the hooks run in the same order
    // every render — the invariant rules-of-hooks actually protects. See app-plugins-design.md.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    resolved.push(useContribution())
  }
  return mergeContributions(resolved)
}
