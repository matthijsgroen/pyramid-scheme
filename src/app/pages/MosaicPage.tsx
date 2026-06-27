import { type FC, useEffect, useMemo } from "react"
import { Page } from "@/ui/Page"
import { StainedGlassMosaic } from "@/ui/StainedGlassMosaic"
import { MOSAIC_PIECES } from "@/ui/mosaicPieces.generated"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"

// Canonical pyramid journey order (matches Storybook JOURNEY_ORDER, tombs excluded)
const PYRAMID_JOURNEY_ORDER = [
  "starter_1",
  "starter_2",
  "starter_3",
  "starter_4",
  "junior_1",
  "junior_2",
  "junior_3",
  "junior_4",
  "expert_1",
  "expert_2",
  "expert_3",
  "expert_4",
  "master_1",
  "master_2",
  "master_3",
  "master_4",
  "wizard_1",
  "wizard_2",
  "wizard_3",
  "wizard_4",
]

// Pre-build ordered reveal steps and piece lookup at module load
const LEVEL_STEPS: Array<{ journeyId: string; levelIndex: number }> = (() => {
  const steps: Array<{ journeyId: string; levelIndex: number }> = []
  for (const jId of PYRAMID_JOURNEY_ORDER) {
    const max = MOSAIC_PIECES.filter(p => p.journeyId === jId).reduce((m, p) => Math.max(m, p.levelIndex), -1)
    for (let l = 0; l <= max; l++) steps.push({ journeyId: jId, levelIndex: l })
  }
  return steps
})()

const PIECES_BY_STEP = new Map<string, string[]>()
for (const p of MOSAIC_PIECES) {
  const key = `${p.journeyId}:${p.levelIndex}`
  const arr = PIECES_BY_STEP.get(key) ?? []
  arr.push(p.id)
  PIECES_BY_STEP.set(key, arr)
}

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
