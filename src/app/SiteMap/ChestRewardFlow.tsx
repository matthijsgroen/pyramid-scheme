import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"

import type { TreasureReward } from "@/game/siteTypes"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { getSellableById } from "@/data/sellables"
import type { MaterialTier } from "@/data/treasures"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { Chest } from "@/ui/atoms/Chest"
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

export const ChestRewardFlow: FC<Props> = ({ pendingReward, hieroglyphProgress, onDismiss }) => {
  const { t } = useTranslation(["common", "inventory", "sellables"])
  const [chestOpened, setChestOpened] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const [scheduleLoot] = useTimeout()

  if (!pendingReward) return null

  const { reward, consumableFull, onCollect } = pendingReward

  const handleOpen = () => {
    if (chestOpened) return
    setChestOpened(true)
    onCollect()
    scheduleLoot(600, () => setShowLoot(true))
  }

  const handleDismiss = () => {
    setShowLoot(false)
    setChestOpened(false)
    onDismiss()
  }

  return (
    <>
      {!showLoot && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85">
          <Chest
            variant="wooden"
            state={chestOpened ? "open" : "empty"}
            allowInteraction={!chestOpened}
            onClick={handleOpen}
          />
          {!chestOpened && <p className="mt-6 animate-pulse text-sm text-amber-300">{t("chest.tapToOpen")}</p>}
        </div>
      )}

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
