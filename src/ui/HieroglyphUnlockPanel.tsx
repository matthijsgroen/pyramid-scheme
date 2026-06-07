import { useState, useRef, type FC } from "react"
import { useTranslation } from "react-i18next"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { useTreasureItem } from "@/data/useTreasureTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import type { Difficulty } from "@/data/difficultyLevels"

type HieroglyphUnlockPanelProps = {
  hieroglyphSymbol: string
  hieroglyphDifficulty: Difficulty
  artifactId: string
  onUnlock: () => void
  onDismiss: () => void
}

const TILE_WIDTH = 48 // w-12 = 48px
const GAP = 48 // gap between tiles (arrow area)
const UNLOCK_THRESHOLD = TILE_WIDTH * 0.8

export const HieroglyphUnlockPanel: FC<HieroglyphUnlockPanelProps> = ({
  hieroglyphSymbol,
  hieroglyphDifficulty,
  artifactId,
  onUnlock,
  onDismiss,
}) => {
  const { t } = useTranslation("treasures")
  const getTreasureItem = useTreasureItem()
  const artifact = getTreasureItem(artifactId)
  const artifactDifficulty = getItemFirstLevel(artifactId)

  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const isOverThreshold = dragX <= -UNLOCK_THRESHOLD

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = e.clientX - startXRef.current
    // Only allow leftward drag, clamp to tile+gap distance
    setDragX(Math.max(-(TILE_WIDTH + GAP), Math.min(0, delta)))
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    if (isOverThreshold) {
      onUnlock()
    } else {
      setDragX(0)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onDismiss} />

      {/* Bottom sheet */}
      <div className="fixed right-0 bottom-0 left-0 z-50 animate-slide-in-up rounded-t-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300" />

        <div className="flex flex-col items-center gap-6">
          {/* Tile row: [Hieroglyph] ← [Artifact] */}
          <div className="flex items-center gap-6">
            {/* Hieroglyph target tile */}
            <div
              className={
                isOverThreshold
                  ? "rounded-lg ring-4 ring-amber-400 ring-offset-2 transition-all duration-150"
                  : "transition-all duration-150"
              }
            >
              <HieroglyphTile symbol={hieroglyphSymbol} difficulty={hieroglyphDifficulty} size="lg" />
            </div>

            {/* Arrow */}
            <span className="text-2xl text-amber-600 select-none">←</span>

            {/* Artifact tile — draggable */}
            {artifact && (
              <div
                className="cursor-grab touch-none active:cursor-grabbing"
                style={{
                  transform: `translateX(${dragX}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                  userSelect: "none",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <HieroglyphTile symbol={artifact.symbol} difficulty={artifactDifficulty} size="lg" />
              </div>
            )}
          </div>

          {/* Artifact name */}
          {artifact && <p className="font-pyramid text-base font-semibold text-amber-800">{artifact.name}</p>}

          {/* Instruction */}
          <p className="text-center text-sm text-gray-500">{t("hieroglyphUnlockPanel.instruction")}</p>

          {/* Dismiss button */}
          <button onClick={onDismiss} className="mt-2 rounded-lg px-6 py-2 text-sm text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      </div>
    </>
  )
}
