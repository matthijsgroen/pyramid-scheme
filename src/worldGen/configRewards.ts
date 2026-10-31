import type { FloorConfig, SiteConfig, SubSection, TreasureReward } from "./types"

// Every reward a world's configs carry, wherever it stands: a floor's puzzle rewards and chest, a side
// section's and a sub-section's puzzle rewards, path end and shop stock. `owner` is the floor or
// section the reward belongs to, so a caller that cares where it lies (a shop's stock, a section's
// tier) reads it there; core attaches no meaning to a reward's type.
export const forEachConfigReward = (
  configs: Record<string, SiteConfig[]>,
  fn: (reward: TreasureReward, owner: FloorConfig | SubSection) => void
): void => {
  const visit = (owner: FloorConfig | SubSection, end: TreasureReward | undefined) => {
    if (end) fn(end, owner)
    for (const reward of owner.rewards ?? []) if (reward) fn(reward, owner)
  }
  for (const sites of Object.values(configs))
    for (const floors of sites)
      for (const floor of floors) {
        visit(floor, floor.mainEndReward)
        for (const side of floor.sideSections) {
          visit(side, side.endReward)
          for (const sub of side.sideSections ?? []) visit(sub, sub.endReward)
        }
      }
}

// Every side section and sub-section, for a mod counting something other than rewards (its own gates).
export const forEachConfigSection = (
  configs: Record<string, SiteConfig[]>,
  fn: (section: SubSection) => void
): void => {
  for (const sites of Object.values(configs))
    for (const floors of sites)
      for (const floor of floors)
        for (const side of floor.sideSections) {
          fn(side)
          for (const sub of side.sideSections ?? []) fn(sub)
        }
}
