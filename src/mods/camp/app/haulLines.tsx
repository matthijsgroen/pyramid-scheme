import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import type { HaulLine } from "@/app/home/haulLines"
import type { TreasureReward } from "@/game/siteTypes"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"

const NS = { ns: "camp" }

const picture = (id: string, emoji: string) => {
  const url = (campArt(id, true) ?? campArt(id))?.url
  return url ? (
    <img src={url} alt="" draggable={false} className="size-24 object-contain" />
  ) : (
    <span className="text-6xl">{emoji}</span>
  )
}

// Each find is its own line, marked new: a find is a piece of the camp the player has not seen there.
export const summariseFinds = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] =>
  rewards.map((reward, index) => {
    const { step } = campFindRewardSchema.parse(reward)
    return {
      key: `campFind-${step}-${index}`,
      visual: picture(step, "⛺"),
      title: t(`finds.${step}`, NS),
      note: t("haul.new", NS),
      isNew: true,
    }
  })

// Parts read per structure: how many of its parts came home, not each one.
export const summariseParts = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] => {
  const counts = new Map<string, number>()
  for (const reward of rewards) {
    const { structure } = campPartRewardSchema.parse(reward)
    counts.set(structure, (counts.get(structure) ?? 0) + 1)
  }
  return [...counts].map(([structure, count]) => ({
    key: `campPart-${structure}`,
    visual: picture(structure, "🧱"),
    title: t("haul.parts", { ...NS, name: t(`structures.${structure}`, NS), count }),
    isNew: true,
  }))
}

export const useCampHaulLines = () => ({ campFind: summariseFinds, campPart: summariseParts })
