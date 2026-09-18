import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorGrid } from "@/game/siteTypes"
import { CELL, SIDE_W, WALL_H, cellCenter, cellLeft, cellTop } from "./mapScale"
import { ClipLayer } from "./htmlLayers"
import { boundsOf, type Rect } from "./tileRegions"
import { tierPalette } from "./tileMaterials"
import type { RoomClaims } from "./roomClaims"
import { LIT_STRENGTH, litPlaceCells } from "./lighting"

// THE DARK, AND THE LIGHT IN IT. The tier's own night over the whole floor, the place the lamp burns a
// hole in it, and the relief that hands a prop back the modelling the night's wash takes off it. Kept
// together because they are one argument read from both ends — see docs/instructions/map-rendering.md.

// ─── Torchlight on the place the player is standing ─────────────────────────────

/**
 * The room or corridor cell the explorer is in, washed warm.
 *
 * A chamber lights whole — lighting one cell of it would draw a square of light with no edge to justify
 * it — and a corridor lights only the cell stood in, having no extent to fill. It stops AT the place: no
 * bleed onto whatever sits next to it, which grid adjacency would light through a wall.
 *
 * Weak on purpose. The pool at the explorer's feet does the close light, so a strong wash here is the same
 * light drawn twice and reads as a bright tile. It must still clear an UNVISITED room, since `completed`
 * washes a visited one 20% darker: on starter stone, 102 against an unvisited 96 and a visited 77.
 */

/**
 * How much light lands where — the clip says where it can land at all.
 *
 * A gradient about the cell the explorer stands in, so the light has a source. A flat fill is a highlight
 * laid over a floorplan: no falloff, no centre, nothing saying where the flame is.
 *
 * It never falls to nothing, because the place is lit by rule — a passage lights as far as its next turn,
 * however long (`litPlaceCells`). The far end of a long run keeps a bit under half the near end's light;
 * zero would be a torch that stops at a distance the level design already promised.
 *
 * **Light scales the stone up, it does not add white to it.** `screen` ADDS, and adding lifts darks more
 * than lights, so joints come up with slabs and the masonry flattens: the lamp leaves 23% of the art's
 * texture and puts the floor 20 L* above the stone it is cut from. `color-dodge` DIVIDES
 * (`backdrop / (1 − blend)`), a scale, so the art's ratios survive at the same 102% brightness.
 *
 * **Hence no white-hot stops.** Under a dodge any channel at 255 divides by zero and blows out — a
 * near-white lamp turns the floor to paper, a saturated one to neon (a 255-red torch measures chroma 39
 * against the art's 9). A warm-leaning near-neutral is a finite per-channel scale, and scaling red a
 * little harder than blue reads warm without the light being orange: chroma 22 on floor painted at 9.
 */
const TORCH_CORE = "rgba(160,150,134,1)"
const TORCH_MID = "rgba(160,150,134,0.78)"
const TORCH_EDGE = "rgba(160,150,134,0.44)"

/** How far the falloff spans, at the least. A one-cell place — a dead end, a single chamber — has almost
 * no distance to fall off over, and a gradient sized to it alone put a vignette inside one square. Below
 * this the light is simply near-flat, which for a place that small is what it should be. */
const TORCH_MIN_REACH = CELL * 2.2

/** How far the light's own edge is softened (`ClipLayer`'s `feather`).
 *
 * The lit place is a union of cell squares, so unfeathered it ends on a staircase of right angles. Nothing
 * in the picture accounts for such a line — hard-edged light means an opaque thing casting it — so the eye
 * reads the bright part as a coloured-in tile rather than as ground a lamp falls on.
 *
 * Half a wall band. Small enough that the light does not creep into the next room, and what it reaches past
 * its own cells is the band of wall around them, which a lamp in the middle of a room certainly lights.
 * Large enough that no straight run of the cut survives: the falloff spans about a fifth of a cell. */
const TORCH_FEATHER = WALL_H / 2

/** A pool of torchlight cut to a place: brightest at the flame, falling away to the edges of whatever the
 * clip lets it reach. `farthest-corner` by hand rather than by keyword, because it needs a floor.
 *
 * The centre follows the LIVE cell, so walking a corridor drags the light along it rather than leaving it
 * pinned where the run was entered. What that costs is one repaint of one clipped box per cell walked —
 * five a second at the default step, of a layer that is a gradient fill and nothing else, and only while
 * the explorer is moving, which is already a render a frame. It is not a map-wide invalidation: the box is
 * the lit place's own bounds (see `ClipLayer`), never the floor's. */
const torchFill = (box: { x: number; y: number; w: number; h: number }, at: readonly [number, number]) => {
  const { cx, cy } = cellCenter(at[0], at[1])
  const [x, y] = [cx - box.x, cy - box.y]
  const corner = Math.max(
    Math.hypot(x, y),
    Math.hypot(box.w - x, y),
    Math.hypot(x, box.h - y),
    Math.hypot(box.w - x, box.h - y)
  )
  const reach = Math.max(corner, TORCH_MIN_REACH)
  return `radial-gradient(circle ${reach.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${TORCH_CORE} 0%, ${TORCH_MID} 38%, ${TORCH_EDGE} 100%)`
}

/**
 * How far each pass of the light lifts what it falls on. It falls in the same two passes the shade does
 * (FloorShade), and must, or the second wash takes the lamp back: the shade's second pass lays a quarter
 * of the tier's night over everything, which without a matching light pass leaves the explorer at 65
 * against a floor at 89 — a hero darker than the ground under their feet.
 *
 * The two together give the map its top end: a lit room lands at 125–137 against an unlit 43–67, so it
 * reads brighter than the stone rather than a shade less black than the rest of it.
 */

/** How long a place takes to come up, and to go out: the two have to agree, because both are drawn
 * during the crossing. Matches `--animate-map-lit-in`/`-out` in the theme. */
const FADE_MS = 320
const FADE_IN = "animate-map-lit-in motion-reduce:animate-none"
const FADE_OUT = "animate-map-lit-out motion-reduce:animate-none"

const LitPlace = ({
  grid,
  claims,
  at,
  leaving = false,
  strength,
  headroom = false,
}: {
  grid: FloorGrid
  claims: RoomClaims
  at?: readonly [number, number]
  /** This is the place being walked OUT of: it fades away rather than up. */
  leaving?: boolean
  strength: number
  /** Reach a wall band's worth ABOVE every lit cell, whether or not the cell north of it is lit.
   *
   * For the pass that falls on what is STANDING. A prop is bottom-anchored in its cell and a face band
   * taller than it (`PROP_H`), and the explorer's head clears their own cell by about twenty units — so a
   * light clipped to the floor squares cut a hard horizontal line across every statue standing against
   * the north wall of a lit room, lighting it from the waist down. The band is also the wall the lamp is
   * nearest: a torch in a room lights the face in front of it, so there is nothing to undo here. */
  headroom?: boolean
}) => {
  const place = at ? litPlaceCells(grid, claims, at) : []

  const lit = new Set(place)

  // A cell's square PLUS the gap to any lit neighbour. The map's pitch is a cell plus a wall band, so two
  // cells of a corridor sit 28 units apart with floor between them — squares alone left that band dark and
  // the run read as a row of lit tiles rather than as a lit passage. The floor layers fill those gaps for
  // the same reason; light has to as well.
  const rectsFor = (keys: Iterable<string>, joinsTo: ReadonlySet<string>): Rect[] => {
    // Whether this cell's own north band is part of the light: always on the pass that reaches over
    // what is standing, and otherwise only where the cell above is lit too.
    const bandAbove = (r: number, c: number) => headroom || joinsTo.has(`${r - 1},${c}`)
    return [...keys].flatMap(key => {
      const [r, c] = key.split(",").map(Number)
      const parts: Rect[] = [[cellLeft(c), cellTop(r), CELL, CELL]]
      if (bandAbove(r, c)) parts.push([cellLeft(c), cellTop(r) - WALL_H, CELL, WALL_H])
      if (joinsTo.has(`${r},${c - 1}`)) {
        parts.push([cellLeft(c) - SIDE_W, cellTop(r), SIDE_W, CELL])
        // And the little square between two bands, which is the SEAM OF THE BACK WALL: two lit cells
        // side by side each carry their own band, and the wall runs on through the gap between them.
        // Filling both bands and not the seam leaves an unlit slit standing in the wall at every
        // column of a lit room — so the seam belongs to the light wherever both bands do.
        if (bandAbove(r, c) && bandAbove(r, c - 1))
          parts.push([cellLeft(c) - SIDE_W, cellTop(r) - WALL_H, SIDE_W, WALL_H])
      }
      return parts
    })
  }

  if (!lit.size || !at) return null
  const rects = rectsFor(lit, lit)
  return (
    <ClipLayer
      data-torch={headroom ? "standing" : "lit"}
      className={leaving ? FADE_OUT : FADE_IN}
      feather={TORCH_FEATHER}
      rects={rects}
      fill={torchFill(boundsOf(rects), at)}
      // The strength the keyframes fade TO, and the opacity that stands when there are none: an animation
      // is the one thing that outranks an inline style, so the same number written both ways is the
      // `motion-reduce` fallback and not a second value to keep in step.
      style={{ "--map-lit-strength": strength } as CSSProperties}
      opacity={leaving ? 0 : strength}
    />
  )
}

/**
 * The lit place, crossfaded as the explorer walks from one to the next.
 *
 * Tied to the LIVE position rather than the settled one, so the room ahead comes up over the walk instead
 * of snapping on at the moment of arrival. Both places are drawn during the crossing — the old one going
 * out, the new one coming in — because a path cannot tween between two shapes, so the fade has to be
 * between two of them.
 */
export const LitPlaces = ({
  grid,
  claims,
  at,
  strength = LIT_STRENGTH,
  headroom = false,
}: {
  grid: FloorGrid
  claims: RoomClaims
  at?: readonly [number, number]
  strength?: number
  headroom?: boolean
}) => {
  const key = at ? litPlaceCells(grid, claims, at).join("|") : ""
  const [leaving, setLeaving] = useState<readonly [number, number] | undefined>(undefined)
  const prevRef = useRef<{ key: string; at?: readonly [number, number] }>({ key, at })

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = { key, at }
    if (prev.key === key || !prev.at) return
    setLeaving(prev.at)
    const timer = setTimeout(() => setLeaving(undefined), FADE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the PLACE, which is what `key` is
  }, [key])

  return (
    <div style={{ position: "absolute", inset: 0, mixBlendMode: "color-dodge", pointerEvents: "none" }}>
      {leaving && (
        <LitPlace
          key="leaving"
          grid={grid}
          claims={claims}
          at={leaving}
          leaving
          strength={strength}
          headroom={headroom}
        />
      )}
      <LitPlace key={key} grid={grid} claims={claims} at={at} strength={strength} headroom={headroom} />
    </div>
  )
}

/**
 * The tier's own night, lying over the whole floor. It is what gives the map a value range: without it
 * slab, wall face and void land in one narrow band and the light has nothing to be bright against.
 *
 * A flat wash, not a `multiply`: alpha over the top lifts the blacks instead of crushing them, keeping the
 * layout readable when the player pulls back, and it is one composited box rather than a second full-map
 * blend group (`docs/instructions/map-rendering.md`).
 *
 * It falls in two passes, because the click markers must not go dark with the rest. The full pass lies
 * under them — washing them with everything else costs most of their contrast against the stone, 3.8 down
 * to 2.2. The lighter second pass lies over everything, so furniture is seated in the dark it stands in
 * and the markers pay a quarter of the wash instead of all of it.
 */
export const FloorShade = ({ tier, strength = 1 }: { tier: Difficulty; strength?: number }) => (
  <div
    data-floor-shade=""
    style={{
      position: "absolute",
      inset: 0,
      background: tierPalette[tier].shade,
      opacity: strength,
      pointerEvents: "none",
    }}
  />
)
