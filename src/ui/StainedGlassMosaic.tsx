import type { FC } from "react"
import clsx from "clsx"
import { MOSAIC_PIECES, type MosaicPieceDef } from "./mosaicPieces.generated"
import stainedGlassUrl from "../assets/stained-glass.png"
import stainedGlassMaskUrl from "../assets/stained-glass-mask.png"

// ViewBox matches stained-glass.png aspect ratio (1372×2352 → 200×343)
const VB_W = 200
const VB_H = 343

const LEAD = "#120800"
const DARK = "#000000"

// Render top bands first so lower-band lead lines draw on top
const sortedPieces = [...MOSAIC_PIECES].sort((a, b) => a.zoneId.localeCompare(b.zoneId))

export const StainedGlassMosaic: FC<{
  revealedPieces?: ReadonlySet<string>
  onPieceClick?: (piece: MosaicPieceDef) => void
  className?: string
}> = ({ revealedPieces = new Set(), onPieceClick, className }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} xmlns="http://www.w3.org/2000/svg" className={clsx("w-full", className)}>
    <defs>
      {/* Clips dark overlay to glass area only — stone frame (transparent in mask PNG) stays visible */}
      <mask id="glass-area-mask" style={{ maskType: "alpha" }}>
        <image href={stainedGlassMaskUrl} width={VB_W} height={VB_H} preserveAspectRatio="none" />
      </mask>
      {/* Mask: white = dark overlay visible, black = cut out (image shows through) */}
      <mask id="reveal-mask">
        <rect width={VB_W} height={VB_H} fill="white" />
        {sortedPieces
          .filter(p => revealedPieces.has(p.id))
          .map(piece => (
            <polygon key={piece.id} points={piece.points} fill="black" stroke="black" strokeWidth="1" />
          ))}
      </mask>
    </defs>

    {/* Real image always underneath */}
    <image href={stainedGlassUrl} width={VB_W} height={VB_H} preserveAspectRatio="none" />

    {/* Dark overlay: clipped to glass area so stone frame stays visible, then piece-reveal holes cut out */}
    <g mask="url(#glass-area-mask)">
      <rect width={VB_W} height={VB_H} fill={DARK} mask="url(#reveal-mask)" />
    </g>

    {/* Lead lines and click targets on top */}
    {sortedPieces.map(piece => (
      <polygon
        key={piece.id}
        points={piece.points}
        fill="transparent"
        stroke={LEAD}
        strokeWidth="0.4"
        strokeLinejoin="round"
        style={{ cursor: onPieceClick ? "pointer" : undefined }}
        onClick={onPieceClick ? () => onPieceClick(piece) : undefined}
      />
    ))}
  </svg>
)
