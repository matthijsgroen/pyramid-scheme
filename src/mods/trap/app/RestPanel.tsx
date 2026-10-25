import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"
import { useTrapProgress } from "./useTrapProgress"

// What the fire does for the player at home: health is restored on coming back, so the hearts show full.
export const RestPanel: FC = () => {
  const { t } = useTranslation("common")
  const { maxHealth } = useTrapProgress()
  return (
    <div className="flex flex-col items-center gap-1">
      <HealthDisplay currentHealth={maxHealth} maxHealth={maxHealth} />
      <p className="text-sm">{t("trap.rested")}</p>
    </div>
  )
}
