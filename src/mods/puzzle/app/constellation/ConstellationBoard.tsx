import clsx from "clsx"
import { useMemo, useRef, useState, type FC, type PointerEvent } from "react"
import { mulberry32 } from "@/game/random"
import {
  colOf,
  degreeOf,
  MAX_LINES,
  pairsByStar,
  pairTowards,
  rowOf,
  type ConstellationLines,
  type ConstellationPuzzle,
} from "@/mods/puzzle/game/constellation/constellation"

type Props = {
  puzzle: ConstellationPuzzle
  state: ConstellationLines
  /** Pairs the current hint reasons FROM — its evidence. */
  highlighted?: ReadonlySet<number>
  /** The one pair the current hint is ABOUT, drawn stronger than its evidence. */
  focus?: number
  /** Stars the current hint points at — a sealing reason points at the group it would close. */
  litStars?: ReadonlySet<number>
  onDrawLine: (pair: number) => void
}

// A drag has to travel before it means a direction: a press that never moves is a cancel, since dragging is
// the only input and a stationary tap would draw a line every time the player meant to scroll the page.
const DRAG_THRESHOLD = 12

// A star's hit area is wider than its disc, which is what lets the grid be denser than a 44px tap target.
// Safe because empty cells take no input at all and the drawer never places two stars side by side, so no
// two hit areas can overlap (docs/game-design/puzzles/constellation.md §8).
const HIT_SCALE = 1.3

/** Where a star sits, as a share of the board. */
const positionOf = (puzzle: ConstellationPuzzle, star: number) => {
  const share = 100 / puzzle.size
  return {
    left: (colOf(puzzle.size, puzzle.stars[star].cell) + 0.5) * share,
    top: (rowOf(puzzle.size, puzzle.stars[star].cell) + 0.5) * share,
  }
}

// A star disc, as a share of a cell — half of HIT_SCALE-independent 77% of the pitch, which is where a
// line has to stop so the number underneath it stays readable.
const STAR_RADIUS = 0.33

const GAP = 0.16

/** The strokes a pair is drawn with, offset off its centre line: one line down the middle, two either side. */
const strokesFor = (count: number) => (count === MAX_LINES ? [-GAP, GAP] : count === 1 ? [0] : [])

/**
 * The night sky the board sits in: a scatter of far-off stars, none of them part of the puzzle.
 *
 * Seeded off the board itself rather than drawn at random, so the same sky redraws the same way on every
 * render and every reload — a background that reshuffles under the player is a background they keep looking
 * at. They are a tenth the size of a puzzle star and carry no number, which is the whole of telling them
 * apart, and they never take a pointer.
 */
const backdropStars = (puzzle: ConstellationPuzzle) => {
  const random = mulberry32(puzzle.size * 1000 + puzzle.stars.length * 31 + puzzle.pairs.length)
  return Array.from({ length: puzzle.size * 9 }, () => ({
    x: random() * puzzle.size,
    y: random() * puzzle.size,
    r: 0.012 + random() * 0.026,
    dim: 0.25 + random() * 0.45,
  }))
}

/**
 * The lines, drawn under the stars.
 *
 * One line and two differ in **shape** rather than in weight — two strokes with sky between them — so a
 * phone in daylight reads the difference (§8). The overlay never takes a pointer: the stars are the whole
 * input surface.
 *
 * **A pair under the finger is drawn as what it is about to become**, not as what it is. Drawn as what it is,
 * the drag that doubles a line and the drag that clears it both showed nothing — the preview was the line
 * already there. So the strokes the drag would ADD are drawn faint beside the one it already has, and a drag
 * that would clear the pair fades everything it is about to take away.
 */
const Lines: FC<{
  puzzle: ConstellationPuzzle
  state: ConstellationLines
  candidate?: number
  highlighted?: ReadonlySet<number>
  focus?: number
  backdrop: ReturnType<typeof backdropStars>
}> = ({ puzzle, state, candidate, highlighted, focus, backdrop }) => (
  <svg
    viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
    className="pointer-events-none absolute inset-0 size-full"
    aria-hidden
    focusable="false"
  >
    {backdrop.map((far, index) => (
      <circle key={index} cx={far.x} cy={far.y} r={far.r} className="fill-slate-200" opacity={far.dim} />
    ))}
    {puzzle.pairs.map((pair, index) => {
      const count = state.lines[index]
      if (!count && index !== candidate && !highlighted?.has(index) && index !== focus) return null
      // What a release would leave here — the same cycle the drag runs (none → single → double → none).
      const preview = index === candidate
      const next = (count + 1) % (MAX_LINES + 1)
      // Strokes to draw, and how many of them are already on the board. A drag that clears keeps its strokes
      // on screen and fades them all; a pair the player has not drawn but a hint is pointing at shows the one
      // line the hint means, in the hint's own colour.
      const shown = preview ? (next === 0 ? count : next) : count || 1
      const settled = preview ? (next === 0 ? 0 : count) : shown
      const [from, to] = [puzzle.stars[pair.a].cell, puzzle.stars[pair.b].cell]
      const horizontal = rowOf(puzzle.size, from) === rowOf(puzzle.size, to)
      // Stopped at each star's edge rather than run under it, so a number stays readable with lines of
      // light meeting it (§8).
      const inset = horizontal ? [STAR_RADIUS, 0] : [0, STAR_RADIUS]
      const along = Math.sign((horizontal ? colOf(puzzle.size, to) - colOf(puzzle.size, from) : 0) || 1)
      const down = Math.sign((horizontal ? 0 : rowOf(puzzle.size, to) - rowOf(puzzle.size, from)) || 1)
      const [x1, y1] = [
        colOf(puzzle.size, from) + 0.5 + inset[0] * along,
        rowOf(puzzle.size, from) + 0.5 + inset[1] * down,
      ]
      const [x2, y2] = [colOf(puzzle.size, to) + 0.5 - inset[0] * along, rowOf(puzzle.size, to) + 0.5 - inset[1] * down]
      const tone =
        index === focus ? "stroke-amber-300" : highlighted?.has(index) ? "stroke-sky-300/70" : "stroke-amber-100"
      return (
        <g key={index}>
          {strokesFor(shown).map((offset, stroke) => (
            <line
              key={offset}
              x1={x1 + (horizontal ? 0 : offset)}
              y1={y1 + (horizontal ? offset : 0)}
              x2={x2 + (horizontal ? 0 : offset)}
              y2={y2 + (horizontal ? offset : 0)}
              strokeWidth={0.07}
              strokeLinecap="round"
              // A line of light rather than a drawn stroke: the glow is what makes it read as light between
              // two stars instead of pen on paper.
              className={clsx(
                "drop-shadow-[0_0_2px_rgb(254_243_199_/_0.7)]",
                stroke < settled ? tone : "stroke-amber-100/40"
              )}
            />
          ))}
        </g>
      )
    })}
  </svg>
)

export const ConstellationBoard: FC<Props> = ({ puzzle, state, highlighted, focus, litStars, onDrawLine }) => {
  const byStar = pairsByStar(puzzle)
  const backdrop = useMemo(() => backdropStars(puzzle), [puzzle])
  // The gesture lives in a ref and the state only mirrors it for drawing. A release has to act on the
  // direction the finger was last pointing, and reading that from state would make the line depend on
  // whether React had re-rendered between two pointer events.
  const drag = useRef<{ x: number; y: number; star: number; pair?: number } | undefined>(undefined)
  const [candidate, setCandidate] = useState<number | undefined>()

  const beginDrag = (star: number) => (event: PointerEvent<HTMLButtonElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, star }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const from = drag.current
    if (!from) return
    const [dx, dy] = [event.clientX - from.x, event.clientY - from.y]
    const horizontal = Math.abs(dx) > Math.abs(dy)
    from.pair =
      Math.hypot(dx, dy) < DRAG_THRESHOLD
        ? undefined
        : pairTowards(puzzle, from.star, horizontal ? 0 : Math.sign(dy), horizontal ? Math.sign(dx) : 0)
    setCandidate(from.pair)
  }

  const endDrag = () => {
    const pair = drag.current?.pair
    drag.current = undefined
    setCandidate(undefined)
    if (pair !== undefined) onDrawLine(pair)
  }

  return (
    // The board claims its own gestures: a vertical drag here means "draw a line down", and the page is
    // scrolled to the rules from the chrome around it (docs/game-design/puzzles/constellation.md §6).
    <div className="relative aspect-square w-full max-w-[min(56vh,26rem)] touch-none overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_15%,#16204a_0%,#0a0f24_45%,#04060f_100%)] ring-1 ring-indigo-300/15 select-none">
      <Lines
        puzzle={puzzle}
        state={state}
        candidate={candidate}
        highlighted={highlighted}
        focus={focus}
        backdrop={backdrop}
      />
      {puzzle.stars.map((star, index) => {
        const held = degreeOf(byStar, state.lines, index)
        const { left, top } = positionOf(puzzle, index)
        return (
          <button
            key={index}
            onPointerDown={beginDrag(index)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute flex aspect-square -translate-1/2 items-center justify-center"
            style={{ left: `${left}%`, top: `${top}%`, width: `${(100 / puzzle.size) * HIT_SCALE}%` }}
          >
            <span
              className={clsx(
                "flex aspect-square w-[77%] items-center justify-center rounded-full border text-[min(4vw,1.1rem)] font-bold transition-colors",
                // A star burns rather than sits in a socket: the glow is the star, the disc is only what
                // makes its number readable with lines of light running into it (§8).
                held > star.count
                  ? "border-red-400/80 bg-radial from-red-500/35 to-red-950/70 text-red-300 shadow-[0_0_10px_2px_rgb(248_113_113_/_0.35)]"
                  : held === star.count
                    ? // Satisfied: the star goes quiet and stops drawing the eye, which is how a Bridges
                      // player tracks a board.
                      "border-slate-400/50 bg-radial from-slate-700/40 to-slate-950/70 text-slate-300"
                    : "border-amber-100/70 bg-radial from-amber-100/25 to-indigo-950/70 text-amber-50 shadow-[0_0_12px_2px_rgb(254_243_199_/_0.28)]",
                litStars?.has(index) && "ring-2 ring-sky-300/80"
              )}
            >
              {star.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
