import { hashUnit } from "@/support/hashString"
import type { Mood } from "./moodSettings"
import { CELL, WALL_FACE_H, cellCenter } from "./mapScale"
import { sharedTileUrl } from "./tileAssets"

// The air, drawn in three layers over the stone: what is carried on it (drift), what lives in it (life),
// and what colour it is (tint). All of it CSS-animated rather than driven from React — a mote that
// re-rendered the map every frame would cost more than everything else the map draws, and the compositor
// can move a hundred of these for nothing.
//
// The layers are split because they sit at different depths: scarabs are ON the floor and belong under the
// props and icons, while drift and tint are between the player and the world and belong over everything.

const MOTE_CLASS = "map-mote"
const SCARAB_CLASS = "map-scarab"

// One shared stylesheet for the whole map. `translate` only, so every frame is compositor work.
//
// A mote fades in and out across its crossing, which is what hides the jump when the animation loops —
// the alternative is wrapping each one by hand every frame, in JS, for no visible gain.
//
// Reduced motion stops all of it. This is ambience: it says nothing the player needs, so it is exactly the
// kind of movement someone who asked for less of it should not have to watch.
const MOOD_CSS = `
.${MOTE_CLASS} { animation: map-drift linear infinite; }
.${SCARAB_CLASS} { animation: map-scurry steps(5, end) infinite; }
@keyframes map-drift {
  0% { transform: translate(0, 0); opacity: 0; }
  15% { opacity: var(--o, 0.5); }
  85% { opacity: var(--o, 0.5); }
  100% { transform: translate(var(--dx, -160px), var(--dy, 70px)); opacity: 0; }
}
@keyframes map-scurry {
  0% { transform: translate(0, 0); }
  25% { transform: translate(var(--sx, 16px), var(--sy, 5px)); }
  50% { transform: translate(calc(var(--sx, 16px) * 0.6), calc(var(--sy, 5px) * -1.4)); }
  75% { transform: translate(calc(var(--sx, 16px) * -0.5), calc(var(--sy, 5px) * 0.8)); }
  100% { transform: translate(0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .${MOTE_CLASS}, .${SCARAB_CLASS} { animation: none; }
}
`

const rand = hashUnit

/**
 * How solid a tuft in a floor joint is drawn.
 *
 * The sprite is the same drawing the wall uses, and on the paving at full strength it read as a second
 * crop of roots lying flat rather than as something growing out of a joint. Faint, it is a texture the
 * floor has taken on — and the wall's roots, which stay solid, are then unmistakably the other thing.
 *
 * Only the JOINTS take it. A root through the brick and a plant standing in a chamber are objects, and an
 * object you can see through is a ghost.
 */
const TUFT_OPACITY = 0.3

/**
 * A sprite turned about ITS OWN CENTRE, which on an SVG element is not what a bare transform does.
 *
 * `transform-box` defaults to `view-box`, so a CSS transform on an `<image>` is measured against the
 * whole SVG viewport rather than the element — and `scaleX(-1)`, which this file used alone, therefore
 * mirrored each sprite across the MIDDLE OF THE MAP instead of flipping it in place. A tuft authored in
 * the west corner of a wide floor was drawn in the east one, with `isLit` still answering for the cell it
 * came from, so half the growth on every floor was in the wrong place and some of it in the dark.
 *
 * `fill-box` with a centre origin is the fix, and it is also what makes a rotation usable at all.
 */
const turned = (degrees: number, mirrored: boolean) => ({
  transformBox: "fill-box" as const,
  transformOrigin: "center" as const,
  transform: `rotate(${degrees.toFixed(1)}deg)${mirrored ? " scaleX(-1)" : ""}`,
})

type Props = {
  mood: Mood
  siteId: string
  width: number
  height: number
  /**
   * EVERY floor cell of the floor, lit or not, in a fixed order — not just the explored ones.
   *
   * A scarab picks its cell by index into this list, so the list cannot be allowed to grow: indexing the
   * LIT cells meant every reveal lengthened it and every scarab landed somewhere else, teleporting across
   * the map each time the player opened up another corridor. The beetle was always there; the player just
   * had not seen that corner yet, and that is what `isLit` is for.
   */
  floorCells: ReadonlyArray<readonly [number, number]>
  /** Cells with a wall BAND above them — void to the north. Where a root can come through. */
  wallCells?: ReadonlyArray<readonly [number, number]>
  /** A chamber's claimed floor: room for a plant that is not in the player's way. */
  chamberCells?: ReadonlyArray<readonly [number, number]>
  /** Whether the player has seen that cell yet. A scarab in the dark is simply not drawn. */
  isLit: (row: number, col: number) => boolean
}

/**
 * What is growing on the stone, drawn with the scarabs and under everything that stands on it.
 *
 * The same trick `MapLife` uses and for the same reason: ONE shared sprite in `tiles/default/`, placed
 * by index into the fixed floor-cell list, so a rank costs no files and a reveal cannot make anything
 * jump. Still rather than scurrying — a weed in a corner does not run — and nudged toward the top of its
 * cell, where the wall band is: what makes a vine read as a vine rather than as a plant in a pot is that
 * it came THROUGH the wall, and the band above a cell is the only wall the map draws.
 *
 * Draws nothing until the sprite exists, which is deliberate: the condition can be authored, composed
 * and seen as a wash before a single file is painted.
 */
export const MapGrowth = ({
  mood,
  siteId,
  floorCells,
  wallCells = [],
  chamberCells = [],
  isLit,
}: Omit<Props, "width" | "height">) => {
  const g = mood.growth
  if (!g?.floor && !g?.wall && !g?.chamber) return null
  // One sprite per PLACE, falling back to the plain one where the other two are not drawn yet. The
  // fallback is deliberate: it lets the placement be judged — whether the roots sit in the right part of
  // the band, whether a chamber plant is the right size — before anyone paints a root. Same argument as
  // drawing the condition as a wash before any sprite existed at all.
  const tuft = sharedTileUrl(g.kind)
  if (!tuft) return null
  const root = sharedTileUrl(`${g.kind}-wall`) ?? tuft
  const plant = sharedTileUrl(`${g.kind}-plant`) ?? tuft
  /**
   * WHICH cells grow, at a density of `per` — 1 being every one of them.
   *
   * Drawn WITHOUT REPLACEMENT, which is what a density needs and a random index cannot give: picking a
   * cell per sprite, at one sprite per cell, leaves about a third of the floor bare and stacks the rest
   * two deep. So the list is put in a fixed hash order once and the front of it is taken. Scaling the
   * density down then takes strictly fewer cells and moves none of the ones that stay, which is what
   * makes the number safe to tune.
   *
   * Each cell keeps its ORIGINAL index as the seed for its own size and jitter, so those do not move
   * either when the density changes.
   */
  const grown = (cells: ReadonlyArray<readonly [number, number]>, salt: string, per: number) => {
    if (cells.length === 0 || per <= 0) return []
    const ordered = cells
      .map((cell, index) => ({ cell, index, order: rand(siteId, salt, index) }))
      .sort((a, b) => a.order - b.order)
    // At least one, because a density that rounds to nothing still means "this is happening here" — the
    // roots are the part that says a building is losing and must not be the first thing to round away.
    return ordered.slice(0, Math.max(1, Math.round(per * cells.length)))
  }
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      {/* ── the JOINTS: many, small, on any floor cell, and FAINT ──
          `TUFT_OPACITY`, because at one per cell and full strength they stopped being joints and started
          being a second crop of wall roots lying on the paving. Faint, they go back to being what they
          are: a texture the floor has taken on, read as ground rather than as objects standing on it, and
          told apart at a glance from the roots through the band, which stay solid because a root coming
          through brick is the thing that is supposed to stop you. */}
      {grown(floorCells, "growth-cell", g.floor).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const size = 12 + rand(siteId, "growth-size", i) * 10
        return (
          <image
            key={`tuft-${i}`}
            href={tuft}
            x={cx - size / 2 + (rand(siteId, "growth-x", i) - 0.5) * (CELL * 0.7)}
            // ACROSS THE CELL, not up it. These used to be pushed toward the wall band — the thing they
            // were meant to be coming out of — which put every one of them in the cell's top third and
            // some over the band itself. On a ROOM that is invisible, because the room's own plants fill
            // the middle; on a CORRIDOR, which is most of a floor, it left the paving bare with a line of
            // green along the wall above it, and read as growth that only happens in rooms. The roots
            // through the band say "out of the wall" on their own; a tuft is in a joint, and joints are
            // everywhere.
            y={cy - size / 2 + (rand(siteId, "growth-y", i) - 0.5) * (CELL * 0.7)}
            width={size}
            height={size}
            opacity={TUFT_OPACITY}
            // ANY angle: a tuft in a joint is seen from above and has no up. It is also what stops a
            // floor of them reading as one stamp repeated, which at this density is what they were.
            style={turned(rand(siteId, "growth-rot", i) * 360, rand(siteId, "growth-flip", i) > 0.5)}
          />
        )
      })}
      {/* ── the WALL: roots through the band above a cell ──
          `wallCells` is only the cells with a band drawn above them (void to the north), because a root
          has to come THROUGH something the map actually draws.

          IT FILLS THE BRICK EXACTLY — under the coping, down to the floor line. Two things were wrong
          before, and they were opposite. Hanging past the bottom (the band is WALL_H and the sprite was
          34 to 52) put the overshoot in mid-air over the paving with nothing to have grown out of, so the
          whole sprite read as floating. Anchoring to the band's TOP then started it on the coping —
          `FACE_CAP` of a face is its own flat top surface, seen from above, and nothing grows out of that.
          A root that begins there is hung on the wall rather than come through it.

          So it runs the part of the band that is BRICK, and the variance it used to carry in height lives
          in the width instead. */}
      {grown(wallCells, "growth-wall-cell", g.wall).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const w = 16 + rand(siteId, "growth-wall-w", i) * 18
        return (
          <image
            key={`root-${i}`}
            href={root}
            preserveAspectRatio="none"
            x={cx - w / 2 + (rand(siteId, "growth-wall-x", i) - 0.5) * (CELL * 0.6)}
            y={cy - CELL / 2 - WALL_FACE_H}
            width={w}
            height={WALL_FACE_H}
            // A LEAN, not a turn: a root hangs, so gravity decides which way is down and only the flip
            // and a few degrees either side are free.
            style={turned((rand(siteId, "growth-wall-rot", i) - 0.5) * 14, rand(siteId, "growth-wall-flip", i) > 0.5)}
          />
        )
      })}
      {/* ── the CHAMBERS: a few big ones, and only where there is room to stand ──
          Passages are excluded by construction, `chamberCells` being the claimed footprints: a plant half
          a cell across in a corridor is something the player would have to walk through. Bottom-anchored
          like a prop, so it stands on the floor instead of floating in the cell. */}
      {grown(chamberCells, "growth-plant-cell", g.chamber).map(({ cell: [row, col], index: i }) => {
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const size = 30 + rand(siteId, "growth-plant-size", i) * 16
        return (
          <image
            key={`plant-${i}`}
            href={plant}
            x={cx - size / 2 + (rand(siteId, "growth-plant-x", i) - 0.5) * (CELL * 0.4)}
            y={cy + CELL / 2 - size}
            width={size}
            height={size}
            // Standing, so the same small lean the roots take rather than a turn.
            style={turned((rand(siteId, "growth-plant-rot", i) - 0.5) * 10, rand(siteId, "growth-plant-flip", i) > 0.5)}
          />
        )
      })}
    </g>
  )
}

/** Scarabs: on the floor, under everything that stands on it. */
export const MapLife = ({ mood, siteId, floorCells, isLit }: Omit<Props, "width" | "height">) => {
  const url = sharedTileUrl("scarab")
  if (!mood.life || !url || floorCells.length === 0) return null
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      {Array.from({ length: mood.life }, (_, i) => {
        // Each one keeps to a cell of real floor, so nothing ever scurries into the stone.
        const [row, col] = floorCells[Math.floor(rand(siteId, "scarab-cell", i) * floorCells.length)]
        if (!isLit(row, col)) return null
        const { cx, cy } = cellCenter(row, col)
        const away = rand(siteId, "scarab-dir", i) > 0.5 ? 1 : -1
        return (
          <image
            key={i}
            className={SCARAB_CLASS}
            href={url}
            x={cx - 7 + (rand(siteId, "scarab-x", i) - 0.5) * (CELL / 2)}
            y={cy - 5 + (rand(siteId, "scarab-y", i) - 0.5) * (CELL / 2)}
            width={14}
            height={10}
            style={
              {
                "--sx": `${away * (10 + rand(siteId, "scarab-run", i) * 14)}px`,
                "--sy": `${(rand(siteId, "scarab-side", i) - 0.5) * 16}px`,
                animationDuration: `${5 + rand(siteId, "scarab-speed", i) * 6}s`,
                animationDelay: `-${rand(siteId, "scarab-phase", i) * 8}s`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </g>
  )
}

/** Drift and tint: between the player and the world, so over everything the map draws. */
export const MapWeather = ({ mood, siteId, width, height }: Omit<Props, "floorCells" | "isLit">) => {
  const { drift, tint } = mood
  if (!drift && !tint) return null
  return (
    <g aria-hidden="true" style={{ pointerEvents: "none" }}>
      <style>{MOOD_CSS}</style>
      {drift &&
        Array.from({ length: drift.count }, (_, i) => (
          <circle
            key={i}
            className={MOTE_CLASS}
            cx={rand(siteId, "mote-x", i) * width}
            cy={rand(siteId, "mote-y", i) * height}
            r={drift.size * (0.6 + rand(siteId, "mote-r", i) * 0.8)}
            fill={drift.fill}
            style={
              {
                "--o": drift.opacity,
                // Blown across and down, at its own angle and pace — one vector for all of them reads as a
                // sheet of rain rather than as air.
                "--dx": `${-(60 + rand(siteId, "mote-dx", i) * 200)}px`,
                "--dy": `${(rand(siteId, "mote-dy", i) - 0.35) * 120}px`,
                animationDuration: `${drift.seconds * (0.7 + rand(siteId, "mote-s", i) * 0.6)}s`,
                // Negative delay: they are already mid-crossing on the first frame, rather than all
                // starting together in a wave.
                animationDelay: `-${rand(siteId, "mote-d", i) * drift.seconds}s`,
              } as React.CSSProperties
            }
          />
        ))}
      {/* Last, so the hour lies over the motes as well as the stone. */}
      {tint && <rect width={width} height={height} fill={tint.fill} opacity={tint.opacity} />}
    </g>
  )
}
