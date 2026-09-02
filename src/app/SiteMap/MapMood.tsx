import { hashString } from "@/support/hashString"
import type { Mood } from "./moodSettings"
import { CELL, cellCenter } from "./mapScale"
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

/** A deterministic 0..1 from a name, so the air is the same every time a floor is drawn — a mote that
 * moved when the player opened a chest would read as something happening.
 *
 * The avalanche matters. `hashString` is `hash * 31 + char`, so two names differing only in their last
 * character hash one apart, and reducing that straight to a fraction put all three scarabs on the same
 * floor tile, 0.003 of a cell apart. Mixing the bits down from the top is what makes an index into a
 * position rather than into a neighbour. */
const rand = (siteId: string, salt: string, i: number): number => {
  let h = hashString(`${siteId}:${salt}:${i}`)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

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
  /** Whether the player has seen that cell yet. A scarab in the dark is simply not drawn. */
  isLit: (row: number, col: number) => boolean
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
