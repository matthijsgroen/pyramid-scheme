import { useModState } from "@/app/state/useModState"
import { z } from "zod"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerJourneyCardSlot } from "@/app/pages/journeyCardSlots"
import { registerJourneyContribution } from "@/app/pages/journeyContributions"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { isModEnabled } from "@/mods/registeredMods"
import { WEB_ACTIVATOR } from "@/mods/topology/game/web/activator"
import { buriedLevels } from "@/mods/topology/game/web/buriedLevels"
import { WORLD_ACTIVATORS } from "./activators"
import { useWebPulled } from "./useWebPulled"
import { WebPullCount } from "./WebPullCount"
import { webActivatorArt } from "./webArt"

// The sand web in play: an activator taken is pulled for good, and the keys it gives open web doors on every floor.
// A sand lever and a web key stand in their room as webArt.ts draws them.
export const webActivatorSchema = z.object({
  type: z.literal(WEB_ACTIVATOR),
  name: z.string(),
  look: z.enum(["lever", "key"]),
  pots: z.array(z.string()),
  glyph: z.number().optional(),
})

if (isModEnabled("topology")) {
  registerRewardSchema(WEB_ACTIVATOR, webActivatorSchema)
  registerRewardHandler({
    type: WEB_ACTIVATOR,
    art: reward => webActivatorArt(webActivatorSchema.parse(reward)),
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
  registerHeldKeysProvider(
    () => useWebPulled(WORLD_ACTIVATORS).heldKeys,
    () => useModState("topology", {})[2]
  )
  // A pyramid whose exit waits on sand is buried on the travel map; the journey's card counts the levers pulled.
  registerJourneyContribution(() => {
    const { heldKeys } = useWebPulled(WORLD_ACTIVATORS)
    return { buried: journeyId => buriedLevels(generatedWorldConfigs[journeyId] ?? [], heldKeys) }
  })
  registerJourneyCardSlot({ id: "topology:web-pulls", Component: WebPullCount })
}
