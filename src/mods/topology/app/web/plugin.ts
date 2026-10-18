import { z } from "zod"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, SubSection, TreasureReward } from "@/game/siteTypes"
import { isModEnabled } from "@/mods/registeredMods"
import { shippedActivators, WEB_ACTIVATOR } from "@/mods/topology/game/web/activator"
import { useWebPulled } from "./useWebPulled"

// The sand web in play: an activator taken is pulled for good, and the keys it gives open web doors on every floor.
// The look of a sand lever and a web key is still the plain chest's, until they are drawn.
export const webActivatorSchema = z.object({
  type: z.literal(WEB_ACTIVATOR),
  name: z.string(),
  look: z.enum(["lever", "key"]),
  pots: z.array(z.string()),
})

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

if (isModEnabled("topology")) {
  registerRewardSchema(WEB_ACTIVATOR, webActivatorSchema)
  registerRewardHandler({
    type: WEB_ACTIVATOR,
    emoji: "🏺",
    text: (reward, t) => {
      const { look } = webActivatorSchema.parse(reward)
      return {
        itemName: t(look === "lever" ? "chest.sandLever" : "chest.webKey"),
        itemDescription: t(look === "lever" ? "chest.sandLeverDescription" : "chest.webKeyDescription"),
        icon: "🏺",
      }
    },
  })
  registerRewardContribution(() => {
    const { pull } = useWebPulled(WORLD_ACTIVATORS)
    return { effects: { [WEB_ACTIVATOR]: reward => pull(webActivatorSchema.parse(reward).name) } }
  })
  registerHeldKeysProvider(() => useWebPulled(WORLD_ACTIVATORS).heldKeys)
}
