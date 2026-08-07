import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { StainedGlassMosaic } from "@/ui/atoms/StainedGlassMosaic"
import { StoneFrame } from "@/ui/atoms/StoneFrame"
import { MOSAIC_TIERS, type MosaicTier } from "@/mods/mosaic/game/mosaicCurrency"
import { carriedPieces, nextPlacement, revealedPieceIds, type TierCounts } from "@/mods/mosaic/game/placementQueue"

// One piece drops into the window this often while a handful is being set in, so a batch reads as
// a cascade rather than a snap.
const PLACE_INTERVAL_MS = 260

// The window and the act of filling it. Takes counts and a "set one piece" callback, so the page
// can back it with the ledger and persisted state while a story drives it from local state — the
// cascade, the button and the timing are the same code either way.
export const MosaicWindow: FC<{
  owned: TierCounts
  placed: TierCounts
  onPlace: (tier: MosaicTier) => void
}> = ({ owned, placed, onPlace }) => {
  const { t } = useTranslation()
  const [placing, setPlacing] = useState(false)
  const [justPlaced, setJustPlaced] = useState<ReadonlySet<string>>(new Set())

  const carriedTotal = carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0)
  const placedTotal = MOSAIC_TIERS.reduce((sum, tier) => sum + placed[tier], 0)
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
      onPlace(next.tier)
    }, PLACE_INTERVAL_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing, carriedTotal, placedTotal])

  return (
    <>
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
    </>
  )
}
