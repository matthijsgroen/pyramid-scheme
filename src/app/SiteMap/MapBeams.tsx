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
 * Composited off the art through the renderer's own operators, a beamed floor keeps more of the stone's
 * own hue than the torch leaves it — the torch drags starter ochre a couple of degrees and cancels
 * expert's blue outright, where this holds both.
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
 * flat, and dust catching the sun is the brightest thing in the room.
 *
 * IT FADES ON THE WAY DOWN, but nowhere near to nothing. A ray that dies before it lands is a smear of
 * floor with nothing overhead to have cast it, which is what a foot alpha of 0.03 drew; the ray has to
 * survive all the way into the pool for the eye to follow it there. Sampled off the rendered page, a ray
 * mid-air lands at L* 44.8 over a beamed floor of 38.8 — present, and well under the 66.6 of the patch it
 * ends on, so the landing still wins. */
const DUST = "230,223,211"
const DUST_AT_SLOT = 0.3
const DUST_AT_FLOOR = 0.14

/** The patch of floor the rays land on, and how far across it reaches.
 *
 * THE BRIGHTEST THING IN THE PICTURE, and it has to be: light in the air is light that MISSED, and a
 * shaft whose middle outshines its own landing reads as an object lit from within. The volume thins on
 * the way down (`DUST_AT_FLOOR`) and this takes over at the bottom of it — so the eye follows the
 * rays down to where they end, which is the one place the beam touches the room. Sampled off the rendered
 * page it lands at L* 66.6 against the room it sits in at 38.8 and an unlit floor at 27.1.
 *
 * An ellipse, not the parallelogram the geometry says: a hard-edged patch of sun on stone is a decal, and
 * the light arrives through a ragged hole anyway. Wider than tall, because a slanted beam meets the floor
 * at a glancing angle and the patch it makes is stretched along its travel. */
const POOL = 0.52
const POOL_W = 1.35
const POOL_H = 0.55

/** How wide the shaft is where it comes through and where it lands, as a share of the cell.
 *
 * A slot, not a skylight: the hole is a gap in the roofing slabs and the light spreads on the way down.
 * It spreads a long way — a beam that arrives no wider than it started is a bar, not daylight. */
const SLOT_WIDTH = 0.52
const FOOT_WIDTH = 1.3

/** How far the foot lands from the slot, in cells.
 *
 * DAYLIGHT COMES IN AT AN ANGLE, and this is the whole difference between a shaft and a lit pillar. The
 * sun is almost never straight overhead, so the light leaves the hole, crosses the room and lands off to
 * one side — and it is the travel that reads as distance, which is what tells the eye the bright patch is
 * on the FLOOR and the pale volume is in the AIR. Drawn straight down, the two share a centre line and
 * fuse into one upright object standing on the paving.
 */
const SLANT = 0.8

/** How many rays the slot is broken into.
 *
 * A gap in a roof is never one clean aperture: it is slabs with daylight between them, and what comes
 * through is separated shafts that spread until they almost meet at the floor. One solid volume is the
 * other failure of the upright cone — a filled shape reads as a solid, where slats with dark between them
 * can only be light. Three, because two reads as an accident of the geometry and four is a comb. */
const RAYS = 3

/** How much of the slot, and of the landing, is ray rather than gap. Near the roof the slabs dominate;
 * by the floor the rays have spread enough to nearly touch, which is what closes the pool into one patch
 * of light with the slats still legible above it. */
const SLOT_FILL = 0.78
const FOOT_FILL = 0.82

/** How many slices the cone is cut from. `ClipLayer` takes rectangles, so a sloping edge is a staircase —
 * at this count each step is about a unit, which `CONE_FEATHER` takes out entirely. */
const CONE_SLICES = 14

/** How far a ray's edge is softened.
 *
 * SMALLER THAN THE NARROWEST RAY, which is the constraint that sets it. A feather is a blur, and a blur
 * wider than the shape it is softening does not soften that shape, it erases it: at a third of a wall
 * band — nine units — against slats three units across at the slot, the top of every ray dissolved and
 * what was left was a bright smear on the floor with nothing overhead to have cast it. Held under the
 * slot's own slat width (`SLOT_WIDTH`/`SLOT_FILL` below put that at eight), so the narrow end survives
 * while the staircase of the slices, which steps by about a unit, still goes. */
const CONE_FEATHER = 4

/** How many specks turn in one shaft. The air of the whole floor is `drift` (MapMood) and is drawn across
 * the SCREEN; these belong to the shaft, so they are in map space and move with it. A few, because what
 * makes dust read here is that it is lit — the cone is already the thing the eye lands on. */
const BEAM_MOTES = 4
const MOTE_CLASS = "absolute rounded-full will-change-transform animate-map-drift motion-reduce:animate-none"

/** Which way a shaft leans, as −1 or 1.
 *
 * A floor where every shaft leans the same way reads as a rule rather than as weather — the eye picks up
 * the repeat long before it works out what the repeat is.
 *
 * SEEDED OFF THE CELL, not off the shaft's place in the list. There are only ever `MAX_SHAFTS` of them, so
 * an index seed draws the same two or three leans on every floor in the game and a whole rank ends up
 * leaning one way. The cell is the thing that actually differs. */
const leanOf = (siteId: string, key: string) => (hashUnit(siteId, `beam-lean:${key}`, 0) < 0.5 ? -1 : 1)

/** Where a shaft starts, where it lands, and how tall it is. It comes through the roof, at the top of the
 * stone the map draws above a cell, and crosses to a patch of floor `SLANT` of a cell away, on whichever
 * side `lean` puts it. */
const shaftGeometry = (row: number, col: number, lean: number) => {
  const cx = cellLeft(col) + CELL / 2
  const top = cellTop(row) - WALL_H
  return { cx, top, height: WALL_H + CELL * 0.85, footX: cx + CELL * SLANT * lean }
}

/**
 * The rays, as slices: `RAYS` slanted quads from the hole in the roof down to the floor, each one
 * spreading and drifting with the light's own angle.
 *
 * Slices because `ClipLayer` takes rectangles, so an edge that both slopes and leans is a staircase twice
 * over — at this count each step is about a unit, which the feather takes out.
 * All the rays go in ONE clip: they share a gradient and a feather, and a clip per ray would be three
 * elements and three blurs a shaft for a picture the eye reads as one thing.
 */
const rayRects = (row: number, col: number, lean: number): Rect[] => {
  const { cx, top, height, footX } = shaftGeometry(row, col, lean)
  return Array.from({ length: RAYS }, (_, ray) => {
    // Where this ray sits across the slot, from −0.5 at one edge to +0.5 at the other.
    const across = (ray + 0.5) / RAYS - 0.5
    return Array.from({ length: CONE_SLICES }, (_, i) => {
      const t = (i + 0.5) / CONE_SLICES
      const spread = CELL * (SLOT_WIDTH + (FOOT_WIDTH - SLOT_WIDTH) * t)
      const centre = cx + (footX - cx) * t + across * spread
      const w = (spread / RAYS) * (SLOT_FILL + (FOOT_FILL - SLOT_FILL) * t)
      return [centre - w / 2, top + (height * i) / CONE_SLICES, w, height / CONE_SLICES] as Rect
    })
  }).flat()
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
        const [row, col] = cellOf(key)
        const lean = leanOf(siteId, key)
        const rects = rayRects(row, col, lean)
        const box = boundsOf(rects)
        const { top, height, footX } = shaftGeometry(row, col, lean)
        return (
          <div key={key}>
            {/* The patch of sun on the paving, under the rays rather than over them: the dust in the air
                is between the eye and the floor, so what the rays cross they veil. */}
            <div
              data-beam-pool={key}
              style={{
                position: "absolute",
                left: footX - (CELL * POOL_W) / 2,
                top: top + height - (CELL * POOL_H) / 2,
                width: CELL * POOL_W,
                height: CELL * POOL_H,
                background: `radial-gradient(closest-side, rgba(${DUST},${POOL}), rgba(${DUST},0))`,
              }}
            />
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
