import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { HealthDisplay } from "@/ui/atoms/HealthDisplay"

type Props = {
  currentHealth: number
  maxHealth: number
  /** Whether a failed attempt won't bottom out health — drives a risk warning only, never blocks
   * the attempt (gating is soft: the trap always launches). */
  attemptSafe: boolean
  consumables: { bandage: number; oil: number; trapTool: number }
  onAttempt: () => void
  onTurnAround: () => void
  onDisable: () => void
  /** Heal in place (bandage = +1 heart, oil = full) and stay on this screen, so the player can
   * shore up before deciding. The trap plugin owns the effect (useTrapProgress.useConsumable). */
  onHeal: (type: "bandage" | "oil") => void
}

export const TrapWarningScreen: FC<Props> = ({
  currentHealth,
  maxHealth,
  attemptSafe,
  consumables,
  onAttempt,
  onTurnAround,
  onDisable,
  onHeal,
}) => {
  const { t } = useTranslation("common")
  const atMaxHealth = currentHealth >= maxHealth
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/85">
      <p className="font-pyramid text-2xl text-amber-300">{t("trap.warning")}</p>
      <HealthDisplay currentHealth={currentHealth} maxHealth={maxHealth} />
      <p className={`text-sm ${attemptSafe ? "text-stone-300" : "text-red-400"}`}>
        {attemptSafe ? t("trap.canAttempt") : t("trap.tooWeak")}
      </p>
      <div className="flex flex-col items-center gap-3">
        {/* Soft gating (pyramid-interior-design.md §8): the attempt is ALWAYS available; low health
            only shows a risk warning above, never hides the button. */}
        <button onClick={onAttempt} className="rounded bg-amber-700 px-6 py-2 text-amber-100 hover:bg-amber-600">
          {t("trap.attempt")}
        </button>
        {/* Heal before deciding — only when it would do something (have the item, below max). */}
        {consumables.bandage > 0 && !atMaxHealth && (
          <button
            onClick={() => onHeal("bandage")}
            className="rounded bg-rose-800 px-6 py-2 text-rose-100 hover:bg-rose-700"
          >
            {t("trap.heal")} 🩹
          </button>
        )}
        {consumables.oil > 0 && !atMaxHealth && (
          <button
            onClick={() => onHeal("oil")}
            className="rounded bg-rose-800 px-6 py-2 text-rose-100 hover:bg-rose-700"
          >
            {t("trap.fullHeal")} 🫙
          </button>
        )}
        {consumables.trapTool > 0 && (
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
