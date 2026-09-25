import type { CSSProperties } from "react"
import { hashUnit } from "@/support/hashString"
import type { FloorGrid } from "@/game/siteTypes"
import { CELL, WALL_H, cellLeft, cellTop } from "./mapScale"
import { boundsOf, rectsToPath, type Rect } from "./tileRegions"
import { ClipLayer } from "./htmlLayers"
import type { RoomClaims } from "./roomClaims"
import { LightGroup, LitPlace, type LightFill } from "./torchlight"
import { BEAM_STRENGTH, LIT_STANDING_STRENGTH, LIT_STRENGTH } from "./lighting"
import { SPECKS } from "./MapMood"

// A HOLE IN A ROOF, AND WHAT COMES THROUGH IT. Where the shafts are is `beamShafts` in lighting.ts; this
// file is the three things one draws — the room it lights, the cone of dust standing in it, and the motes
// turning inside the cone.

/**
 * The colour of daylight, against the torch's `TORCH_FILL` of 160,150,134.
 *
 * COOLER THAN FIRELIGHT AND STILL NOT COLD. Under `color-dodge` a fill is a per-channel scale of
 * `1/(1−c)`, so the light's character is the RATIO between its channels: the torch's are 2.68/2.43/2.11,
 * warm by a quarter. This fill's are the geometric midpoint between those and a neutral light of the same
 * overall strength — daylight carries half the torch's warmth (r−b of 13 against 26) because the dust in
 * the shaft scatters it warm on the way down, and a light with no warmth in it does not read as light.
 *
 * NO CHANNEL AT 255: a dodge divides by `1−c`, so a maxed channel divides by zero and blows the floor to
 * paper.
 *
 * Measured on the art through the renderer's own operators, the beamed floor keeps more of the stone's
 * own colour than the torch leaves it: starter lands at C* 17.7 / 79° against the torch's 22.0 / 81° over
 * an unlit 6.6 / 75°, and on expert — where the torch cancels the blue outright, C* 5.5 down to 2.3 with
 * the hue flipped to 105° — the beam leaves it cold at 3.8 / 248°.
 */
const BEAM_FILL: LightFill = [154, 149, 141]

/** The dust standing in the shaft, and how thick it is at the slot and at the floor.
 *
 * NOT A LIGHT — a veil. The cone is between the eye and the room rather than falling on a surface, so it
 * ADDS its own colour over whatever it lies in front of (`art × (1−a) + veil × a`, the same operator the
 * night is drawn with, read from the other end) instead of scaling it. That also keeps it out of a blend
 * group of its own, which a `screen` or a second `color-dodge` would cost.
 *
 * Its value is held at 230, the ceiling the art's own highlights already sit at — brighter clips them
 * flat, and dust catching the sun is the brightest thing in the room. Measured over a beamed starter
 * floor at L* 54.1, the slot end lands at 61.3 and the foot at 55.9: about a quarter of the 30.3 the
 * beam itself is worth, so the shaft reads against the light it stands in and dies into the pool rather
 * than ending on it. */
const DUST = "230,223,211"
const DUST_AT_SLOT = 0.2
const DUST_AT_FLOOR = 0.05

/** How wide the shaft is where it comes through and where it lands, as a share of the cell.
 *
 * A slot, not a skylight: the hole is a gap in the roofing slabs and the cone spreads on the way down.
 * The foot stops short of the cell's own edges, so the shaft stands IN the room rather than filling it —
 * what fills the room is the light, which is the lit place. */
const SLOT_WIDTH = 0.26
const FOOT_WIDTH = 0.92

/** How many slices the cone is cut from. `ClipLayer` takes rectangles, so a sloping edge is a staircase —
 * at this count each step is 1.3 units against a feather of 9, which the blur takes out entirely. */
const CONE_SLICES = 14

/** How far the cone's edge is softened. A third of a wall band — less than the light's own feather, which
 * has a whole room's cut to hide, and more than the 1.3 units a slice steps by, so the staircase goes and
 * the shaft keeps a shape. Dust has no edge. */
const CONE_FEATHER = WALL_H / 3

/** How many specks turn in one shaft. The air of the whole floor is `drift` (MapMood) and is drawn across
 * the SCREEN; these belong to the shaft, so they are in map space and move with it. A few, because what
 * makes dust read here is that it is lit — the cone is already the thing the eye lands on. */
const BEAM_MOTES = 4
const MOTE_CLASS = "absolute rounded-full will-change-transform animate-map-drift motion-reduce:animate-none"

/** The quad from the ceiling slot down to the floor of the cell it lands in, as slices.
 *
 * It starts at the top of the wall band — the highest stone the map draws above a cell, and so the only
 * ceiling this projection has — and ends on the cell's own floor line. */
const coneRects = (row: number, col: number): Rect[] => {
  const cx = cellLeft(col) + CELL / 2
  const top = cellTop(row) - WALL_H
  const height = CELL + WALL_H
  return Array.from({ length: CONE_SLICES }, (_, i) => {
    const t = (i + 0.5) / CONE_SLICES
    const w = CELL * (SLOT_WIDTH + (FOOT_WIDTH - SLOT_WIDTH) * t)
    return [cx - w / 2, top + (height * i) / CONE_SLICES, w, height / CONE_SLICES] as Rect
  })
}

const cellOf = (key: string): readonly [number, number] => {
  const [row, col] = key.split(",").map(Number)
  return [row, col]
}

/**
 * The rooms the shafts light — a static lit place per shaft, so a beamed room reads from the doorway.
 *
 * `LitPlace` given a cell of a chamber lights the chamber's whole footprint, which is why a shaft needs
 * nothing of its own here. Two passes, as the torch has two: the floor, and then a lighter one over the
 * shade that seats what stands, so a statue in the beam is lit to the top of its own headroom.
 *
 * A SHAFT HANDS OVER TO THE LAMP RATHER THAN ADDING TO IT. `BEAM_STRENGTH` and `LIT_STRENGTH` are solved
 * to the same top end, so where the explorer's own lit place covers a beamed room the shaft's light fades
 * out as the lamp's fades in and the room never changes value — `leaving` being the same crossfade the
 * lamp already uses between one place and the next.
 */
export const BeamLight = ({
  grid,
  claims,
  shafts,
  torchPlace,
  headroom = false,
}: {
  grid: FloorGrid
  claims: RoomClaims
  shafts: readonly string[]
  /** The cells the explorer's own lamp is lighting. */
  torchPlace: ReadonlySet<string>
  headroom?: boolean
}) => {
  if (shafts.length === 0) return null
  return (
    <LightGroup>
      {shafts.map(key => (
        <LitPlace
          key={key}
          grid={grid}
          claims={claims}
          at={cellOf(key)}
          source="beam"
          fill={BEAM_FILL}
          strength={headroom ? (BEAM_STRENGTH * LIT_STANDING_STRENGTH) / LIT_STRENGTH : BEAM_STRENGTH}
          headroom={headroom}
          leaving={torchPlace.has(key)}
        />
      ))}
    </LightGroup>
  )
}

/**
 * The cones, and the dust turning in them. Over everything standing: a shaft of dust is in front of a
 * statue, not behind it.
 */
export const BeamShafts = ({ shafts, siteId }: { shafts: readonly string[]; siteId: string }) => {
  if (shafts.length === 0) return null
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {shafts.map((key, shaft) => {
        const rects = coneRects(...cellOf(key))
        const box = boundsOf(rects)
        return (
          <div key={key}>
            <ClipLayer
              data-beam-shaft={key}
              rects={rects}
              feather={CONE_FEATHER}
              fill={`linear-gradient(to bottom, rgba(${DUST},${DUST_AT_SLOT}), rgba(${DUST},${DUST_AT_FLOOR}))`}
            />
            {/* The motes take the cone's shape as a clip of their own, so one that wanders off its line
                is cut at the edge of the shaft instead of turning up in the dark beside it. */}
            <div
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                clipPath: `path("${rectsToPath(rects, [box.x, box.y])}")`,
              }}
            >
              {Array.from({ length: Math.ceil(BEAM_MOTES / SPECKS) }, (_, i) => {
                const seed = shaft * BEAM_MOTES + i
                const riders = Math.min(SPECKS, BEAM_MOTES - i * SPECKS)
                const sizeOf = (n: number) => 1.1 + hashUnit(siteId, "beam-mote-r", seed * SPECKS + n) * 1.7
                const size = sizeOf(0)
                return (
                  <div
                    key={i}
                    className={MOTE_CLASS}
                    style={
                      {
                        left: `${hashUnit(siteId, "beam-mote-x", seed) * 100}%`,
                        top: `${hashUnit(siteId, "beam-mote-y", seed) * 100}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        background: `rgb(${DUST})`,
                        boxShadow:
                          Array.from({ length: riders - 1 }, (_, n) => {
                            const k = seed * SPECKS + n + 1
                            const ox = (hashUnit(siteId, "beam-speck-x", k) - 0.5) * CELL * 0.5
                            const oy = (hashUnit(siteId, "beam-speck-y", k) - 0.5) * CELL
                            return `${ox.toFixed(1)}px ${oy.toFixed(1)}px 0 ${((sizeOf(n + 1) - size) / 2).toFixed(2)}px rgb(${DUST})`
                          }).join(", ") || undefined,
                        "--o": `${0.5 + hashUnit(siteId, "beam-mote-o", seed) * 0.3}`,
                        // DOWN THE SHAFT, not across the screen: these are in map space, and what dust in
                        // a beam does is settle. A few units of sideways is the draught that turns it.
                        "--dx": `${(hashUnit(siteId, "beam-mote-dx", seed) - 0.5) * 12}px`,
                        "--dy": `${14 + hashUnit(siteId, "beam-mote-dy", seed) * 16}px`,
                        "--wob": `${3 + hashUnit(siteId, "beam-mote-w", seed) * 5}px`,
                        animationDuration: `${9 + hashUnit(siteId, "beam-mote-s", seed) * 8}s`,
                        animationDelay: `-${hashUnit(siteId, "beam-mote-d", seed) * 12}s`,
                      } as CSSProperties
                    }
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
