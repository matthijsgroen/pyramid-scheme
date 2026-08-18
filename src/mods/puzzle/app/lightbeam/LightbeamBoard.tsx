import clsx from "clsx"
import type { FC, ReactNode } from "react"
import {
  cellKey,
  opposite,
  pieceCells,
  pieceOccupant,
  restingState,
  traceBeam,
  wiringsDriving,
  type BeamSegment,
  type BeamWalk,
  type Blocker,
  type CellRef,
  type Direction,
  type LightbeamPuzzleData,
  type MirrorAngle,
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
  | { kind: "mirror"; face: MirrorFace; angle?: MirrorAngle }
  | { kind: "wall" }
  /**
   * A cell a piece can stand in. The piece itself is not drawn here — it rides in the layer above so it
   * can slide between its stops — but the cell owns the track marking and the tap target.
   *
   * A vacant stop carries a ghost of the piece rather than being merely outlined: an empty dashed square
   * says something can come here, which leaves the player to find out what by tapping, and whether the
   * thing that arrives bends the light or swallows it is the whole difference between the two sliding
   * pieces. `track` is false for a turn mirror, which has one cell and goes nowhere.
   */
  | { kind: "stop"; piece: number; ghost?: Blocker; track: boolean }

const viewGrid = (puzzle: LightbeamPuzzleData, states: readonly number[]): CellView[][] => {
  const grid: CellView[][] = Array.from({ length: puzzle.size }, () =>
    Array.from({ length: puzzle.size }, (): CellView => ({ kind: "empty" }))
  )
  puzzle.movable.forEach((piece, index) => {
    const cells = pieceCells(piece)
    const standing = cellKey(pieceOccupant(piece, states[index]).at)
    for (const at of cells)
      grid[at.row][at.col] = {
        kind: "stop",
        piece: index,
        track: cells.length > 1,
        ghost: cellKey(at) === standing ? undefined : pieceOccupant(piece, 0).blocks,
      }
  })
  for (const piece of puzzle.fixed)
    grid[piece.at.row][piece.at.col] =
      piece.kind === "mirror" ? { kind: "mirror", face: piece.face, angle: piece.angle } : { kind: "wall" }
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

/** Where a mirror's line lies, in degrees anticlockwise from east — 45° is `/`, 135° is `\\`. */
const FACE_ANGLE: Record<MirrorFace, number> = { "/": 45, "\\": 135 }

/** An authored stop is eighth-turns; without one a mirror sits on the diagonal its face names. */
const mirrorAngle = (face: MirrorFace, angle?: MirrorAngle): number =>
  angle === undefined ? FACE_ANGLE[face] : angle * 22.5

/**
 * How far to turn the glyph, in SVG degrees — clockwise, because the y axis points down.
 *
 * A mirror line is the same line half a turn later, so every angle has two representatives and **which
 * one is drawn decides which way the piece appears to turn**. Folding into (−90°, 90°] is what makes each
 * tap the short way round: `/`→`\\` stays the clockwise quarter turn it has always been, and a cut mirror
 * swings 67.5° rather than 112.5° back the other way. Get this wrong and nothing looks wrong in a still
 * frame — it only shows in motion, which is where a tap is read.
 */
const glyphTurn = (degrees: number): number => {
  const turn = -degrees % 180
  return turn <= -90 ? turn + 180 : turn > 90 ? turn - 180 : turn
}

/**
 * A mirror: the line it sits on, drawn as the polished edge it is.
 *
 * One canonical line, turned into place, rather than a glyph per angle — so changing setting is a turn
 * the eye can follow instead of a glyph that swaps between frames. Which setting a piece is in is the
 * single thing the player is deciding, and watching it turn is what says the tap landed on the piece
 * they meant.
 *
 * A **cut mirror** (design doc §11.8) is drawn as a different object rather than a different angle, and
 * that is forced: its stops sit 22.5° from an ordinary mirror's, and §9 forbids "a subtle rotation".
 * So the ordinary mirror is a polished *edge* — one solid line — and a cut mirror is the *plate* itself,
 * an outline with two silvered faces and cut ends. Solid against hollow is a judgement the eye makes on
 * one cell, without another cell to compare it against, which is what a board has to be read by.
 */
const Mirror: FC<{ face: MirrorFace; movable: boolean; angle?: MirrorAngle }> = ({ face, movable, angle }) => {
  const stroke = movable ? "stroke-sky-200" : "stroke-stone-400"
  return (
    <Glyph>
      <g
        className="origin-center transition-transform duration-200 ease-out"
        style={{ transform: `rotate(${glyphTurn(mirrorAngle(face, angle))}deg)` }}
      >
        {angle === undefined ? (
          <line x1={4.75} y1={50} x2={95.25} y2={50} strokeWidth={14} strokeLinecap="round" className={stroke} />
        ) : (
          <polygon
            points="4,50 18,37 82,37 96,50 82,63 18,63"
            fill="none"
            strokeWidth={11}
            strokeLinejoin="round"
            className={stroke}
          />
        )}
      </g>
    </Glyph>
  )
}

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
// Nodes and their wiring (design doc §11.1). Prototyped before any of the logic, because the drawing is
// the likeliest thing to kill the mechanic: the board already carries cells, a two-pass beam, glyphs,
// movable rings, dashed tracks with ghost pieces and end markers, at 35px a cell on a 9-wide board.
//
// Three rules keep the wire out of the beam's way, and they are the whole design. The first was designed;
// the third the prototype had to find out:
//
// 1. **The beam owns cell centres and edge midpoints; the wire owns the grid lines.** Every beam segment
//    runs midpoint → centre → midpoint, so a wire routed corner-to-corner along cell boundaries can only
//    ever cross it transversally. They never share a lane, at any board size.
// 2. **A wire is never amber.** Light is amber and mirror glass is sky; a wire is oxidised copper in one
//    of a handful of hues, so a lit wire never reads as a stray beam. Which hue is not decoration — see
//    `NODE_COLOURS`, where it turns out to do the work a generation gate was going to have to do.
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

/**
 * Who owns a piece, said in colour.
 *
 * **White is the player's.** One colour, always the same, for everything a tap can move — so "can I touch
 * this?" is answered before any wire is traced. Every other colour belongs to a socket, and a piece
 * wearing it moves when that socket is crossed, not when it is tapped.
 *
 * That is what makes fan-out readable at a glance: one socket drives three pieces, and the three pieces
 * are the three wearing its colour. Following the wire confirms it; the colour is what makes you look.
 */
const NODE_COLOURS = [
  { stroke: "stroke-emerald-300", dim: "stroke-emerald-500/50", fill: "fill-emerald-300", ring: "#6ee7b7" },
  { stroke: "stroke-fuchsia-300", dim: "stroke-fuchsia-500/50", fill: "fill-fuchsia-300", ring: "#f0abfc" },
  { stroke: "stroke-cyan-300", dim: "stroke-cyan-500/50", fill: "fill-cyan-300", ring: "#67e8f9" },
  { stroke: "stroke-orange-300", dim: "stroke-orange-500/50", fill: "fill-orange-300", ring: "#fdba74" },
] as const

const nodeColour = (node: number) => NODE_COLOURS[node % NODE_COLOURS.length]

const PLAYER_RING = "#ffffff"

/** The socket sunk in the floor. Fixed, transparent, nothing to tap — so never a piece's outline. */
const NodeGlyph: FC<{ at: CellRef; node: number; lit: boolean }> = ({ at, node, lit }) => {
  const cx = at.col + 0.5
  const cy = at.row + 0.5
  const colour = nodeColour(node)
  return (
    <g className={lit ? colour.stroke : colour.dim} fill="none">
      {lit && <circle cx={cx} cy={cy} r={0.4} className={clsx(colour.fill, "stroke-none opacity-20")} />}
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
  // A socket fires when the light crosses it, so the drawn wire is read off the drawn beam. Nothing is
  // inferred here that the player cannot see for themselves.
  const crossed = new Set(walk.path.map(segment => cellKey(segment.at)))
  const isLitNode = (node: number) => crossed.has(cellKey(nodes[node].at))
  return (
    <svg
      viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    >
      {(puzzle.wirings ?? []).flatMap((wiring, index) => {
        // An and-wiring fires on its last socket, so a half-crossed one stays dim: the piece has not moved,
        // and a wire drawn as carrying when nothing moved is the one lie this layer must not tell.
        const firing = wiring.from.every(isLitNode)
        const door = pieceOccupant(puzzle.movable[wiring.piece], wiring.to).at
        return wiring.from.map(node => {
          const colour = nodeColour(node)
          // Each strand of an and-wiring shows its own socket's state, so the player can see which one is
          // still missing — that is the whole of the puzzle an and-wiring sets.
          const carrying = firing || isLitNode(node)
          const [dx, dy] = facingCorner(door, nodes[node].at)
          const [nx, ny] = facingCorner(nodes[node].at, door)
          return (
            <g key={`${index}:${node}`}>
              <polyline
                points={wirePoints(nodes[node].at, door)}
                fill="none"
                strokeWidth={firing ? 0.07 : 0.05}
                strokeDasharray="0.16 0.13"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={carrying ? colour.stroke : colour.dim}
              />
              {/* Rivets at both ends. The wire stops on the boundary rather than reaching into either
                  cell, so it never crosses a mirror's diagonal — and the rivet is what ties it to the
                  square it belongs to. */}
              <circle cx={nx} cy={ny} r={0.09} className={clsx(colour.fill, carrying ? "" : "opacity-60")} />
              <circle cx={dx} cy={dy} r={0.09} className={clsx(colour.fill, carrying ? "" : "opacity-60")} />
            </g>
          )
        })
      })}
      {nodes.map((node, index) => (
        <NodeGlyph key={cellKey(node.at)} at={node.at} node={index} lit={isLitNode(index)} />
      ))}
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
// The pieces themselves, in a layer of their own above the cells.
//
// They have to leave the grid to be animated at all: a piece drawn inside its cell can only be redrawn in
// a different cell, which is a jump, and a jump is exactly what a sliding piece must not look like. Up
// here each piece is one element that keeps its identity across taps, so its stop is a position it moves
// to and its face is an angle it turns to.
//
// This matters more than polish now that a track can hold three stops (`slidingStops`). With two, a jump
// is at least unambiguous — the piece was there, now it is here. With three, a jump leaves the player to
// work out which way it went and how far, and the answer to "what did my tap just do" should not need
// working out.
// ---------------------------------------------------------------------------------------------------

/**
 * Who owns this piece, drawn as its outline: white for the player's, a socket's colour for a socket's.
 *
 * A piece driven by more than one socket wears all their colours, split evenly round the edge — which is
 * what an and-wiring looks like from the piece's end, and the only place it is visible at all without
 * following a wire. `pathLength` does the splitting: normalise the perimeter to the number of colours and
 * each one takes a single unit of dash.
 */
const OwnerRing: FC<{ colours: string[] }> = ({ colours }) => (
  <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full">
    {colours.map((colour, index) => (
      <rect
        key={colour}
        x={5}
        y={5}
        width={90}
        height={90}
        rx={12}
        fill="none"
        stroke={colour}
        strokeWidth={5}
        strokeLinecap="butt"
        pathLength={colours.length}
        strokeDasharray={`1 ${colours.length - 1}`}
        strokeDashoffset={-index}
        opacity={0.85}
      />
    ))}
  </svg>
)

const PieceLayer: FC<{ puzzle: LightbeamPuzzleData; states: readonly number[] }> = ({ puzzle, states }) => {
  const share = 100 / puzzle.size
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {puzzle.movable.map((piece, index) => {
        const { at, blocks } = pieceOccupant(piece, states[index])
        const angle = piece.kind === "turnMirror" ? piece.angles?.[states[index]] : undefined
        const driving = wiringsDriving(puzzle, index)
        const colours = driving.length
          ? [...new Set(driving.flatMap(wiring => wiring.from))].map(node => nodeColour(node).ring)
          : [PLAYER_RING]
        return (
          <div
            key={index}
            className="absolute transition-[left,top] duration-200 ease-out"
            style={{ left: `${at.col * share}%`, top: `${at.row * share}%`, width: `${share}%`, height: `${share}%` }}
          >
            <OwnerRing colours={colours} />
            {/* The inset lives on a child, not here: a percentage padding resolves against the containing
                block's width, and this element's containing block is the whole board rather than one cell —
                which collapsed the glyph to nothing. */}
            <div className="size-full p-[8%]">
              {blocks.kind === "mirror" ? <Mirror face={blocks.face} movable angle={angle} /> : <Wall movable />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------

const cellCls = (view: CellView, state: { lit: boolean; movable: boolean }) =>
  clsx("relative flex aspect-square items-center justify-center rounded bg-stone-800 p-[8%] transition-colors", {
    // A vacant stop has to read as somewhere a piece can go rather than as an empty square (design doc §9).
    // The piece's own outline says whose it is, and it says so up in the layer above.
    "outline-2 -outline-offset-2 outline-stone-500/70 outline-dashed": view.kind === "stop" && view.track && !state.lit,
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
              movable: piece !== undefined && restingState(puzzle, piece) === undefined,
            })
            const body =
              view.kind === "mirror" ? (
                <Mirror face={view.face} movable={false} angle={view.angle} />
              ) : view.kind === "wall" ? (
                <Wall movable={false} />
              ) : view.kind === "sun" ? (
                <SunDisc facing={view.facing} />
              ) : view.kind === "shrine" ? (
                <Shrine lit={solved} />
              ) : view.kind === "stop" && view.ghost ? (
                <span className="size-full opacity-25">
                  {view.ghost.kind === "mirror" ? <Mirror face={view.ghost.face} movable /> : <Wall movable />}
                </span>
              ) : null
            // Every cell a piece can stand in is tappable, vacant stops included: tapping where you want
            // it to go is the same gesture as tapping the piece, and it doubles the target. A door is the
            // exception, and the only one — it answers to the light, not to a thumb.
            return piece === undefined || restingState(puzzle, piece) !== undefined ? (
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
      {/* Pieces above the cells so they can slide between them, wires above the pieces so a wire is never
          buried under the thing it drives, and the beam above everything: light does touch the mirror it
          bounces off, and a beam that stopped under a glyph would read as a beam that stopped short. */}
      <PieceLayer puzzle={puzzle} states={states} />
      <NodeLayer puzzle={puzzle} walk={walk} />
      <BeamLayer puzzle={puzzle} walk={walk} lit={litBeam} />
    </div>
  )
}
