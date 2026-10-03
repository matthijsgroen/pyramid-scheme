import clsx from "clsx"
import type { FC } from "react"
import {
  cellKey,
  directionStep,
  opposite,
  sameCell,
  TURN_ANGLES,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"
import { Mirror, Shrine, SunDisc } from "@/mods/topology/app/beamGlyphs"
import { traceBeam, type BeamSegment, type ShrineGrid } from "@/mods/topology/game/shrineBeam/shrineBeam"

// A board of mirrors with shrines standing on it, drawn. The shared half of every family whose puzzle is
// "steer the light to one of these": the grid, the pieces, the beam over them, and the tap targets. What
// the shrines MEAN is the family's own business and is drawn around this, not in it.

/** Where a beam travelling `direction` crosses a cell's edge. */
const sidePoint = (at: CellRef, direction: Direction): [number, number] => {
  const { row, col } = directionStep(direction)
  return [at.col + (col === 0 ? 0.5 : col > 0 ? 1 : 0), at.row + (row === 0 ? 0.5 : row > 0 ? 1 : 0)]
}

const segmentPoints = (segment: BeamSegment): string => {
  const centre: [number, number] = [segment.at.col + 0.5, segment.at.row + 0.5]
  const points = [sidePoint(segment.at, opposite(segment.enter)), centre]
  if (segment.exit !== undefined) points.push(sidePoint(segment.at, segment.exit))
  return points.map(([x, y]) => `${x},${y}`).join(" ")
}

/** The light, over the pieces: a beam that stopped under a glyph would read as a beam that stopped short. */
const BeamLayer: FC<{ size: number; path: readonly BeamSegment[] }> = ({ size, path }) => (
  <svg
    viewBox={`0 0 ${size} ${size}`}
    className="pointer-events-none absolute inset-0 z-20 size-full mix-blend-screen"
    aria-hidden
  >
    {path.map(segment => (
      <polyline
        key={`${cellKey(segment.at)},${segment.enter}`}
        points={segmentPoints(segment)}
        fill="none"
        strokeWidth={0.09}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-amber-200"
      />
    ))}
  </svg>
)

/**
 * How far a mirror's tap target reaches past its own cell, per side — the full 5px onto a neighbour that
 * holds no mirror, and nothing at all onto one that does.
 *
 * A cell on a wizard board is about 37px on a 360px screen, under the 44px bar
 * (docs/instructions/puzzle-screens.md), so the target has to grow. Lightbeam grows its by refusing any
 * board whose pieces touch; a shrine board cannot — several branches of one fork share a small grid — so
 * it grows only into the space the board actually leaves free.
 *
 * Only the four square neighbours are asked. Two diagonal mirrors still overlap, in the 5px square at the
 * corner they share — a place a thumb aimed at either one does not land.
 */
const tapInset = (mirrorCells: ReadonlySet<string>, at: CellRef): string =>
  (
    [
      { row: at.row - 1, col: at.col },
      { row: at.row, col: at.col + 1 },
      { row: at.row + 1, col: at.col },
      { row: at.row, col: at.col - 1 },
    ] as CellRef[]
  )
    .map(beside => (mirrorCells.has(cellKey(beside)) ? "0px" : "-5px"))
    .join(" ")

type Props = {
  grid: ShrineGrid
  /** Where the shrines stand, in the order the family names them. */
  shrines: readonly CellRef[]
  /** How every mirror lies — the player's answer. */
  angles: readonly MirrorAngle[]
  /** Labels the shrine at that index for a screen reader; the board itself says nothing about them. */
  shrineLabel?: (shrine: number) => string
  onTurn: (mirror: number) => void
}

export const ShrineBeamBoard: FC<Props> = ({ grid, shrines, angles, shrineLabel, onTurn }) => {
  const { size, sun, mirrors } = grid
  const walk = traceBeam(grid, shrines, angles)
  const mirrorAt = new Map(mirrors.map((at, index) => [cellKey(at), index]))
  const mirrorCells = new Set(mirrorAt.keys())
  return (
    // `isolate`, so the layering below is this board's own rather than whatever stacking context an
    // ancestor happens to have opened.
    <div className="relative isolate aspect-square w-full select-none">
      <div
        className="grid size-full gap-px"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: size * size }, (_, index) => {
          const at: CellRef = { row: Math.floor(index / size), col: index % size }
          const cls = "relative flex aspect-square min-h-0 items-center justify-center rounded bg-stone-800 p-[8%]"
          const shrine = shrines.findIndex(candidate => sameCell(candidate, at))
          const mirror = mirrorAt.get(cellKey(at))
          if (mirror !== undefined)
            return (
              // `z-10` is what makes the target below reach anything: every cell is positioned, so a
              // later one in reading order paints — and takes taps — over an earlier one's overhang.
              <button key={cellKey(at)} onClick={() => onTurn(mirror)} className={clsx(cls, "z-10")}>
                <Mirror angle={angles[mirror]} stops={TURN_ANGLES} movable />
                {/* The target, reaching past the cell wherever the board leaves room — see tapInset. */}
                <span className="absolute" style={{ inset: tapInset(mirrorCells, at) }} />
              </button>
            )
          return (
            <div key={cellKey(at)} className={cls} aria-label={shrine === -1 ? undefined : shrineLabel?.(shrine)}>
              {shrine !== -1 && <Shrine lit={walk.shrine === shrine} />}
              {sameCell(sun.at, at) && <SunDisc facing={sun.facing} />}
            </div>
          )
        })}
      </div>
      <BeamLayer size={size} path={walk.path} />
    </div>
  )
}
