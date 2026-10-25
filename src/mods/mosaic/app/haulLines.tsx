import type { TFn } from "@/app/SiteMap/rewardHandlerRegistry"
import type { HaulLine } from "@/app/home/haulLines"
import type { TreasureReward } from "@/game/siteTypes"

// All the pieces brought home read as one line: which register each belongs to is for the window.
export const summarisePieces = (rewards: readonly TreasureReward[], t: TFn): HaulLine[] => [
  {
    key: "mosaicPiece",
    visual: <span className="text-6xl">🔷</span>,
    title: t("mosaic.haul.pieces", { count: rewards.length }),
    note: t("mosaic.haul.note"),
  },
]

export const useMosaicHaulLines = () => ({ mosaicPiece: summarisePieces })
