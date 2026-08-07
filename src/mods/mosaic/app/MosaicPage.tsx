import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { Page } from "@/ui/atoms/Page"
import { StainedGlassMosaic } from "@/ui/atoms/StainedGlassMosaic"
import { StoneFrame } from "@/ui/atoms/StoneFrame"
import { LEVEL_STEPS, PIECES_BY_STEP } from "@/mods/mosaic/game/mosaicRevealOrder"
import { MOSAIC_TIERS, mosaicBucket, type MosaicTier } from "@/mods/mosaic/game/mosaicCurrency"
import { useProgression } from "@/app/state/useProgression"
import { useMosaicProgress } from "./useMosaicProgress"

export const MosaicPage: FC = () => {
  // Piece counts are the ledger's, one bucket per register (core owns the buckets, mosaic owns
  // the ids); seen-counts are the mosaic mod's own persisted slice. Each register fills from its
  // own difficulty, so they advance independently and a panel finishes when its tier is picked clean.
  const ledger = useProgression().ledger
  const { seenCount, markViewed } = useMosaicProgress()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  const countByTier = useMemo(
    () => Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as Record<MosaicTier, number>,
    [ledger]
  )

  const { revealedPieceIds, newPieceIds } = useMemo(() => {
    const revealed = new Set<string>()
    const newSet = new Set<string>()

    for (const tier of MOSAIC_TIERS) {
      const steps = LEVEL_STEPS.filter(s => s.journeyId.startsWith(`${tier}_`))
      const seen = seenCount(tier)
      for (let i = 0; i < Math.min(countByTier[tier], steps.length); i++) {
        const step = steps[i]
        for (const id of PIECES_BY_STEP.get(`${step.journeyId}:${step.levelIndex}`) ?? []) {
          revealed.add(id)
          if (i >= seen) newSet.add(id)
        }
      }
    }

    return { revealedPieceIds: revealed, newPieceIds: newSet }
  }, [countByTier, seenCount])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        if (entry.isIntersecting) {
          // ponytail: only start timer when page is actually visible (not off-screen in swipeable panel)
          timer = setTimeout(() => markViewed(countByTier), 3000)
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
  }, [markViewed, countByTier])

  return (
    <Page className="flex flex-col bg-stone-950" snap="end">
      <div ref={containerRef} className="flex h-full w-full items-center justify-center p-2">
        <StoneFrame className="h-full">
          <div className="aspect-[200/347] h-full">
            <StainedGlassMosaic
              className="h-full"
              revealedPieces={revealedPieceIds}
              newPieces={isVisible ? newPieceIds : new Set()}
            />
          </div>
        </StoneFrame>
      </div>
    </Page>
  )
}
