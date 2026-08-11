import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"

import type { KeyColor, TreasureReward } from "@/game/siteTypes"
import { LootPopup } from "@/ui/atoms/LootPopup"
import { KeyIcon } from "@/ui/atoms/KeyIcon"
import { useTimeout } from "@/support/useTimeout"
import { rewardText } from "./rewardDisplay"
import { useMergedRewardDisplays, type RewardDisplay } from "./rewardDisplayRegistry"
import type { TFn } from "./rewardHandlerRegistry"

type Props = {
  pendingReward: {
    reward: TreasureReward
    consumableFull?: boolean
    /** Set when the chest held this floor's key(s) — core chrome, see floorKeyDisplay below. */
    keyColors?: readonly KeyColor[]
    onCollect: () => void
  } | null
  onDismiss: () => void
}

// A floor key is a structural, floor-local thing core itself places (siteAssembler), and its colour
// lives on the chest cell rather than in the reward payload — so core owns this popup content, the
// same way it owns the pack-full chrome below. Without it a found floor key read as a generic "Tomb
// Key" with no hint of which door it opens.
const floorKeyDisplay = (colors: readonly KeyColor[], t: TFn): RewardDisplay => ({
  rarity: "rare",
  itemName: colors.length === 1 ? t(`keys.${colors[0]}`) : t("keys.bundle"),
  itemDescription: t("keys.foundDescription"),
  ItemVisual: (
    <span className="flex items-center justify-center gap-2">
      {colors.map(color => (
        <KeyIcon key={color} color={color} size={64} title={t(`keys.${color}`)} />
      ))}
    </span>
  ),
})

export const RewardFlow: FC<Props> = ({ pendingReward, onDismiss }) => {
  const { t } = useTranslation(["common", "inventory", "sellables", "treasures", "journeys"])
  const displays = useMergedRewardDisplays()
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

  const { reward, consumableFull, keyColors } = pendingReward

  const handleDismiss = () => {
    setShowLoot(false)
    onDismiss()
  }

  // The mod that owns this reward type populates the popup content (rarity + labels + visual). A
  // type with no registered display (money, tomb loot) falls back to a generic icon + text built
  // from the synchronous reward handler. Core owns the shell (LootPopup) and names no mod.
  const build = displays[reward.type]
  const display: RewardDisplay =
    keyColors && keyColors.length > 0
      ? floorKeyDisplay(keyColors, t)
      : (build?.(reward, t) ??
        (() => {
          const { itemName, itemDescription, icon } = rewardText(reward, t)
          return { itemName, itemDescription, ItemVisual: <span className="text-6xl">{icon}</span> }
        })())

  return (
    <>
      {!showLoot && <div className="fixed inset-0 z-30 bg-black/85" />}

      {/* consumableFull is core chrome: a claim refused because the pack is full — the reward is
          shown dimmed with a "pack full" label, not collected (onCollect was a no-op). */}
      {consumableFull ? (
        <LootPopup
          isOpen={showLoot}
          itemName={t("chest.consumableFull", { item: display.itemName })}
          itemComponent={<span className="opacity-50">{display.ItemVisual}</span>}
          onDismiss={handleDismiss}
          youFoundLabel={t("chest.packFull")}
          clickToContinueLabel={t("loot.clickToContinue")}
        />
      ) : (
        <LootPopup
          isOpen={showLoot}
          itemName={display.itemName}
          itemDescription={display.itemDescription}
          itemEffectDescription={display.itemEffectDescription}
          rarity={display.rarity}
          itemComponent={display.ItemVisual}
          onDismiss={handleDismiss}
          youFoundLabel={t("loot.youFound")}
          clickToContinueLabel={t("loot.clickToContinue")}
        />
      )}
    </>
  )
}
