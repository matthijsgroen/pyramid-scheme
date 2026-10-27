import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { LootPopup } from "@/ui/atoms/LootPopup"
import map from "@/assets/camp/map.webp"

// Shown once, over the camp, to a player whose older save this launch threw away (see saveEpoch).
export const NewVersionNotice: FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { t } = useTranslation("common")
  return (
    <LootPopup
      isOpen
      rarity="legendary"
      youFoundLabel={t("newVersion.title")}
      itemName={t("newVersion.name")}
      itemDescription={t("newVersion.body")}
      itemComponent={<img src={map} alt="" draggable={false} className="w-44 select-none" />}
      clickToContinueLabel={t("loot.clickToContinue")}
      onDismiss={onDismiss}
    />
  )
}
