import { useEffect, useState, type FC, use } from "react"
import { useTranslation } from "react-i18next"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"
import { FezContext } from "../fez/context"
import { layerOnMount } from "@/ui/atoms/dialogFocus"

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
    // A tap anywhere goes on; keys and pad reach the same through the button.
    <div
      ref={layerOnMount}
      role="presentation"
      onClick={finish}
      className="focus-brackets pointer-events-auto absolute inset-0 z-40 cursor-pointer"
    >
      <LevelCompletedOverlay onComplete={finish} />
      {!finished && (
        <div className="absolute bottom-8 left-1/2 z-50 -translate-x-1/2 transform">
          <button
            type="button"
            data-input-back
            autoFocus
            className="animate-pulse rounded px-2 text-sm font-medium text-white"
          >
            {t("loot.clickToContinue")}
          </button>
        </div>
      )}
    </div>
  )
}
