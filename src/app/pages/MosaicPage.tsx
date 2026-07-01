import { type FC, useEffect, useMemo, useRef } from "react"
import { Page } from "@/ui/Page"
import { StainedGlassMosaic } from "@/ui/StainedGlassMosaic"
import { LEVEL_STEPS, PIECES_BY_STEP } from "@/ui/mosaicRevealOrder"
import { useProgression } from "@/app/state/useProgression"

export const MosaicPage: FC = () => {
  const { mosaicSeenCount, mosaicPieceCount, markMosaicViewed } = useProgression()
  const containerRef = useRef<HTMLDivElement>(null)

  const { revealedPieceIds, newPieceIds } = useMemo(() => {
    const revealed = new Set<string>()
    const newSet = new Set<string>()

    for (let i = 0; i < Math.min(mosaicPieceCount, LEVEL_STEPS.length); i++) {
      const step = LEVEL_STEPS[i]
      const pieceIds = PIECES_BY_STEP.get(`${step.journeyId}:${step.levelIndex}`) ?? []
      for (const id of pieceIds) {
        revealed.add(id)
        if (i >= mosaicSeenCount) newSet.add(id)
      }
    }

    return { revealedPieceIds: revealed, newPieceIds: newSet }
  }, [mosaicPieceCount, mosaicSeenCount])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // ponytail: only start timer when page is actually visible (not off-screen in swipeable panel)
          timer = setTimeout(() => markMosaicViewed(mosaicPieceCount), 3000)
        } else {
          if (timer) clearTimeout(timer)
        }
      },
      { threshold: 0.85 }
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [markMosaicViewed, mosaicPieceCount])

  return (
    <Page className="flex flex-col bg-stone-950" snap="end">
      <div ref={containerRef} className="h-full w-full">
        <StainedGlassMosaic className="h-full w-full" revealedPieces={revealedPieceIds} newPieces={newPieceIds} />
      </div>
    </Page>
  )
}
