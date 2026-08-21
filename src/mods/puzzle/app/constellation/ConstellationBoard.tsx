import clsx from "clsx"
import { useRef, useState, type FC, type PointerEvent } from "react"
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

/**
 * The lines, drawn under the stars.
 *
 * One line and two differ in **shape** rather than in weight — two strokes with sky between them — so a
 * phone in daylight reads the difference (§8). The overlay never takes a pointer: the stars are the whole
 * input surface.
 */
const Lines: FC<{
  puzzle: ConstellationPuzzle
  state: ConstellationLines
  candidate?: number
  highlighted?: ReadonlySet<number>
  focus?: number
}> = ({ puzzle, state, candidate, highlighted, focus }) => {
  const gap = 0.16
  return (
    <svg
      viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
      focusable="false"
    >
      {puzzle.pairs.map((pair, index) => {
        const count = state.lines[index]
        const drawn = count > 0
        if (!drawn && index !== candidate && !highlighted?.has(index) && index !== focus) return null
        const [from, to] = [puzzle.stars[pair.a].cell, puzzle.stars[pair.b].cell]
        const horizontal = rowOf(puzzle.size, from) === rowOf(puzzle.size, to)
        const [x1, y1] = [colOf(puzzle.size, from) + 0.5, rowOf(puzzle.size, from) + 0.5]
        const [x2, y2] = [colOf(puzzle.size, to) + 0.5, rowOf(puzzle.size, to) + 0.5]
        const offsets = count === MAX_LINES ? [-gap, gap] : [0]
        return (
          <g
            key={index}
            className={clsx(
              index === focus
                ? "stroke-amber-300"
                : highlighted?.has(index)
                  ? "stroke-sky-300/70"
                  : drawn
                    ? "stroke-amber-100"
                    : // The candidate under the finger: shown as it will land, so a wrong axis is visible
                      // before release rather than after.
                      "stroke-amber-100/40"
            )}
          >
            {offsets.map(offset => (
              <line
                key={offset}
                x1={x1 + (horizontal ? 0 : offset)}
                y1={y1 + (horizontal ? offset : 0)}
                x2={x2 + (horizontal ? 0 : offset)}
                y2={y2 + (horizontal ? offset : 0)}
                strokeWidth={0.07}
                strokeLinecap="round"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export const ConstellationBoard: FC<Props> = ({ puzzle, state, highlighted, focus, litStars, onDrawLine }) => {
  const byStar = pairsByStar(puzzle)
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
    <div className="relative aspect-square w-full max-w-[min(56vh,26rem)] touch-none rounded bg-stone-950 select-none">
      <Lines puzzle={puzzle} state={state} candidate={candidate} highlighted={highlighted} focus={focus} />
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
                "flex aspect-square w-[77%] items-center justify-center rounded-full border-2 text-[min(4vw,1.1rem)] font-bold transition-colors",
                // A star that has its lines says so, and one holding too many says that too — the whole of
                // this family's error feedback, and none of it is a word.
                held > star.count
                  ? "border-red-500 bg-stone-900 text-red-400"
                  : held === star.count
                    ? "border-stone-600 bg-stone-900 text-stone-500"
                    : "border-amber-200/80 bg-stone-900 text-amber-100",
                litStars?.has(index) && "ring-2 ring-sky-300/70"
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
