import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import type { HaulLine } from "@/app/home/haulLines"
import type { TreasureReward } from "@/game/siteTypes"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import { campArrivalRewardSchema, campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"

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

// An animal that has come to stand in the camp is one line per purchase, named by the part of its fact after the
// colon (the strings live under `arrivals`), drawn as the step of the same name or else the purchase's first step.
export const summariseArrivals = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] =>
  rewards.map(reward => {
    const { purchase } = campArrivalRewardSchema.parse(reward)
    const name = purchase.slice(purchase.indexOf(":") + 1)
    const steps = CAMP_STEPS.filter(step => step.purchase === purchase)
    return {
      key: `campArrival-${purchase}`,
      visual: picture((steps.find(step => step.id === name) ?? steps[0])?.id ?? name, "⛺"),
      title: t(`arrivals.${name}`, NS),
      isNew: true,
      news: true,
    }
  })

export const useCampHaulLines = () => ({
  campFind: summariseFinds,
  campPart: summariseParts,
  campArrival: summariseArrivals,
})
