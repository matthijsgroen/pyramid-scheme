import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { HealthDisplay } from "@/ui/HealthDisplay"

type Props = {
  currentHealth: number
  maxHealth: number
  canAttempt: boolean
  trapToolCount: number
  onAttempt: () => void
  onTurnAround: () => void
  onDisable: () => void
}

export const TrapWarningScreen: FC<Props> = ({
  currentHealth,
  maxHealth,
  canAttempt,
  trapToolCount,
  onAttempt,
  onTurnAround,
  onDisable,
}) => {
  const { t } = useTranslation("common")
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("trap.warning")}</p>
      <HealthDisplay currentHealth={currentHealth} maxHealth={maxHealth} />
      <p className="text-sm text-stone-300">{canAttempt ? t("trap.canAttempt") : t("trap.tooWeak")}</p>
      <div className="flex flex-col items-center gap-3">
        {canAttempt && (
          <button onClick={onAttempt} className="rounded bg-amber-700 px-6 py-2 text-amber-100 hover:bg-amber-600">
            {t("trap.attempt")}
          </button>
        )}
        {trapToolCount > 0 && (
          <button onClick={onDisable} className="rounded bg-stone-700 px-6 py-2 text-stone-100 hover:bg-stone-600">
            {t("trap.disable")} 🔧
          </button>
        )}
        <button onClick={onTurnAround} className="text-sm text-stone-400 hover:text-stone-200">
          {t("trap.turnAround")}
        </button>
      </div>
    </div>
  )
}
