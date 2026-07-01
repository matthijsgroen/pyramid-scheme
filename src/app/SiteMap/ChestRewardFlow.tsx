import { useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import type { TreasureReward } from "@/game/siteTypes"
import { getInventoryItemById } from "@/data/inventory"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { Chest } from "@/ui/Chest"
import { LootPopup } from "@/ui/LootPopup"
import { useTimeout } from "@/support/useTimeout"

const rewardEmoji = (type: string) => {
  if (type === "mapPiece") return "📜"
  if (type === "hieroglyphFragment") return "𓂀"
  if (type === "tombKey") return "🗝"
  if (type === "hieroglyphs") return "𓂀"
  return "🔷"
}

type Props = {
  pendingReward: { reward: TreasureReward; onCollect: () => void } | null
  hieroglyphProgress: (id: string) => { found: number; required: number }
  onDismiss: () => void
}

export const ChestRewardFlow: FC<Props> = ({ pendingReward, hieroglyphProgress, onDismiss }) => {
  const { t } = useTranslation("common")
  const [chestOpened, setChestOpened] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const [scheduleLoot] = useTimeout()

  if (!pendingReward) return null

  const { reward, onCollect } = pendingReward

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

      {reward.type === "hieroglyphFragment" ? (
        (() => {
          const item = getInventoryItemById(reward.hieroglyphId)
          const difficulty = getItemFirstLevel(reward.hieroglyphId)
          const progress = hieroglyphProgress(reward.hieroglyphId)
          const rarity = progress.found >= progress.required ? "legendary" : progress.found >= 2 ? "rare" : "common"
          return (
            <LootPopup
              isOpen={showLoot}
              itemName={item ? `${item.name} — ${t("chest.hieroglyphFragment")}` : t("chest.hieroglyphFragment")}
              itemDescription={`${item?.description ?? ""}\n\n${t("chest.fragmentProgress", { found: progress.found, required: progress.required })}`}
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
            />
          )
        })()
      ) : (
        <LootPopup
          isOpen={showLoot}
          itemName={t(`chest.${reward.type}`)}
          itemDescription={t(`chest.${reward.type}Description`, "") || undefined}
          itemComponent={<span className="text-6xl">{rewardEmoji(reward.type)}</span>}
          onDismiss={handleDismiss}
        />
      )}
    </>
  )
}
