import { type FC, useEffect, useMemo } from "react"
import { Page } from "@/ui/Page"
import { StainedGlassMosaic } from "@/ui/StainedGlassMosaic"
import { MOSAIC_PIECES } from "@/ui/mosaicPieces.generated"
import { LEVEL_STEPS, PIECES_BY_STEP } from "@/ui/mosaicRevealOrder"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"

export const MosaicPage: FC = () => {
  const { getJourney } = useJourneys()
  const { mosaicSeenCount, markMosaicViewed } = useProgression()

  const { revealedPieceIds, newPieceIds, totalRevealedSteps } = useMemo(() => {
    const revealed = new Set<string>()
    const newSet = new Set<string>()
    let revealedCount = 0

    for (const step of LEVEL_STEPS) {
      const info = getJourney(step.journeyId)
      const completed = info ? info.completionCount * info.journey.levelCount + (info.levelNr - 1) : 0
      if (completed > step.levelIndex) {
        revealedCount++
        const pieceIds = PIECES_BY_STEP.get(`${step.journeyId}:${step.levelIndex}`) ?? []
        for (const id of pieceIds) {
          revealed.add(id)
          if (revealedCount > mosaicSeenCount) newSet.add(id)
        }
      }
    }

    return { revealedPieceIds: revealed, newPieceIds: newSet, totalRevealedSteps: revealedCount }
  }, [getJourney, mosaicSeenCount])

  useEffect(() => {
    // Mark all current pieces as seen after a short delay so the highlight is visible first
    const timer = setTimeout(() => markMosaicViewed(totalRevealedSteps), 3000)
    return () => clearTimeout(timer)
  }, [markMosaicViewed, totalRevealedSteps])

  return (
    <Page className="flex flex-col items-center justify-center bg-stone-950" snap="end">
      <div className="w-full max-w-xs px-8">
        <StainedGlassMosaic revealedPieces={revealedPieceIds} newPieces={newPieceIds} />
      </div>
      {newPieceIds.size > 0 && (
        <p className="mt-4 text-sm text-amber-400">
          {newPieceIds.size} newly revealed {newPieceIds.size === 1 ? "section" : "sections"}
        </p>
      )}
      <p className="mt-2 text-xs text-stone-500">
        {revealedPieceIds.size} / {MOSAIC_PIECES.length} pieces
      </p>
    </Page>
  )
}
