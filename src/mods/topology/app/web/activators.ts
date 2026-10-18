import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, SubSection, TreasureReward } from "@/game/siteTypes"
import { shippedActivators } from "@/mods/topology/game/web/activator"

/** Every reward a world's authoring holds. */
const rewardsOf = (configs: Record<string, SiteConfig[]>): (TreasureReward | undefined)[] => {
  const ofSection = (section: SubSection): (TreasureReward | undefined)[] => [
    section.endReward,
    ...(section.rewards ?? []),
    ...((section as { sideSections?: SubSection[] }).sideSections ?? []).flatMap(ofSection),
  ]
  return Object.values(configs).flatMap(sites =>
    sites.flatMap(site =>
      site.flatMap(floor => [floor.mainEndReward, ...(floor.rewards ?? []), ...floor.sideSections.flatMap(ofSection)])
    )
  )
}

/** The activators the world ships, with the pots each counts in: what the held keys are derived from. */
export const WORLD_ACTIVATORS = shippedActivators(rewardsOf(generatedWorldConfigs as Record<string, SiteConfig[]>))
