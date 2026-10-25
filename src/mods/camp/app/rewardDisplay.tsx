import { registerRewardHandler, type TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays, type RewardDisplay, type RewardDisplayFn } from "@/app/SiteMap/rewardDisplayRegistry"
import type { TreasureReward } from "@/game/siteTypes"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { CAMP_STEPS, type CampStepTable } from "@/mods/camp/game/campSteps"
import { spotProgress, structureProgress, type CampSave } from "@/mods/camp/game/campState"
import { partIcon } from "./campIcons"
import { campFindRewardSchema, campPartRewardSchema } from "./rewardSchema"
import { useCampProgress } from "./useCampProgress"

const NS = { ns: "camp" }

const picture = (url: string | undefined, emoji: string) =>
  url ? <img src={url} alt="" className="size-24 object-contain" /> : <span className="text-6xl">{emoji}</span>

// The popup content for a find: its spot's progress counts the pick-up itself, recorded or not yet.
export const campFindDisplay = (
  reward: TreasureReward,
  t: TFn,
  save: CampSave,
  table: CampStepTable = CAMP_STEPS
): RewardDisplay => {
  const { step } = campFindRewardSchema.parse(reward)
  const spot = table.find(entry => entry.id === step)?.spot
  const progress = spot ? spotProgress(save, table, spot) : undefined
  const owned = save.finds.includes(step)
  const url = (campArt(step, true) ?? campArt(step))?.url
  return {
    rarity: "common",
    itemName: `${t(`finds.${step}`, NS)} — ${t("reward.find", NS)}`,
    itemEffectDescription:
      spot && progress
        ? t("reward.progress", {
            ...NS,
            name: t(`spots.${spot}`, NS),
            found: Math.min(progress.found + (owned ? 0 : 1), progress.total),
            total: progress.total,
          })
        : undefined,
    ItemVisual: picture(url, "⛺"),
  }
}

// The popup content for a part: its structure's progress counts the part itself, recorded or not yet.
export const campPartDisplay = (
  reward: TreasureReward,
  t: TFn,
  save: CampSave,
  table: CampStepTable = CAMP_STEPS
): RewardDisplay => {
  const { structure, part } = campPartRewardSchema.parse(reward)
  const progress = structureProgress(save, table, structure)
  const owned = progress.found.includes(part)
  return {
    rarity: "common",
    itemName: `${t(`parts.${structure}.${part}`, NS)} — ${t("reward.part", NS)}`,
    itemEffectDescription: t("reward.progress", {
      ...NS,
      name: t(`structures.${structure}`, NS),
      found: Math.min(progress.found.length + (owned ? 0 : 1), progress.total.length),
      total: progress.total.length,
    }),
    ItemVisual: picture(partIcon(structure, part), "🧱"),
  }
}

const useCampRewardDisplays = (): Partial<Record<string, RewardDisplayFn>> => {
  const { save } = useCampProgress()
  return {
    campFind: (reward, t) => campFindDisplay(reward, t, save),
    campPart: (reward, t) => campPartDisplay(reward, t, save),
  }
}

// The synchronous text/emoji (generic RewardFlow fallback), plus the rich displays that read the save.
export const registerCampRewardDisplay = () => {
  registerRewardHandler({
    type: "campFind",
    emoji: "⛺",
    text: (reward, t) => ({
      itemName: `${t(`finds.${campFindRewardSchema.parse(reward).step}`, NS)} — ${t("reward.find", NS)}`,
      icon: "⛺",
    }),
  })
  registerRewardHandler({
    type: "campPart",
    emoji: "🧱",
    text: (reward, t) => {
      const { structure, part } = campPartRewardSchema.parse(reward)
      return { itemName: `${t(`parts.${structure}.${part}`, NS)} — ${t("reward.part", NS)}`, icon: "🧱" }
    },
  })
  registerRewardDisplays(useCampRewardDisplays)
}
