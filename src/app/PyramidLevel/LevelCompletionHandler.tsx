import { useEffect, useState, useRef, type FC } from "react"
import { LevelCompletedOverlay } from "./LevelCompletedOverlay"
import { LootPopup } from "@/ui/LootPopup"
import type { JourneyState } from "@/app/state/useJourneys"
import { useLootDetermination, type Loot } from "./useLootDetermination"

type LevelCompletionHandlerProps = {
  isCompleted: boolean
  onCompletionFinished: () => void
  activeJourney: JourneyState
}

export const LevelCompletionHandler: FC<LevelCompletionHandlerProps> = ({
  isCompleted,
  onCompletionFinished,
  activeJourney,
}) => {
  const [showOverlay, setShowOverlay] = useState(false)
  const [showLoot, setShowLoot] = useState(false)
  const [completionPhase, setCompletionPhase] = useState<
    "hidden" | "overlay" | "loot" | "finished"
  >("hidden")
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Use the loot determination hook
  const { loot, collectLoot } = useLootDetermination(activeJourney)

  useEffect(() => {
    if (isCompleted && completionPhase === "hidden") {
      // Start the completion sequence only when level is completed
      setCompletionPhase("overlay")
      setShowOverlay(true)
    }
  }, [isCompleted, completionPhase])

  // Reset state when level completion is no longer active
  useEffect(() => {
    if (!isCompleted) {
      setCompletionPhase("hidden")
      setShowOverlay(false)
      setShowLoot(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isCompleted])

  // Separate effect for handling the timer when in overlay phase
  useEffect(() => {
    if (completionPhase === "overlay") {
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
  }, [completionPhase, loot, onCompletionFinished])

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

  if (!isCompleted) return null

  return (
    <>
      {/* Level Completed Overlay */}
      {showOverlay && (
        <div
          onClick={handleOverlayClick}
          className="absolute inset-0 z-40 pointer-events-auto cursor-pointer"
        >
          <LevelCompletedOverlay />
          {!loot && completionPhase === "overlay" && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              <p className="text-white text-sm font-medium animate-pulse">
                Click anywhere to continue
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
