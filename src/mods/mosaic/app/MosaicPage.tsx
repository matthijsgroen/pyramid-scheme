import { type FC, use, useMemo } from "react"
import { FezContext } from "@/app/fez/context"
import { MOSAIC_TIERS, mosaicBucket } from "@/mods/mosaic/game/mosaicCurrency"
import { useProgression } from "@/app/state/useProgression"
import { MosaicWindow } from "./MosaicWindow"
import { useMosaicProgress } from "./useMosaicProgress"
import type { TierCounts } from "@/mods/mosaic/game/placementQueue"

export const MosaicPage: FC = () => {
  // Owned counts are the ledger's, one bucket per register (core owns the buckets, mosaic owns the
  // ids); placed counts are the mosaic mod's own persisted slice. A piece is found first and set
  // into the window afterwards, by hand.
  const { ledger } = useProgression()
  const { placedCount, placeOne } = useMosaicProgress()
  const fez = use(FezContext)

  const owned = useMemo(
    () => Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as TierCounts,
    [ledger]
  )
  const placed = Object.fromEntries(MOSAIC_TIERS.map(t => [t, placedCount(t)])) as TierCounts

  // The camp popup gives a window screen the full height of its panel; this fills it.
  return (
    <div className="flex size-full min-h-0 flex-col bg-stone-950">
      <MosaicWindow
        owned={owned}
        placed={placed}
        onPlace={placeOne}
        onNarrate={(conversation, done, options) =>
          fez.showConversation(conversation, done, { forceReplay: options?.replay })
        }
      />
    </div>
  )
}
