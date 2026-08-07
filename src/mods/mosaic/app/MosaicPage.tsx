import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/atoms/Page"
import { StainedGlassMosaic } from "@/ui/atoms/StainedGlassMosaic"
import { StoneFrame } from "@/ui/atoms/StoneFrame"
import { MOSAIC_TIERS, mosaicBucket } from "@/mods/mosaic/game/mosaicCurrency"
import { carriedPieces, nextPlacement, revealedPieceIds, type TierCounts } from "@/mods/mosaic/game/placementQueue"
import { useProgression } from "@/app/state/useProgression"
import { useMosaicProgress } from "./useMosaicProgress"

// One piece drops into the window this often while a handful is being set in, so a batch reads as
// a cascade rather than a snap.
const PLACE_INTERVAL_MS = 260

export const MosaicPage: FC = () => {
  const { t } = useTranslation()
  // Owned counts are the ledger's, one bucket per register (core owns the buckets, mosaic owns the
  // ids); placed counts are the mosaic mod's own persisted slice. A piece is found first and set
  // into the window afterwards, by hand.
  const ledger = useProgression().ledger
  const { placedCount, placeOne } = useMosaicProgress()
  const [placing, setPlacing] = useState(false)
  const [justPlaced, setJustPlaced] = useState<ReadonlySet<string>>(new Set())

  const owned = useMemo(
    () => Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as TierCounts,
    [ledger]
  )
  const placed = Object.fromEntries(MOSAIC_TIERS.map(t => [t, placedCount(t)])) as TierCounts

  const carriedTotal = carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0)
  const placedTotal = MOSAIC_TIERS.reduce((sum, t) => sum + placed[t], 0)
  const revealed = useMemo(() => revealedPieceIds(placed), [placedTotal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set the carried pieces one at a time until none are left in hand. Keyed on the counts rather
  // than on `owned`/`placed`, which are rebuilt every render and would restart the timer forever.
  useEffect(() => {
    if (!placing) return
    const next = nextPlacement(owned, placed)
    if (!next) {
      setPlacing(false)
      return
    }
    const timer = setTimeout(() => {
      setJustPlaced(new Set(next.pieceIds))
      placeOne(next.tier)
    }, PLACE_INTERVAL_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing, carriedTotal, placedTotal])

  return (
    <Page className="flex flex-col bg-stone-950" snap="end">
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <StoneFrame className="h-full">
          <div className="aspect-[200/347] h-full">
            <StainedGlassMosaic className="h-full" revealedPieces={revealed} newPieces={justPlaced} />
          </div>
        </StoneFrame>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-center">
        {carriedTotal > 0 && (
          <button
            onClick={() => setPlacing(true)}
            disabled={placing}
            className="rounded-full bg-amber-600 px-6 py-2 font-bold text-white shadow-lg disabled:opacity-70"
          >
            {placing ? t("mosaic.placing") : t("mosaic.place", { count: carriedTotal })}
          </button>
        )}
      </div>
    </Page>
  )
}
