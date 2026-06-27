import { type FC, useEffect, useMemo, useRef } from "react"
import { Page } from "@/ui/Page"
import { StainedGlassMosaic } from "@/ui/StainedGlassMosaic"
import { LEVEL_STEPS, PIECES_BY_STEP } from "@/ui/mosaicRevealOrder"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"

export const MosaicPage: FC = () => {
  const { getJourney } = useJourneys()
  const { mosaicSeenCount, markMosaicViewed } = useProgression()
  const containerRef = useRef<HTMLDivElement>(null)

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
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // ponytail: only start timer when page is actually visible (not off-screen in swipeable panel)
          timer = setTimeout(() => markMosaicViewed(totalRevealedSteps), 3000)
        } else {
          if (timer) clearTimeout(timer)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [markMosaicViewed, totalRevealedSteps])

  return (
    <Page className="flex flex-col bg-stone-950" snap="end">
      <div ref={containerRef} className="h-full w-full">
        <StainedGlassMosaic className="h-full w-full" revealedPieces={revealedPieceIds} newPieces={newPieceIds} />
      </div>
    </Page>
  )
}
