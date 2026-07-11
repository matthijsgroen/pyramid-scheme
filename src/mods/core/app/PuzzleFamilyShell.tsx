import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useTimeout } from "@/support/useTimeout"

// Shared by every puzzle family: the "completed!" delay/banner and Cancel button.
type Props = {
  onSolved: () => void
  onCancel: () => void
  children: (handleSolved: () => void) => ReactNode
}

export const PuzzleFamilyShell = ({ onSolved, onCancel, children }: Props) => {
  const { t } = useTranslation("common")
  const [solvedBanner, setSolvedBanner] = useState(false)
  const [scheduleSolve, cancelSolve] = useTimeout()

  const handleSolved = () => {
    scheduleSolve(800, () => {
      setSolvedBanner(true)
      scheduleSolve(1500, onSolved)
    })
  }

  return (
    <>
      {children(handleSolved)}
      {!solvedBanner && (
        <button
          onClick={() => {
            cancelSolve()
            onCancel()
          }}
          className="text-sm text-stone-400 hover:text-stone-200"
        >
          {t("ui.cancel")}
        </button>
      )}
      {solvedBanner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-stone-900/90">
          <p className="font-pyramid text-xl text-amber-300">{t("ui.puzzleCompleted")}</p>
        </div>
      )}
    </>
  )
}
