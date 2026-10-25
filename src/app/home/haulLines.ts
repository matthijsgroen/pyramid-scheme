import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { TreasureReward } from "@/game/siteTypes"
import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import { useMergedRewardDisplays } from "@/app/SiteMap/rewardDisplayRegistry"

// One line of what the player carried home.
export type HaulLine = { key: string; visual: ReactNode; title: string; note?: string; isNew?: boolean }

type Summariser = (rewards: readonly TreasureReward[], t: TFn) => HaulLine[]
type UseSummarisers = () => Partial<Record<string, Summariser>>

// A mod contributes, per reward type, how a group of that type reads on the home (for example one line
// per collection instead of one per piece). A type with no summariser gets core's default line: equal
// rewards merged with "×n", named and drawn through the reward display registry. A type with neither
// is left out.
const registry: UseSummarisers[] = []

export const registerHaulLines = (useLines: UseSummarisers) => registry.push(useLines)

const sameReward = (a: TreasureReward, b: TreasureReward): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every(key => JSON.stringify(a[key]) === JSON.stringify(b[key]))
}

export const useHaulLines = (haul: readonly TreasureReward[]): HaulLine[] => {
  const { t } = useTranslation("common")
  const displays = useMergedRewardDisplays()
  const summarisers: Partial<Record<string, Summariser>> = {}
  for (const useLines of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see rewardContributions
    Object.assign(summarisers, useLines())
  }

  const groups = new Map<string, TreasureReward[]>()
  for (const reward of haul) groups.set(reward.type, [...(groups.get(reward.type) ?? []), reward])

  const lines: HaulLine[] = []
  for (const [type, rewards] of groups) {
    const summarise = summarisers[type]
    if (summarise) {
      lines.push(...summarise(rewards, t))
      continue
    }
    const display = displays[type]
    if (!display) continue
    const distinct: { reward: TreasureReward; count: number }[] = []
    for (const reward of rewards) {
      const hit = distinct.find(entry => sameReward(entry.reward, reward))
      if (hit) hit.count += 1
      else distinct.push({ reward, count: 1 })
    }
    distinct.forEach(({ reward, count }, index) => {
      const shown = display(reward, t)
      lines.push({
        key: `${type}-${index}`,
        visual: shown.ItemVisual,
        title: count > 1 ? `${shown.itemName} ${t("home.haul.times", { count })}` : shown.itemName,
      })
    })
  }
  return [...lines.filter(line => line.isNew), ...lines.filter(line => !line.isNew)]
}
