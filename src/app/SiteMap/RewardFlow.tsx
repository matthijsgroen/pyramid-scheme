import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"

import type { TreasureReward } from "@/game/siteTypes"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { getSellableById } from "@/data/sellables"
import type { MaterialTier } from "@/data/treasures"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { LootPopup } from "@/ui/atoms/LootPopup"
import { useTimeout } from "@/support/useTimeout"
import { rewardText } from "./rewardDisplay"

const SELLABLE_RARITY: Record<MaterialTier, "common" | "rare" | "legendary"> = {
  stone: "common",
  bronze: "common",
  silver: "rare",
  gold: "rare",
  divine: "legendary",
}

type Props = {
  pendingReward: { reward: TreasureReward; consumableFull?: boolean; onCollect: () => void } | null
  hieroglyphProgress: (id: string) => { found: number; required: number }
  onDismiss: () => void
}

export const RewardFlow: FC<Props> = ({ pendingReward, hieroglyphProgress, onDismiss }) => {
  const { t } = useTranslation(["common", "inventory", "sellables"])
  const [showLoot, setShowLoot] = useState(false)
  const [scheduleLoot] = useTimeout()

  // The chest-open gesture belongs to the encounter itself (TreasureFamily's plugin) —
  // by the time a reward is pending, it's already been solved. This is the reveal only.
  useEffect(() => {
    if (!pendingReward) return
    pendingReward.onCollect()
    scheduleLoot(600, () => setShowLoot(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per pendingReward instance
  }, [pendingReward])

  if (!pendingReward) return null

  const { reward, consumableFull } = pendingReward

  const handleDismiss = () => {
    setShowLoot(false)
    onDismiss()
  }

  return (
    <>
      {!showLoot && <div className="fixed inset-0 z-30 bg-black/85" />}

      {reward.type === "consumable" && consumableFull
        ? (() => {
            const { itemName, icon } = rewardText(reward, t)
            return (
              <LootPopup
                isOpen={showLoot}
                itemName={t("chest.consumableFull", { item: itemName })}
                itemComponent={<span className="text-6xl opacity-50">{icon}</span>}
                onDismiss={handleDismiss}
                youFoundLabel={t("chest.packFull")}
                clickToContinueLabel={t("loot.clickToContinue")}
              />
            )
          })()
        : reward.type === "hieroglyphFragment"
          ? (() => {
              const item = getInventoryItemById(reward.hieroglyphId)
              const difficulty = getItemFirstLevel(reward.hieroglyphId)
              const progress = hieroglyphProgress(reward.hieroglyphId)
              const rarity = progress.found >= progress.required ? "legendary" : progress.found >= 2 ? "rare" : "common"
              const { itemName, itemDescription } = rewardText(reward, t, hieroglyphProgress)
              return (
                <LootPopup
                  isOpen={showLoot}
                  itemName={itemName}
                  itemDescription={itemDescription}
                  rarity={rarity}
                  itemComponent={
                    item && difficulty ? (
                      <HieroglyphTile
                        symbol={item.symbol}
                        difficulty={difficulty}
                        size="lg"
                        fragmentProgress={progress.found < progress.required ? progress : undefined}
                      />
                    ) : (
                      <span className="text-6xl">𓂀</span>
                    )
                  }
                  onDismiss={handleDismiss}
                  youFoundLabel={t("loot.youFound")}
                  clickToContinueLabel={t("loot.clickToContinue")}
                />
              )
            })()
          : reward.type === "sellable"
            ? (() => {
                const item = getSellableById(reward.itemId)
                const { itemName, itemDescription, icon } = rewardText(reward, t)
                return (
                  <LootPopup
                    isOpen={showLoot}
                    itemName={itemName}
                    itemDescription={itemDescription}
                    rarity={item ? SELLABLE_RARITY[item.tier] : "common"}
                    itemComponent={<span className="text-6xl">{icon}</span>}
                    onDismiss={handleDismiss}
                    youFoundLabel={t("loot.youFound")}
                    clickToContinueLabel={t("loot.clickToContinue")}
                  />
                )
              })()
            : (() => {
                const { itemName, itemDescription, icon } = rewardText(reward, t)
                return (
                  <LootPopup
                    isOpen={showLoot}
                    itemName={itemName}
                    itemDescription={itemDescription}
                    itemComponent={<span className="text-6xl">{icon}</span>}
                    onDismiss={handleDismiss}
                    youFoundLabel={t("loot.youFound")}
                    clickToContinueLabel={t("loot.clickToContinue")}
                  />
                )
              })()}
    </>
  )
}
