import clsx from "clsx"
import type { FC, ReactNode } from "react"
import {
  cellKey,
  opposite,
  pieceCells,
  pieceOccupant,
  traceBeam,
  type BeamSegment,
  type BeamWalk,
  type Blocker,
  type CellRef,
  type Direction,
  type LightbeamPuzzleData,
  type MirrorFace,
} from "@/mods/puzzle/game/lightbeam/beam"

type Props = {
  puzzle: LightbeamPuzzleData
  /** Which state each movable piece is in — the whole of the player's answer. */
  states: readonly number[]
  /** Cell keys ("row,col") the current hint talks about. */
  highlighted?: ReadonlySet<string>
  /** The stretch of beam the current hint is about, drawn over the rest. */
  litBeam?: BeamSegment[]
  onCycle: (piece: number) => void
}

/** What to draw in a cell, once the fixed pieces and the player's settings are both accounted for. */
type CellView =
  | { kind: "empty" }
  | { kind: "sun"; facing: Direction }
  | { kind: "shrine" }
  | { kind: "mirror"; face: MirrorFace; piece?: number }
  | { kind: "wall"; piece?: number }
  /**
   * A stop a sliding piece is not currently standing on. It carries a ghost of the piece rather than
   * being merely outlined: an empty dashed square says something can come here, which leaves the player
   * to find out what by tapping. Whether the thing that arrives will bend the light or swallow it is the
   * whole difference between the two sliding pieces, so the track says which.
   */
  | { kind: "stop"; piece: number; ghost: Blocker }

const viewGrid = (puzzle: LightbeamPuzzleData, states: readonly number[]): CellView[][] => {
  const grid: CellView[][] = Array.from({ length: puzzle.size }, () =>
    Array.from({ length: puzzle.size }, (): CellView => ({ kind: "empty" }))
  )
  puzzle.movable.forEach((piece, index) => {
    for (const at of pieceCells(piece))
      grid[at.row][at.col] = { kind: "stop", piece: index, ghost: pieceOccupant(piece, 0).blocks }
  })
  for (const piece of puzzle.fixed)
    grid[piece.at.row][piece.at.col] = piece.kind === "mirror" ? { kind: "mirror", face: piece.face } : { kind: "wall" }
  puzzle.movable.forEach((piece, index) => {
    const { at, blocks } = pieceOccupant(piece, states[index])
    grid[at.row][at.col] =
      blocks.kind === "mirror" ? { kind: "mirror", face: blocks.face, piece: index } : { kind: "wall", piece: index }
  })
  grid[puzzle.shrine.row][puzzle.shrine.col] = { kind: "shrine" }
  grid[puzzle.sun.at.row][puzzle.sun.at.col] = { kind: "sun", facing: puzzle.sun.facing }
  return grid
}

// ---------------------------------------------------------------------------------------------------
// Glyphs. Drawn rather than lettered, and each on its own 100-unit square so it scales with the cell
// instead of with the screen — a 5-wide board and a 7-wide one then read the same (PUZZLE_FAMILIES.md
// P2: the board carries no language).
// ---------------------------------------------------------------------------------------------------

const Glyph: FC<{ children: ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 100 100" className="size-full overflow-visible">
    {children}
  </svg>
)

/** A quarter-turn mirror: the diagonal it sits on, drawn as the polished edge it is. */
const Mirror: FC<{ face: MirrorFace; movable: boolean }> = ({ face, movable }) => (
  <Glyph>
    <line
      x1={face === "/" ? 18 : 18}
      y1={face === "/" ? 82 : 18}
      x2={face === "/" ? 82 : 82}
      y2={face === "/" ? 18 : 82}
      strokeWidth={14}
      strokeLinecap="round"
      className={movable ? "stroke-sky-200" : "stroke-stone-400"}
    />
  </Glyph>
)

const Wall: FC<{ movable: boolean }> = ({ movable }) => (
  <Glyph>
    <rect x={10} y={10} width={80} height={80} rx={8} className={movable ? "fill-stone-500" : "fill-stone-600"} />
    {/* Three courses, offset like real coursing, so a block of stone never reads as a shaded empty square. */}
    <line x1={10} y1={37} x2={90} y2={37} strokeWidth={4} className="stroke-stone-800/70" />
    <line x1={10} y1={64} x2={90} y2={64} strokeWidth={4} className="stroke-stone-800/70" />
    <line x1={44} y1={10} x2={44} y2={37} strokeWidth={4} className="stroke-stone-800/70" />
    <line x1={66} y1={37} x2={66} y2={64} strokeWidth={4} className="stroke-stone-800/70" />
    <line x1={32} y1={64} x2={32} y2={90} strokeWidth={4} className="stroke-stone-800/70" />
  </Glyph>
)

const NOSE: Record<Direction, string> = {
  up: "50,4 66,26 34,26",
  down: "50,96 66,74 34,74",
  left: "4,50 26,66 26,34",
  right: "96,50 74,66 74,34",
}

const SunDisc: FC<{ facing: Direction }> = ({ facing }) => (
  <Glyph>
    <circle cx={50} cy={50} r={30} className="fill-amber-300" />
    <circle cx={50} cy={50} r={30} className="fill-amber-100/40" />
    {/* The nose says which way the light leaves, which is half of what the player has to know. */}
    <polygon points={NOSE[facing]} className="fill-amber-300" />
  </Glyph>
)

/** A niche cut in the wall. Dark until the light arrives, then it is the whole point of the board. */
const Shrine: FC<{ lit: boolean }> = ({ lit }) => (
  <Glyph>
    <path
      d="M22 92 L22 46 A28 28 0 0 1 78 46 L78 92 Z"
      strokeWidth={8}
      className={clsx(lit ? "fill-amber-200 stroke-amber-100" : "fill-stone-900 stroke-stone-400")}
    />
    {lit && <circle cx={50} cy={56} r={40} className="fill-amber-200/30" />}
  </Glyph>
)

// ---------------------------------------------------------------------------------------------------
// Nodes and their wiring (design doc §12.1). Prototyped before any of the logic, because the drawing is
// the likeliest thing to kill the mechanic: the board already carries cells, a two-pass beam, glyphs,
// movable rings, dashed tracks with ghost pieces and end markers, at 35px a cell on a 9-wide board.
//
// Three rules keep the wire out of the beam's way, and they are the whole design. The first was designed;
// the third the prototype had to find out:
//
// 1. **The beam owns cell centres and edge midpoints; the wire owns the grid lines.** Every beam segment
//    runs midpoint → centre → midpoint, so a wire routed corner-to-corner along cell boundaries can only
//    ever cross it transversally. They never share a lane, at any board size.
// 2. **The wire is verdigris, never amber.** Light is amber and movable pieces are sky; oxidised copper
//    is a third thing, so a lit wire never reads as a stray beam.
// 3. **The wire is dashed, and the beam is continuous.** Colour alone was not enough, and the prototype
//    is what showed it: rule 1 keeps the wire out of the beam's lane but cannot stop it running one half
//    cell from a parallel stretch of beam — the beam moves with every tap, and the wire cannot chase it.
//    At 35px a cell, two solid lines that close together read as one double-tracked thing however they
//    are coloured. A dashed line cannot be mistaken for light at any size, which is what makes this hold
//    on the boards nobody has drawn yet rather than only on the three that were.
// ---------------------------------------------------------------------------------------------------

/**
 * The corner of `from`'s cell that faces `towards`. Both ends of a wire pick their facing corner, and
 * the bend between them is then on grid lines too — so the whole run sits on cell boundaries.
 */
const facingCorner = (from: CellRef, towards: CellRef): [number, number] => [
  from.col + (towards.col > from.col ? 1 : 0),
  from.row + (towards.row > from.row ? 1 : 0),
]

const wirePoints = (from: CellRef, to: CellRef): string => {
  const [x1, y1] = facingCorner(from, to)
  const [x2, y2] = facingCorner(to, from)
  return `${x1},${y1} ${x2},${y1} ${x2},${y2}`
}

/** The socket sunk in the floor. Fixed, transparent, nothing to tap — so no amber ring, ever. */
const NodeGlyph: FC<{ at: CellRef; lit: boolean }> = ({ at, lit }) => {
  const cx = at.col + 0.5
  const cy = at.row + 0.5
  return (
    <g className={lit ? "stroke-emerald-300" : "stroke-emerald-500/60"} fill="none">
      {lit && <circle cx={cx} cy={cy} r={0.4} className="fill-emerald-300/20 stroke-none" />}
      <circle cx={cx} cy={cy} r={0.26} strokeWidth={0.06} />
      {/* Four spokes to the rim, so the socket reads as wired to something rather than as a coin. */}
      <path
        d={`M${cx - 0.42},${cy}h0.16M${cx + 0.26},${cy}h0.16M${cx},${cy - 0.42}v0.16M${cx},${cy + 0.26}v0.16`}
        strokeWidth={0.06}
        strokeLinecap="round"
      />
    </g>
  )
}

const NodeLayer: FC<{ puzzle: LightbeamPuzzleData; walk: BeamWalk }> = ({ puzzle, walk }) => {
  const nodes = puzzle.nodes ?? []
  if (!nodes.length) return null
  // A node fires when the light crosses it, so the drawn wire is read off the drawn beam. Nothing is
  // inferred here that the player cannot see for themselves.
  const crossed = new Set(walk.path.map(segment => cellKey(segment.at)))
  return (
    <svg
      viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    >
      {nodes.map(node => {
        const lit = crossed.has(cellKey(node.at))
        const door = pieceOccupant(puzzle.movable[node.drives], node.to).at
        const [dx, dy] = facingCorner(door, node.at)
        const [nx, ny] = facingCorner(node.at, door)
        return (
          <g key={`${cellKey(node.at)}>${node.drives}`}>
            <polyline
              points={wirePoints(node.at, door)}
              fill="none"
              strokeWidth={lit ? 0.07 : 0.05}
              strokeDasharray="0.16 0.13"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={lit ? "stroke-emerald-300" : "stroke-emerald-500/50"}
            />
            {/* Rivets at both ends. The wire stops on the boundary rather than reaching into either
                cell, so it never crosses a mirror's diagonal — and the rivet is what ties it to the
                square it belongs to. */}
            <circle cx={nx} cy={ny} r={0.09} className={lit ? "fill-emerald-300" : "fill-emerald-500/60"} />
            <circle cx={dx} cy={dy} r={0.09} className={lit ? "fill-emerald-300" : "fill-emerald-500/60"} />
            <NodeGlyph at={node.at} lit={lit} />
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------------------------------
// The beam. Drawn over the pieces rather than under them: light does touch the mirror it bounces off,
// and a beam that stopped under a glyph would read as a beam that stopped short.
// ---------------------------------------------------------------------------------------------------

/** The midpoint of the cell edge a beam travelling `direction` crosses on its way out. */
const sidePoint = (at: CellRef, direction: Direction): [number, number] => {
  if (direction === "up") return [at.col + 0.5, at.row]
  if (direction === "down") return [at.col + 0.5, at.row + 1]
  if (direction === "left") return [at.col, at.row + 0.5]
  return [at.col + 1, at.row + 0.5]
}

const segmentPoints = (segment: BeamSegment): string => {
  const from = sidePoint(segment.at, opposite(segment.enter))
  const centre: [number, number] = [segment.at.col + 0.5, segment.at.row + 0.5]
  const points = segment.exit ? [from, centre, sidePoint(segment.at, segment.exit)] : [from, centre]
  return points.map(([x, y]) => `${x},${y}`).join(" ")
}

const BeamLayer: FC<{ puzzle: LightbeamPuzzleData; walk: BeamWalk; lit?: BeamSegment[] }> = ({ puzzle, walk, lit }) => {
  const highlighted = new Set((lit ?? []).map(segment => `${cellKey(segment.at)},${segment.enter}`))
  const last = walk.path[walk.path.length - 1]
  return (
    <svg
      viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
      className="pointer-events-none absolute inset-0 size-full mix-blend-screen"
      aria-hidden
    >
      <defs>
        <filter id="lightbeam-haze" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.1" />
        </filter>
      </defs>
      {/* Two passes: a blurred haze under a thin core. One flat line reads as a wire someone drew, and a
          hard-edged haze reads as a tan bar — the blur and the round joins are what make it light. */}
      <g filter="url(#lightbeam-haze)">
        {walk.path.map(segment => (
          <polyline
            key={`haze:${cellKey(segment.at)},${segment.enter}`}
            points={segmentPoints(segment)}
            fill="none"
            strokeWidth={0.26}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-amber-400/35"
          />
        ))}
      </g>
      {walk.path.map(segment => {
        const key = `${cellKey(segment.at)},${segment.enter}`
        return (
          <polyline
            key={key}
            points={segmentPoints(segment)}
            fill="none"
            strokeWidth={0.08}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={highlighted.has(key) ? "stroke-white" : "stroke-amber-200"}
          />
        )
      })}
      {/* Where the light ends, marked — otherwise a beam that stops short reads as a drawing fault. */}
      {walk.end === "absorbed" && last && (
        <circle
          cx={sidePoint(last.at, opposite(last.enter))[0]}
          cy={sidePoint(last.at, opposite(last.enter))[1]}
          r={0.16}
          className="fill-orange-400/70"
        />
      )}
      {walk.end === "escapes" && last?.exit && (
        <circle
          cx={sidePoint(last.at, last.exit)[0]}
          cy={sidePoint(last.at, last.exit)[1]}
          r={0.12}
          className="fill-amber-200/60"
        />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------------------------------

const cellCls = (view: CellView, state: { lit: boolean; movable: boolean }) =>
  clsx("relative flex aspect-square items-center justify-center rounded bg-stone-800 p-[8%] transition-colors", {
    // Movable pieces have to read as movable at a glance, and a vacant stop has to read as somewhere a
    // piece can go rather than as an empty square (design doc §9).
    "ring-1 ring-amber-400/50": state.movable && view.kind !== "stop" && !state.lit,
    "outline-2 -outline-offset-2 outline-stone-500/70 outline-dashed": view.kind === "stop" && !state.lit,
    "ring-2 ring-sky-300": state.lit,
    // The tap target is bigger than the square it sits in. That is what lets this family's grid go past the
    // 7-wide ceiling the other grid families stop at: there, every cell is tappable, so cell size IS target
    // size. Here only the pieces are, and generation never lets two of them touch, so a piece owns the empty
    // shoulders around it and can reach out into them. 5px each way puts a 35px cell — the 9-wide wizard
    // board on a 360px screen — over the 44px bar without any two targets meeting.
    "after:absolute after:inset-[-5px] after:content-['']": state.movable,
  })

export const LightbeamBoard: FC<Props> = ({ puzzle, states, highlighted, litBeam, onCycle }) => {
  const { size } = puzzle
  const grid = viewGrid(puzzle, states)
  const walk = traceBeam(puzzle, states)
  const solved = walk.end === "lit"
  return (
    <div className="relative aspect-square w-full max-w-[min(56vh,26rem)] select-none">
      <div
        className="grid size-full gap-px"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((view, colIndex) => {
            const key = cellKey({ row: rowIndex, col: colIndex })
            const piece = "piece" in view ? view.piece : undefined
            const className = cellCls(view, {
              lit: highlighted?.has(key) ?? false,
              movable: piece !== undefined,
            })
            const body =
              view.kind === "mirror" ? (
                <Mirror face={view.face} movable={view.piece !== undefined} />
              ) : view.kind === "wall" ? (
                <Wall movable={view.piece !== undefined} />
              ) : view.kind === "sun" ? (
                <SunDisc facing={view.facing} />
              ) : view.kind === "shrine" ? (
                <Shrine lit={solved} />
              ) : view.kind === "stop" ? (
                <span className="size-full opacity-25">
                  {view.ghost.kind === "mirror" ? <Mirror face={view.ghost.face} movable /> : <Wall movable />}
                </span>
              ) : null
            // Every cell a piece can stand in is tappable, vacant stops included: tapping where you want
            // it to go is the same gesture as tapping the piece, and it doubles the target.
            return piece === undefined ? (
              <div key={key} className={className}>
                {body}
              </div>
            ) : (
              <button key={key} onClick={() => onCycle(piece)} className={className}>
                {body}
              </button>
            )
          })
        )}
      </div>
      {/* Wires under the beam: light crosses a socket, it does not run along the wire. */}
      <NodeLayer puzzle={puzzle} walk={walk} />
      <BeamLayer puzzle={puzzle} walk={walk} lit={litBeam} />
    </div>
  )
}
