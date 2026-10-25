import { useTranslation } from "react-i18next"
import { useProgression } from "@/app/state/useProgression"
import { MOSAIC_STEPS_BY_TIER, MOSAIC_TIERS, MOSAIC_TOTAL, mosaicBucket } from "../game/mosaicCurrency"

// The window's label: pieces found of all the window holds. A register takes only as many pieces as it
// has steps, so a piece past that never counts as found.
export const useMosaicEntranceLabel = (): { label: string } => {
  const { t } = useTranslation("common")
  const { ledger } = useProgression()
  const found = MOSAIC_TIERS.reduce(
    (sum, tier) => sum + Math.min(ledger.get(mosaicBucket(tier)), MOSAIC_STEPS_BY_TIER[tier]),
    0
  )
  return { label: t("mosaic.entrance.label", { found, total: MOSAIC_TOTAL }) }
}
