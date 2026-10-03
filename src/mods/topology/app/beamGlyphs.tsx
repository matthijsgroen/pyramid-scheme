import clsx from "clsx"
import type { FC, ReactNode } from "react"
import { DIRECTIONS, directionStep, type Direction, type MirrorAngle } from "@/mods/core/game/beam/physics"

// What a board of light is drawn OUT OF: the disc, a mirror, a shrine. Every family in this mod whose
// puzzle is "steer the light to there" draws the same three, so a player who has learned to read one
// board has learned to read all of them — and a mirror that turned one way in the corridor and the
// other way in a fork would be two mechanics wearing one picture.
//
// Drawn rather than lettered, each on its own 100-unit square so it scales with the cell.

export const Glyph: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <svg viewBox="0 0 100 100" className={clsx("size-full overflow-visible", className)}>
    {children}
  </svg>
)

/**
 * How far to turn the glyph, in SVG degrees — clockwise, because the y axis points down, from a stop
 * counted in eighth-turns anticlockwise.
 *
 * A mirror line is the same line half a turn later, so every stop has two representatives and **which
 * one is drawn decides which way the piece appears to turn**. Folding into (−90°, 90°] is what makes each
 * tap the short way round: `/`→`\\` stays the clockwise quarter turn it has always been, and a cut mirror
 * swings 67.5° rather than 112.5° back the other way. Get this wrong and nothing looks wrong in a still
 * frame — it only shows in motion, which is where a tap is read.
 */
const glyphTurn = (angle: MirrorAngle): number => {
  const turn = (-angle * 22.5) % 180
  return turn <= -90 ? turn + 180 : turn > 90 ? turn - 180 : turn
}

/**
 * A mirror: one canonical bar turned into place, so changing setting is a turn the eye can follow, and a
 * tick at each stop it is *not* in. The bar is where it stands, the ticks are where else it goes.
 *
 * A stop folds to one bearing in [0°, 180°), since a mirror line is the same line half a turn later. The
 * tick lies across that bearing, never along it: a radial tick would be collinear with the beam whenever a
 * stop's line is the line the beam leaves on, and the beam draws over pieces with `mix-blend-screen`.
 * `LightbeamBoard.spec.tsx` asserts both.
 */
export const Mirror: FC<{ angle: MirrorAngle; stops: readonly MirrorAngle[]; movable: boolean }> = ({
  angle,
  stops,
  movable,
}) => (
  <Glyph>
    <g
      className="origin-center transition-transform duration-200 ease-out"
      style={{ transform: `rotate(${glyphTurn(angle)}deg)` }}
    >
      <line
        x1={4.75}
        y1={50}
        x2={95.25}
        y2={50}
        strokeWidth={14}
        strokeLinecap="round"
        className={movable ? "stroke-sky-200" : "stroke-stone-400"}
      />
    </g>
    <g>
      {stops
        .filter(stop => stop !== angle)
        .map(stop => {
          const bearing = ((glyphTurn(stop) + 180) % 180) * (Math.PI / 180)
          const [dx, dy] = [Math.cos(bearing), Math.sin(bearing)]
          const [ax, ay] = [50 + 42 * dx, 50 + 42 * dy]
          return (
            <line
              key={stop}
              x1={ax + 9 * dy}
              y1={ay - 9 * dx}
              x2={ax - 9 * dy}
              y2={ay + 9 * dx}
              strokeWidth={9}
              strokeLinecap="round"
              className={movable ? "stroke-sky-400/70" : "stroke-stone-500/70"}
            />
          )
        })}
    </g>
  </Glyph>
)

const round = (n: number): number => Math.round(n * 100) / 100

/** The nose that says which way the light leaves: one triangle built from the direction, for all eight. */
const nosePoints = (direction: Direction): string => {
  const { row, col } = directionStep(direction)
  const scale = Math.hypot(row, col)
  const [dx, dy] = [col / scale, row / scale]
  const point = (along: number, across: number): string =>
    `${round(50 + dx * along - dy * across)},${round(50 + dy * along + dx * across)}`
  return `${point(46, 0)} ${point(24, 16)} ${point(24, -16)}`
}

const NOSE: readonly string[] = DIRECTIONS.map(nosePoints)

export const SunDisc: FC<{ facing: Direction }> = ({ facing }) => (
  <Glyph>
    <circle cx={50} cy={50} r={30} className="fill-amber-300" />
    <circle cx={50} cy={50} r={30} className="fill-amber-100/40" />
    {/* The nose says which way the light leaves, which is half of what the player has to know. */}
    <polygon points={NOSE[facing]} className="fill-amber-300" />
  </Glyph>
)

/** A niche cut in the wall. Dark until the light arrives, then it is the whole point of the board. */
export const Shrine: FC<{ lit: boolean; flaring?: boolean }> = ({ lit, flaring }) => (
  <Glyph className={clsx(flaring && "animate-flare")}>
    <path
      d="M22 92 L22 46 A28 28 0 0 1 78 46 L78 92 Z"
      strokeWidth={8}
      className={clsx(lit ? "fill-amber-200 stroke-amber-100" : "fill-stone-900 stroke-stone-400")}
    />
    {lit && <circle cx={50} cy={56} r={40} className="fill-amber-200/30" />}
  </Glyph>
)
