import { useEffect, useState, useRef, type FC, use } from "react"
import { useTranslation } from "react-i18next"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"
import { LootPopup } from "@/ui/LootPopup"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import { useLootDetermination } from "./useLootDetermination"
import { FezContext } from "../fez/context"

type LevelCompletionHandlerProps = {
  onCompletionFinished: () => void
  activeJourney: CombinedJourneyState
}

export const LevelCompletionHandler: FC<LevelCompletionHandlerProps> = ({
  onCompletionFinished,
  activeJourney,
}) => {
  const { t } = useTranslation("common")
  const [showOverlay, setShowOverlay] = useState(false)
  const [showFez, setShowFez] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const [completionPhase, setCompletionPhase] = useState<
    "hidden" | "overlay" | "loot" | "finished"
  >("hidden")
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Use the loot determination hook
  const { loot, collectLoot } = useLootDetermination(activeJourney)

  useEffect(() => {
    if (completionPhase === "hidden") {
      // Start the completion sequence only when level is completed
      setCompletionPhase("overlay")
      setShowOverlay(true)
      setShowFez(true)
    }
  }, [completionPhase])

  // Reset state when level completion is no longer active
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (showFez) {
      showConversation("levelCompleted", () => {
        setShowFez(false)
      })
    }
  }, [showFez, showConversation])

  // Separate effect for handling the timer when in overlay phase
  useEffect(() => {
    if (completionPhase === "overlay" && !showFez) {
      const timer = setTimeout(() => {
        if (loot) {
          setCompletionPhase("loot")
          setShowOverlay(false) // Hide overlay before showing loot
          setShowLoot(true)
        } else {
          setCompletionPhase("finished")
          onCompletionFinished()
        }
      }, 2000)

      timerRef.current = timer

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [completionPhase, loot, onCompletionFinished, showFez])

  const handleLootDismiss = () => {
    setShowLoot(false)
    setCompletionPhase("finished")
    collectLoot()

    // Small delay before calling completion to allow loot popup to close
    setTimeout(() => {
      onCompletionFinished()
    }, 300)
  }

  const handleOverlayClick = () => {
    if (completionPhase === "overlay" && !loot) {
      // If there's no loot, allow clicking to continue immediately
      setCompletionPhase("finished")
      onCompletionFinished()
    }
  }

  return (
    <>
      {/* Level Completed Overlay */}
      {showOverlay && (
        <div
          onClick={handleOverlayClick}
          className="pointer-events-auto absolute inset-0 z-40 cursor-pointer"
        >
          <LevelCompletedOverlay />
          {!loot && completionPhase === "overlay" && (
            <div className="absolute bottom-8 left-1/2 z-50 -translate-x-1/2 transform">
              <p className="animate-pulse text-sm font-medium text-white">
                {t("loot.clickToContinue")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loot Popup */}
      {loot && (
        <>
          <LootPopup
            isOpen={showLoot}
            itemName={loot.itemName}
            itemDescription={loot.itemDescription}
            itemComponent={loot.itemComponent}
            rarity={loot.rarity || "common"}
            onDismiss={handleLootDismiss}
          />
        </>
      )}
    </>
  )
}
