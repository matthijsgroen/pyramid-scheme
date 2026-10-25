import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { registerHomecoming } from "@/app/homecomingRegistry"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { registerCampFoundSource } from "@/app/home/campFoundSource"
import { registerHaulLines } from "@/app/home/haulLines"
import { registerHomeTags } from "@/app/home/homeTags"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { registerCampRewardDisplay } from "./rewardDisplay"
import { useCampRewardContribution } from "./rewardContribution"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"
import { useCampHaulLines } from "./haulLines"
import { useCampHomeTags } from "./homeTags"
import { CampCollectionSection } from "./CampCollectionSection"
import { useCampTab } from "./collectionTab"
import { useCampProgress } from "./useCampProgress"

// The camp's app-side registrations, self-gated on the mod being enabled:
// - the reward schemas, display and claim effects for finds and parts,
// - the homecoming: each time the player comes home, what was bought (a held purchase fact) arrives and the camp
//   grows one stage,
// - the home: what the camp has found, how a find or part brought home reads in the haul, and whether
//   anything has been found or a structure stands,
// - the Collection section listing the started structures.
if (isModEnabled("camp")) {
  registerRewardSchema("campFind", campFindRewardSchema)
  registerRewardSchema("campPart", campPartRewardSchema)
  registerCampRewardDisplay()
  registerRewardContribution(useCampRewardContribution)
  registerHomecoming(() => {
    const held = useMergedHeldKeys()
    const { comeHome } = useCampProgress()
    return () => void comeHome(held)
  })
  registerCampFoundSource(() => useCampProgress().found)
  registerHaulLines(useCampHaulLines)
  registerHomeTags(() => useCampHomeTags())
  registerCollectionSection({ id: "camp", order: 40, Component: CampCollectionSection, useTab: useCampTab })
}
