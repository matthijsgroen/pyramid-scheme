import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import { StainedGlassMosaic } from "@/ui/atoms/StainedGlassMosaic"
import { StoneFrame } from "@/ui/atoms/StoneFrame"
import { MOSAIC_TIERS, type MosaicTier } from "@/mods/mosaic/game/mosaicCurrency"
import {
  beatFor,
  beatsEarnedBy,
  carriedPieces,
  completedTiers,
  nextPlacement,
  revealedPieceIds,
  type TierCounts,
} from "@/mods/mosaic/game/placementQueue"

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
  /** Play a Fez conversation and call back when it's dismissed. Placing waits for it. `replay`
   *  re-tells one he has already given, which is what a finished panel's caption asks for. */
  onNarrate?: (conversation: string, done: () => void, options?: { replay?: boolean }) => void
}> = ({ owned, placed, onPlace, onNarrate }) => {
  const { t } = useTranslation()
  const [placing, setPlacing] = useState(false)
  const [justPlaced, setJustPlaced] = useState<ReadonlySet<string>>(new Set())
  const [beats, setBeats] = useState<string[]>([])

  const carriedTotal = carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0)
  const placedTotal = MOSAIC_TIERS.reduce((sum, tier) => sum + placed[tier], 0)
  const revealed = useMemo(() => revealedPieceIds(placed), [placedTotal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set the carried pieces one at a time until none are left in hand, pausing while Fez has
  // something to say — a finished panel is the moment the whole register was built for, and the
  // cascade running on past it would bury it. Keyed on the counts rather than on `owned`/`placed`,
  // which are rebuilt every render and would restart the timer forever.
  useEffect(() => {
    if (!placing || beats.length > 0) return
    const next = nextPlacement(owned, placed)
    if (!next) {
      setPlacing(false)
      return
    }
    const timer = setTimeout(() => {
      setJustPlaced(new Set(next.pieceIds))
      onPlace(next.tier)
      const earned = beatsEarnedBy(next.tier, { ...placed, [next.tier]: placed[next.tier] + 1 })
      if (earned.length > 0 && onNarrate) setBeats(earned)
    }, PLACE_INTERVAL_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing, carriedTotal, placedTotal, beats.length])

  // One beat at a time; the finale follows the wizard panel's own beat.
  useEffect(() => {
    const [beat] = beats
    if (!beat || !onNarrate) return
    onNarrate(beat, () => setBeats(rest => rest.slice(1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats])

  return (
    <>
      {/* Size container: the frame takes whichever of the two fits — the space's full width, or the
          width the panel's own aspect ratio allows at the space's height. Height alone overflowed
          a narrow phone sideways whenever the row below happened to be short. */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-2 [container-type:size]">
        <StoneFrame className="w-[min(100cqw,calc(100cqh*200/347))]">
          <StainedGlassMosaic revealedPieces={revealed} newPieces={justPlaced} />
        </StoneFrame>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2 py-2">
        {/* Kept in the layout with nothing in hand: the window resizes to whatever height is left,
            so a button appearing and disappearing would resize the mosaic under the player. */}
        <button
          onClick={() => setPlacing(true)}
          disabled={placing || carriedTotal === 0}
          className={clsx(
            "rounded-full bg-amber-600 px-6 py-2 font-bold text-white shadow-lg disabled:opacity-70",
            carriedTotal === 0 && "invisible"
          )}
        >
          {placing ? t("mosaic.placing") : t("mosaic.place", { count: carriedTotal })}
        </button>
        {/* A finished scene keeps its name, and the name is the way back to what Fez said about it. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {completedTiers(placed).map(tier => (
            <button
              key={tier}
              disabled={placing || !onNarrate}
              onClick={() => onNarrate?.(beatFor(tier), () => {}, { replay: true })}
              className="rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-200 disabled:opacity-50"
            >
              ℹ {t(`mosaic.panel.${tier}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
