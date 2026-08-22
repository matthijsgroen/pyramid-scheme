import type { FC } from "react"
import clsx from "clsx"
import { MOSAIC_PIECES, type MosaicPieceDef } from "./mosaicPieces.generated"
import { MOSAIC_POINTS } from "./mosaicGeometry.generated"
import stainedGlassUrl from "../../assets/stained-glass.png"

// ViewBox matches stained-glass.png aspect ratio (1153×2000 → 200×347)
const VB_W = 200
const VB_H = 347

const LEAD = "#120800"
const DARK = "#000000"

// Render top bands first so lower-band lead lines draw on top
const sortedPieces = [...MOSAIC_PIECES].sort((a, b) => a.zoneId.localeCompare(b.zoneId))

// The five registers, with the band each one occupies — a finished register gets lit from behind.
const REGISTERS = [...new Set(MOSAIC_PIECES.map(p => p.zoneId))].sort().map(zoneId => {
  const pieces = MOSAIC_PIECES.filter(p => p.zoneId === zoneId)
  const ys = pieces.flatMap(p => MOSAIC_POINTS[p.id].split(" ").map(pt => Number(pt.split(",")[1])))
  return { zoneId, ids: pieces.map(p => p.id), y: Math.min(...ys), height: Math.max(...ys) - Math.min(...ys) }
})

export const StainedGlassMosaic: FC<{
  revealedPieces?: ReadonlySet<string>
  newPieces?: ReadonlySet<string>
  onPieceClick?: (piece: MosaicPieceDef) => void
  className?: string
}> = ({ revealedPieces = new Set(), newPieces, onPieceClick, className }) => {
  const litRegisters = REGISTERS.filter(r => r.ids.every(id => revealedPieces.has(id)))

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} xmlns="http://www.w3.org/2000/svg" className={clsx("w-full", className)}>
      <defs>
        {litRegisters.length > 0 && (
          <>
            <style>{`
            @keyframes panel-light-breathe {
              0%, 100% { opacity: 0.8; }
              50%      { opacity: 1; }
            }
          `}</style>
            {/* Daylight behind finished glass: brightest mid-panel, falling off to the leading */}
            <radialGradient id="panel-light" cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#fff4d6" stopOpacity="0.6" />
              <stop offset="55%" stopColor="#ffcf7a" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
            </radialGradient>
          </>
        )}
        {newPieces && newPieces.size > 0 && (
          <>
            <style>{`
            @keyframes new-piece-reveal {
              0%   { opacity: 0; }
              8%   { opacity: 1; }
              22%  { opacity: 0.4; }
              36%  { opacity: 1; }
              50%  { opacity: 0.4; }
              64%  { opacity: 1; }
              78%  { opacity: 0.5; }
              100% { opacity: 0; }
            }
          `}</style>
            <filter id="new-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        )}
        {/* Mask: white = dark overlay visible, black = cut out (image shows through) */}
        <mask id="reveal-mask">
          <rect width={VB_W} height={VB_H} fill="white" />
          {sortedPieces
            .filter(p => revealedPieces.has(p.id))
            .map(piece => (
              <polygon key={piece.id} points={MOSAIC_POINTS[piece.id]} fill="black" stroke="black" strokeWidth="1" />
            ))}
        </mask>
      </defs>

      {/* Real image always underneath */}
      <image href={stainedGlassUrl} width={VB_W} height={VB_H} preserveAspectRatio="none" />

      {/* Dark overlay across the whole window, with the revealed pieces cut out of it */}
      <rect width={VB_W} height={VB_H} fill={DARK} mask="url(#reveal-mask)" />

      {/* A finished register lights up: screened over the glass, but under the leading, so the
        lead lines stay dark and the panel reads as daylight coming through from behind. */}
      {litRegisters.map(r => (
        <rect
          key={`light-${r.zoneId}`}
          x={0}
          y={r.y}
          width={VB_W}
          height={r.height}
          fill="url(#panel-light)"
          pointerEvents="none"
          style={{ mixBlendMode: "screen", animation: "panel-light-breathe 7s ease-in-out infinite" }}
        />
      ))}

      {/* Amber pulse for newly revealed pieces. Keyed on the pieces themselves: a CSS animation only
          runs when its element mounts, so without a changing key React reuses this group for the next
          batch and only the first pieces ever flare. */}
      {newPieces && newPieces.size > 0 && (
        <g
          key={[...newPieces].join("|")}
          style={{ animation: "new-piece-reveal 5s ease-in-out forwards" }}
          filter="url(#new-glow)"
        >
          {sortedPieces
            .filter(p => newPieces.has(p.id))
            .map(piece => (
              <polygon
                key={`new-${piece.id}`}
                points={MOSAIC_POINTS[piece.id]}
                fill="rgba(251,191,36,0.35)"
                stroke="rgba(251,191,36,0.9)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            ))}
        </g>
      )}

      {/* Lead lines and click targets on top */}
      {sortedPieces.map(piece => (
        <polygon
          key={piece.id}
          points={MOSAIC_POINTS[piece.id]}
          fill="transparent"
          stroke={LEAD}
          // The artwork paints its own leading; this only closes the seams between polygons, so it
          // stays thin — heavier and it doubles every line and swallows the small figures.
          strokeWidth="0.15"
          strokeLinejoin="round"
          style={{ cursor: onPieceClick ? "pointer" : undefined }}
          onClick={onPieceClick ? () => onPieceClick(piece) : undefined}
        />
      ))}
    </svg>
  )
}
