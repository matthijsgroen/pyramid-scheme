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
 * The room or corridor cell the explorer is in, washed warm — the same torch that pools at their feet
 * reaching the walls around them.
 *
 * A CHAMBER lights whole: a torch carried into a small room lights the room, and lighting one cell of it
 * would draw a square of light on a floor with no edge to justify it. A corridor lights only the cell
 * stood in, because a corridor has no extent to fill.
 *
 * Screen-blended and weak on purpose. This sits under the player for the whole game, so it has to read as
 * the stone being lit rather than as a coloured overlay on top of it — and it must never compete with the
 * state washes that tell the player what is explored.
 */
// Weak, flat across the place, and it stops AT the place — no bleed onto what happens to sit next to it.
// Spilling onto neighbours used grid adjacency rather than connectivity, so a corridor with a wall between
// it and the room lit up anyway; and the map already tells the player what is reachable.
// The pool at the explorer's feet already does the close light;
// this only has to say which room they are in, so a strong wash under the player was the same light drawn
// twice and read as a bright tile rather than a lit room. It still has to clear an UNVISITED room, since
// `completed` washes a visited one 20% darker and standing somewhere must not be dimmer than never having
// been there — on starter stone that puts the place at 102 against an unvisited 96 and a visited 77.

/**
 * What a torch lays on the stone around it — the CLIP says where light can land, this says how much of it
 * lands where, and the second half is the one that was missing.
 *
 * A FLAT FILL IS NOT LIGHT. The lit place was one opacity across its whole shape, so a lit room was a
 * rectangle of floor raised by a fixed amount: no falloff, no centre, nothing to say where the flame was.
 * That reads as a highlight laid over a floorplan, and it is most of what "dull" meant — the only part of
 * the map that looked like light was the torch's own pool, which is the one thing on it drawn as a
 * gradient. Same shape, same clip, same single element and single paint: the fill is now a gradient about
 * the cell the explorer is standing in, so the light has a source.
 *
 * IT NEVER FALLS TO NOTHING, because the place is lit by rule — a torch carried along a passage lights the
 * passage as far as the next turn, however long that is (`litPlaceCells`). The far end of a long run
 * drops to a bit under half of what the near end gets, which is a corridor receding; taking it to zero
 * would be a torch that stops working at a distance the level design has already promised.
 *
 * LIGHT SCALES THE STONE UP; IT DOES NOT ADD WHITE TO IT. That is the whole of the colour below, and it
 * is the same argument the night makes (`tileMaterials.ts`) read the other way round. A `screen` blend ADDS
 * light, and adding lifts the darks far more than the lights: the joints came up with the slabs and the
 * masonry flattened out. Measured on the starter floor, the lamp left **23% of the art's own texture** and
 * put the lit floor 20 L* ABOVE the stone it is cut from — a bleached cream room, where the unlit half of
 * the same map kept its grain. `color-dodge` DIVIDES instead (`backdrop / (1 − blend)`), which is a scale:
 * the art's ratios come through it, so the stone stays stone. Same measurement, same brightness: **102%**.
 *
 * WHICH IS WHY THESE STOPS ARE NOT WHITE-HOT. Under a dodge, any channel at 255 divides by zero and blows
 * that channel out — a near-white lamp turns the floor to paper, and a saturated one to neon (a 255-red
 * torch measured chroma 39 against the art's 9). A warm-leaning near-neutral is a finite scale per channel,
 * and because red is scaled a little harder than blue it comes out WARM without any of the light being
 * orange: chroma 22 on a floor painted at 9. The alpha ramp is the falloff, and only the falloff — one
 * flame, less of it further off.
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
 * THE EDGE WAS THE DEFECT, NOT THE LIGHT. The place is lit by rule — a room lights whole, a passage as far
 * as its next turn — and the rule is drawn as a union of cell squares, so the lamp ended on a STAIRCASE OF
 * RIGHT ANGLES: a straight vertical cut down a corridor's flanks, a step at every turn. Nothing in the
 * picture accounts for such a line. Hard-edged light means an opaque thing casting it, and there is none
 * here, so the eye reads the bright part as a tile that has been coloured in rather than as ground a lamp
 * is falling on. It is why a lit room could be dimmer AND flatter-looking than the dark one beside it while
 * every value in it was correct.
 *
 * Half a wall band. Small enough that the place is still the place — the light does not creep into the
 * next room, and what it does reach past its own cells is the band of wall standing around them, which is
 * the one surface a lamp in the middle of a room is certainly lighting. Large enough that no straight run
 * of the cut survives it: at this radius the falloff spans about a fifth of a cell, so the corner of a
 * chamber rounds off and the flank of a corridor stops being a ruled line. */
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
 * How far each pass of the light lifts the place it falls on. THE LIGHT FALLS IN THE SAME TWO PASSES THE
 * SHADE DOES (FloorShade), and it has to, or the second wash simply takes the lamp back.
 *
 * The full pass lands on the floor under the click markers. The second lands after the shade's own second
 * pass, over the furniture and the player standing in the room — and without it they were the only things
 * on the map that the lamp never reached: the shade's second pass put a quarter of the tier's night back
 * over everything the first pass had lit, which on starter stone took the lit floor from 114 down to 89
 * and the explorer to 65 — a hero DARKER than the ground under their own feet.
 *
 * The two together are what give the map a top end at all. Before them nothing on the map was bright: the
 * lit floor came out at 89–106 of 255, which on four of the five ranks is DIMMER than the bare slab art
 * the tier is cut from. The light was only ever less dark. It now lands at 125–137 against an unlit 43–67,
 * so a lit room reads brighter than the stone rather than a shade less black than the rest of it.
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
 * The tier's own night, lying over the whole floor.
 *
 * WITHOUT IT THE MAP HAS NO VALUE RANGE: every explored cell was drawn at full brightness whether
 * anything lit it or not, so slab, wall face and void all landed within one narrow band and the
 * picture read as a floorplan rather than as a place. The light that was there — the lit place, a
 * torch's pool — had nothing to be bright AGAINST.
 *
 * A flat wash rather than a `multiply` blend, and both halves of that are deliberate. Alpha over the
 * top lifts the blacks instead of crushing them, which is what keeps the layout readable when the
 * player pulls back to look at the floor as a map; and it is one composited box rather than a second
 * full-map blend group, which `docs/instructions/map-rendering.md` asks for.
 *
 * IT FALLS IN TWO PASSES, because the map has one layer that must not go dark with the rest of it.
 * The full pass lies under the click markers — the markers are what the player reads the floor BY, and
 * washing them with everything else costs them most of their contrast against the stone (a measured
 * 3.8 down to 2.2). The second, lighter pass lies over everything, so that the furniture standing on
 * the floor is seated in the same dark it stands in rather than cut out of it, and the markers pay a
 * quarter of the wash instead of all of it — which, because the floor under them took both passes,
 * leaves them further clear of it than before the shade existed at all.
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
