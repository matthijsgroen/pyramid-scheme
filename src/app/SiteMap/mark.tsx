/* eslint-disable react-refresh/only-export-components -- one vocabulary in one file: the pair itself,
   the hue it resolves to, and the two ways it is drawn. Splitting them would leave the glyph list and
   the drawing that has to be able to render it in different files. */
import type { CellState, KeyColor } from "@/game/siteTypes"
import { KEY_COLORS } from "@/game/siteTypes"
import { keyColorHex } from "@/ui/tokens/keyColors"

/**
 * A MARK IS A GLYPH ON A COLOURED GROUND: the ground groups, the glyph says which one. A mechanism and
 * every gate it owns wear the same pair, so two levers on one floor may both be green and still be
 * told apart (docs/mods/floor-topology-design.md, "A gate says what opens it").
 *
 * Nothing is painted for it — the grounds are the five floor-key hues the map already tints gates and
 * treasure badges with, and the glyphs come from the hieroglyph subset already shipped as a webfont and
 * led with in every stack (src/index.css), so a text node anywhere already renders them.
 */
export type Mark = { color: KeyColor; glyph: number }

/**
 * Picked out of HIEROGLYPHS_IN_FONT for reading as six different SHAPES at marker size — a falcon, an
 * ankh, a cobra, an eye, a scarab, a water ripple — rather than for meaning anything: a bird and a
 * standing man are one blob at 20px, which is the size this is worn at.
 *
 * Guarded by mark.spec.tsx against the generated list, because a code point the subset does not carry
 * draws as an empty box on every device with no hieroglyph font of its own. Written as code points
 * rather than as literals so the subset sweep (scripts/hieroglyphUsage.ts) neither grows nor shrinks
 * for them — every one of these is already drawn elsewhere in the source.
 */
export const MARK_GLYPHS: readonly number[] = [0x13143, 0x132f9, 0x13197, 0x13080, 0x131a3, 0x13216]

/** Five grounds against six glyphs, which are coprime: thirty pairs before any floor sees one twice. */
export const markFor = (index: number): Mark => ({
  color: KEY_COLORS[index % KEY_COLORS.length],
  glyph: MARK_GLYPHS[index % MARK_GLYPHS.length],
})

/** The lit hue on anything the player can reach, the muted one on what they have only seen. */
export const markHex = (mark: Mark, state: CellState): string =>
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
