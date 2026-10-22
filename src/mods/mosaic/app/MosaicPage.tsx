import { type FC, use, useMemo } from "react"
import { Page } from "@/ui/atoms/Page"
import { FezContext } from "@/app/fez/context"
import { MOSAIC_TIERS, mosaicBucket } from "@/mods/mosaic/game/mosaicCurrency"
import { useProgression } from "@/app/state/useProgression"
import { MosaicWindow } from "./MosaicWindow"
import { useMosaicProgress } from "./useMosaicProgress"
import { useMosaicReminder } from "./useMosaicReminder"
import { carriedPieces, type TierCounts } from "@/mods/mosaic/game/placementQueue"

export const MosaicPage: FC = () => {
  // Owned counts are the ledger's, one bucket per register (core owns the buckets, mosaic owns the
  // ids); placed counts are the mosaic mod's own persisted slice. A piece is found first and set
  // into the window afterwards, by hand.
  const { ledger, loaded: ledgerLoaded } = useProgression()
  const { placedCount, placeOne, loaded: placedLoaded } = useMosaicProgress()
  const fez = use(FezContext)

  const owned = useMemo(
    () => Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as TierCounts,
    [ledger]
  )
  const placed = Object.fromEntries(MOSAIC_TIERS.map(t => [t, placedCount(t)])) as TierCounts
  // Every screen of the pager mounts with the travel screen, so this is where a return to it is counted.
  useMosaicReminder({
    unplaced: carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0),
    ready: ledgerLoaded && placedLoaded,
  })

  return (
    <Page className="flex flex-col bg-stone-950" snap="end">
      <MosaicWindow
        owned={owned}
        placed={placed}
        onPlace={placeOne}
        onNarrate={(conversation, done, options) =>
          fez.showConversation(conversation, done, { forceReplay: options?.replay })
        }
      />
    </Page>
  )
}
