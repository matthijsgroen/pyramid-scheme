import type { CSSProperties } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { METALS } from "./metalPalette"

const difficulties = Object.keys(METALS) as Difficulty[]

// The difficulty's metal (./metalPalette.ts), cut two ways: as the carved 3D tile the hieroglyphs sit on,
// and as a flat surface for panels that want the tier's colour without the carving.

// `tile` is the main face gradient, `shadow` the offset drop-shadow element's gradient (lighter stops),
// `symbol` the engraved glyph colour. The paper texture, specks and clip-path live in HieroglyphTile.
export type MaterialSpec = { tile: string; shadow: string; symbol: string }

export const difficultyMaterial: Record<Difficulty, MaterialSpec> = Object.fromEntries(
  difficulties.map(tier => {
    const { material, light, shade } = METALS[tier]
    return [
      tier,
      {
        tile: `linear-gradient(145deg, ${light} 0%, ${material} 30%, ${material} 70%, ${shade} 100%)`,
        shadow: `linear-gradient(145deg, #ffffff 0%, ${light} 40%, ${material} 100%)`,
        symbol: shade,
      },
    ]
  })
) as Record<Difficulty, MaterialSpec>

export const difficultyMaterialFlat: Record<Difficulty, CSSProperties> = Object.fromEntries(
  difficulties.map(tier => [tier, { backgroundColor: METALS[tier].light, borderColor: METALS[tier].material }])
) as Record<Difficulty, CSSProperties>
