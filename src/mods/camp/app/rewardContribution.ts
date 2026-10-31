import type { RewardContribution } from "@/app/SiteMap/rewardContributions"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"
import { useCampProgress } from "./useCampProgress"

// The camp's claim effects, reading its own state so core never sees the camp. A find or part the save
// already has is skipped silently: no popup, no second record.
export const useCampRewardContribution = (): RewardContribution => {
  const camp = useCampProgress()
  return {
    effects: {
      campFind: reward => camp.recordFind(campFindRewardSchema.parse(reward).step),
      campPart: reward => {
        const { structure, part } = campPartRewardSchema.parse(reward)
        return camp.recordPart(structure, part)
      },
    },
    skip: reward => {
      if (reward.type === "campFind") return camp.save.finds.includes(campFindRewardSchema.parse(reward).step)
      if (reward.type === "campPart") {
        const { structure, part } = campPartRewardSchema.parse(reward)
        return camp.save.parts[structure]?.includes(part) ?? false
      }
      return false
    },
  }
}
