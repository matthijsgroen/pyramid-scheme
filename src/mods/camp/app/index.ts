import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { registerHomecoming } from "@/app/homecomingRegistry"
import { registerCampFoundSource } from "@/app/home/campFoundSource"
import { registerHaulLines } from "@/app/home/haulLines"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { registerCampRewardDisplay } from "./rewardDisplay"
import { useCampRewardContribution } from "./rewardContribution"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"
import { useCampHaulLines } from "./haulLines"
import { CampCollectionSection } from "./CampCollectionSection"
import { useCampTab } from "./collectionTab"
import { useCampProgress } from "./useCampProgress"

// The camp's app-side registrations, self-gated on the mod being enabled:
// - the reward schemas, display and claim effects for finds and parts,
// - the homecoming: the camp grows one stage each time the player comes home,
// - the home: what the camp has found, and how a find or part brought home reads in the haul,
// - the Collection section listing the started structures.
if (isModEnabled("camp")) {
  registerRewardSchema("campFind", campFindRewardSchema)
  registerRewardSchema("campPart", campPartRewardSchema)
  registerCampRewardDisplay()
  registerRewardContribution(useCampRewardContribution)
  registerHomecoming(() => useCampProgress().grow)
  registerCampFoundSource(() => useCampProgress().found)
  registerHaulLines(useCampHaulLines)
  registerCollectionSection({ id: "camp", order: 40, Component: CampCollectionSection, useTab: useCampTab })
}
