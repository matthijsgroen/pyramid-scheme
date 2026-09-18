import { useEffect, useState, type FC, use } from "react"
import { useTranslation } from "react-i18next"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"
import { FezContext } from "../fez/context"

// The exterior level's completion beat: Fez says his line over the completed-level overlay, and the
// next click (or the overlay's own end) hands control back to the expedition flow.
export const LevelCompletionHandler: FC<{ onCompletionFinished: () => void }> = ({ onCompletionFinished }) => {
  const { t } = useTranslation("common")
  const [showFez, setShowFez] = useState(true)
  const [finished, setFinished] = useState(false)
  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (showFez) {
      showConversation("levelCompleted", () => {
        setShowFez(false)
      })
    }
  }, [showFez, showConversation])

  const finish = () => {
    if (finished) return
    setFinished(true)
    onCompletionFinished()
  }

  return (
    <div onClick={finish} className="pointer-events-auto absolute inset-0 z-40 cursor-pointer">
      <LevelCompletedOverlay onComplete={finish} />
      {!finished && (
        <div className="absolute bottom-8 left-1/2 z-50 -translate-x-1/2 transform">
          <p className="animate-pulse text-sm font-medium text-white">{t("loot.clickToContinue")}</p>
        </div>
      )}
    </div>
  )
}
