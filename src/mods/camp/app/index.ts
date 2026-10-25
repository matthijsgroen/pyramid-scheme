import { registerHomecoming } from "@/app/homecomingRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { registerCampRewardDisplay } from "./rewardDisplay"
import { useCampRewardContribution } from "./rewardContribution"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"
import { useCampProgress } from "./useCampProgress"

// The camp's app-side registrations, self-gated on the mod being enabled:
// - the reward schemas, display and claim effects for finds and parts,
// - the homecoming: the camp grows one stage each time the player comes home.
if (isModEnabled("camp")) {
  registerRewardSchema("campFind", campFindRewardSchema)
  registerRewardSchema("campPart", campPartRewardSchema)
  registerCampRewardDisplay()
  registerRewardContribution(useCampRewardContribution)
  registerHomecoming(() => useCampProgress().grow)
}
