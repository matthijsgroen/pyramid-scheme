import type { CellState } from "@/game/siteTypes"
import type { Mark } from "@/game/mark"
import { keyColorHex } from "@/ui/tokens/keyColors"

// HOW A MARK IS DRAWN — the pair itself (`Mark`, `MARK_GLYPHS`, `markFor`) is plain data and lives in
// src/game/mark.ts, because the assembler writes it onto cells and the domain layer holds no React.
// Re-exported here so everything on the map side reads one name for it.
export type { Mark }

/** The lit hue on anything the player can reach, the muted one on what they have only seen. */
const markHex = (mark: Mark, state: CellState): string =>
  keyColorHex[mark.color][state === "visible" ? "visible" : "reachable"]

/**
 * The mark on a map node, hung off its TOP-LEFT corner: the completed ✓ and the treasure key dots take
 * the right-hand side, and the lever's own arm swings up to the right, so the left is the one corner
 * free on every shape that wears this.
 *
 * Placed by the node's radius rather than at a fixed size, so it sits on the rim of a gate and of a
 * lever alike. `r` is the node's own radius in map units (nodeRadius, nodeKinds.ts).
 */
export const MarkBadge = ({ mark, r, state }: { mark: Mark; r: number; state: CellState }) => {
  if (state === "fogged") return null
  return (
    <g transform={`translate(${-r * 0.72}, ${-r * 0.72})`}>
      <circle r={r * 0.46} fill={markHex(mark, state)} stroke="#1a1208" strokeWidth={1.5} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * 0.62}
        fill="#1a1208"
        style={{ userSelect: "none" }}
      >
        {String.fromCodePoint(mark.glyph)}
      </text>
    </g>
  )
}

/** The mark at a fixed size, in a -12..12 box — what both the HTML drawings below paint. */
const MarkFace = ({ mark }: { mark: Mark }) => (
  <>
    <circle r={11} fill={markHex(mark, "reachable")} stroke="#1a1208" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={15} fill="#1a1208" style={{ userSelect: "none" }}>
      {String.fromCodePoint(mark.glyph)}
    </text>
  </>
)

/**
 * The same mark inside ordinary HTML — the lever's own screen wears it on each of its buttons, so the
 * player matches what they are throwing against the doors on the map. Its own little inline `<svg>`,
 * the way NodeBadge does it (nodeShapes.tsx), rather than a second drawing to keep in step.
 */
export const MarkChip = ({ mark, size = 24 }: { mark: Mark; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="-12 -12 24 24" style={{ overflow: "visible" }}>
    <MarkFace mark={mark} />
  </svg>
)

/**
 * THE MARK WORN BY THE ART RATHER THAN BY THE MARKER, for the half of the pair that has no marker to
 * wear it: a door a lever drives is a way a switch shut (`isSealedWayOut`), which the map draws as a
 * leaf of stone with its node marker hidden outright. The badge moves onto the leaf, exactly as the
 * emptied-chest ✓ moves onto the lid (`NodeSprite.badge`) and for the same reason.
 *
 * Placed by its CENTRE, in map units, inside the map's HTML layer.
 */
export const MarkArtBadge = ({ mark, x, y, r = 11 }: { mark: Mark; x: number; y: number; r?: number }) => (
  <svg
    aria-hidden="true"
    viewBox="-12 -12 24 24"
    style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, overflow: "visible" }}
  >
    <MarkFace mark={mark} />
  </svg>
)
