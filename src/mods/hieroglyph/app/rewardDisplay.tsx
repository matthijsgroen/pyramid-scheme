import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays, type RewardDisplayFn } from "@/app/SiteMap/rewardDisplayRegistry"
import { hieroglyphCategory } from "@/app/SiteMap/hieroglyphCategory"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { hieroglyphFragmentSchema } from "./rewardSchema"

// The fragment reward's synchronous text/emoji (generic RewardFlow fallback + shop stock), plus
// its rich display (a HieroglyphTile with fragment progress + a rarity that climbs as pieces are
// found). The rich display is hook-based so it can read the mod's own collection progress; the
// synchronous handler cannot, so it omits the progress line.
export const registerHieroglyphRewardDisplay = () => {
  registerRewardHandler({
    type: "hieroglyphFragment",
    emoji: "𓂀",
    text: (reward, t) => {
      const { hieroglyphId } = hieroglyphFragmentSchema.parse(reward)
      const item = getInventoryItemById(hieroglyphId)
      const category = hieroglyphCategory(hieroglyphId)
      const name = item
        ? t(`${category}.${hieroglyphId}.name`, { ns: "inventory", defaultValue: item.name })
        : t("chest.hieroglyphFragment")
      return { itemName: `${name} — ${t("chest.hieroglyphFragment")}`, icon: item?.symbol ?? "𓂀" }
    },
  })

  registerRewardDisplays(useHieroglyphRewardDisplays)
}

const useHieroglyphRewardDisplays = (): Partial<Record<string, RewardDisplayFn>> => {
  const { hieroglyphProgress } = useHieroglyphProgress()
  return {
    hieroglyphFragment: (reward, t) => {
      const { hieroglyphId } = hieroglyphFragmentSchema.parse(reward)
      const item = getInventoryItemById(hieroglyphId)
      const difficulty = getItemFirstLevel(hieroglyphId)
      const category = hieroglyphCategory(hieroglyphId)
      const progress = hieroglyphProgress(hieroglyphId)
      const rarity = progress.found >= progress.required ? "legendary" : progress.found >= 2 ? "rare" : "common"
      const name = item
        ? t(`${category}.${hieroglyphId}.name`, { ns: "inventory", defaultValue: item.name })
        : t("chest.hieroglyphFragment")
      const description = t(`${category}.${hieroglyphId}.description`, {
        ns: "inventory",
        defaultValue: item?.description ?? "",
      })
      const progressLine = t("chest.fragmentProgress", {
        found: Math.min(progress.found, progress.required),
        required: progress.required,
      })
      return {
        rarity,
        itemName: `${name} — ${t("chest.hieroglyphFragment")}`,
        itemDescription: `${description}\n\n${progressLine}`,
        ItemVisual:
          item && difficulty ? (
            <HieroglyphTile
              symbol={item.symbol}
              difficulty={difficulty}
              size="lg"
              fragmentProgress={progress.found < progress.required ? progress : undefined}
            />
          ) : (
            <span className="text-6xl">𓂀</span>
          ),
      }
    },
  }
}
