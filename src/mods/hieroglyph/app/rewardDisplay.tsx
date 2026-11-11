import { registerRewardHandler, type TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays, type RewardDisplayFn } from "@/app/SiteMap/rewardDisplayRegistry"
import { hieroglyphCategory } from "@/app/SiteMap/hieroglyphCategory"
import { getInventoryItemById } from "@/mods/hieroglyph/game/symbolCatalogue"
import { getItemFirstLevel } from "@/mods/hieroglyph/game/itemLevelLookup"
import { HieroglyphTile } from "@/ui/molecules/HieroglyphTile"
import { requiredPieces, useHieroglyphProgress } from "./useHieroglyphProgress"
import { hieroglyphFragmentSchema } from "./rewardSchema"

// "Name — Hieroglyph Fragment"; a hieroglyph that comes in one piece arrives whole, so it is
// called a hieroglyph, not a fragment of one.
const hieroglyphItemName = (hieroglyphId: string, t: TFn): string => {
  const item = getInventoryItemById(hieroglyphId)
  const name = item
    ? t(`${hieroglyphCategory(hieroglyphId)}.${hieroglyphId}.name`, { ns: "inventory", defaultValue: item.name })
    : t("chest.hieroglyphFragment")
  const kind = requiredPieces(hieroglyphId) > 1 ? t("chest.hieroglyphFragment") : t("chest.hieroglyph")
  return `${name} — ${kind}`
}

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
      return {
        itemName: hieroglyphItemName(hieroglyphId, t),
        icon: getInventoryItemById(hieroglyphId)?.symbol ?? "𓂀",
      }
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
      const description = t(`${category}.${hieroglyphId}.description`, {
        ns: "inventory",
        defaultValue: item?.description ?? "",
      })
      return {
        rarity,
        itemName: hieroglyphItemName(hieroglyphId, t),
        itemDescription: description,
        // Its own line in the popup — a newline inside itemDescription would collapse to a space.
        // A one-piece hieroglyph comes whole, so a piece count says nothing.
        itemEffectDescription:
          progress.required > 1
            ? t("chest.fragmentProgress", {
                found: Math.min(progress.found, progress.required),
                required: progress.required,
              })
            : undefined,
        // The tile's RevealMask drops itself once the set is complete, so no complete-check here
        ItemVisual:
          item && difficulty ? (
            <HieroglyphTile symbol={item.symbol} difficulty={difficulty} size="lg" fragmentProgress={progress} />
          ) : (
            <span className="text-6xl">𓂀</span>
          ),
      }
    },
  }
}
