import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { LootPopup } from "@/ui/atoms/LootPopup"

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
      itemComponent={<img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" className="size-24 rounded-2xl" />}
      clickToContinueLabel={t("loot.clickToContinue")}
      onDismiss={onDismiss}
    />
  )
}
