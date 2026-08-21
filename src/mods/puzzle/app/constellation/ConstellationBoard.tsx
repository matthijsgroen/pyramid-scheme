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
import { skinFor, type Skin } from "./skins"

type Props = {
  puzzle: ConstellationPuzzle
  state: ConstellationLines
  /** Pairs the current hint reasons FROM — its evidence. */
  highlighted?: ReadonlySet<number>
  /** The one pair the current hint is ABOUT, drawn stronger than its evidence. */
  focus?: number
  /** Stars the current hint points at — a sealing reason points at the group it would close. */
  litStars?: ReadonlySet<number>
  /** The ambience the site authored (`night`), or a skin named outright. */
  theme?: string
  /** The role this room was allocated for, which is what decides WHICH of this family's places it is. */
  role?: string | string[]
  /** Nodes that have had their turn in the completion run (see useCelebration). */
  celebrated?: ReadonlySet<number>
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
  skin: Skin
}> = ({ puzzle, state, candidate, highlighted, focus, backdrop, skin }) => (
  <svg
    viewBox={`0 0 ${puzzle.size} ${puzzle.size}`}
    className="pointer-events-none absolute inset-0 size-full"
    aria-hidden
    focusable="false"
  >
    {backdrop.map((far, index) => (
      <circle key={index} cx={far.x} cy={far.y} r={far.r} className={skin.backdrop} opacity={far.dim} />
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
      // A hint speaks in its own colours in every skin — the point of a highlight is that it is not the
      // board's own palette.
      const tone = index === focus ? "stroke-amber-300" : highlighted?.has(index) ? "stroke-sky-300/70" : skin.line
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
              className={clsx(skin.lineGlow, stroke < settled ? tone : skin.pending)}
            />
          ))}
        </g>
      )
    })}
  </svg>
)

export const ConstellationBoard: FC<Props> = ({
  puzzle,
  state,
  highlighted,
  focus,
  litStars,
  theme,
  role,
  celebrated,
  onDrawLine,
}) => {
  const byStar = pairsByStar(puzzle)
  const skin = skinFor(role, theme)
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
    <div
      className={clsx(
        "relative aspect-square w-full max-w-[min(56vh,26rem)] touch-none overflow-hidden rounded-lg select-none",
        skin.board
      )}
    >
      {/* One inset layer for the whole board, so the lines and the nodes keep the same coordinate space and a
          plant growing out of a top-row basin has somewhere to grow. Without it the frame clipped every
          glyph on row 0. */}
      <div className="absolute inset-[7%]">
        <Lines
          puzzle={puzzle}
          state={state}
          candidate={candidate}
          highlighted={highlighted}
          focus={focus}
          backdrop={backdrop}
          skin={skin}
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
                  "relative flex aspect-square w-[77%] items-center justify-center rounded-full border text-[min(4vw,1.1rem)] font-bold transition-all duration-300",
                  // **A star that has its lines lights up.** Bridges greys a finished island out, and that is
                  // the reading this board deliberately inverts: giving a star its light is the thing the
                  // player just achieved, so it is the thing that should look like an achievement. It scans
                  // the same either way — what is left to do is now "the stars still showing a plain number"
                  // rather than "the stars still lit".
                  // Unlit is readable and unremarkable — the number has to stay crisp, it is the clue — and
                  // nothing draws the eye until the node earns it.
                  held > star.count ? skin.over : held === star.count ? skin.lit : skin.unlit,
                  litStars?.has(index) && "ring-2 ring-sky-300/80",
                  celebrated?.has(index) && skin.celebrate
                )}
              >
                {skin.Glyph && (
                  // Above the disc, and taller once it is grown: the basin keeps its number, the plant takes
                  // the empty cell over it.
                  <span
                    className={clsx(
                      "pointer-events-none absolute bottom-[64%] left-1/2 aspect-square -translate-x-1/2",
                      held === star.count ? "w-[80%] opacity-100" : "w-[52%] opacity-80",
                      // The skin's own green. Left to inherit, a plant came out the colour of the node's
                      // number — which on a fed basin is near-black, so the plants read as dead twigs.
                      held === star.count ? skin.glyphLit : skin.glyphUnlit
                    )}
                  >
                    <skin.Glyph grown={held === star.count} flowering={celebrated?.has(index)} />
                  </span>
                )}
                <span className="relative">{star.count}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
