import clsx from "clsx"
import { useRef, type FC, type PointerEvent } from "react"
import { hexDistance, hexFromKey, hexKey, type Hex } from "@/mods/puzzle/game/hidato/hex"
import type { HidatoSkin } from "./skins"
import type { HidatoPuzzleData } from "@/mods/puzzle/game/hidato/techniques"

type Props = {
  puzzle: HidatoPuzzleData
  /** Which place this room is — the board renders logical state, the skin renders pixels (§2). */
  skin: HidatoSkin
  /** Every number on the board, by cell key. */
  values: Record<string, number>
  /** The cell the run is picked up at, if any. */
  pen?: string
  /** The cell the current hint settles — drawn hatched, the marking its words name. */
  hatched?: string
  /** Cells the current hint argues from — ringed, never hatched (puzzle-screens.md §4.2). */
  marked?: ReadonlySet<string>
  /**
   * How far the completion run has counted (`puzzle-screens.md` §3), or unset for no run.
   *
   * The run flies the comb in the order the numbers say: every cell at or below this number is lit, so
   * the light travels 1 → last along the path the player just proved. What the board is about is one
   * unbroken order, so reading that order back is the board showing its own answer.
   */
  lit?: number
  /** A finger landing on a cell — the run is picked up there and nothing else is decided yet (§6.5). */
  onPickUp: (key: string) => void
  /**
   * A press and release on the same cell: carry the run on, or take a number back off.
   *
   * `wasPen` says whether the run was ALREADY standing on that cell when the finger landed, which the
   * board is the only one that can still tell: by the time the tap is known to be a tap, the press has
   * picked the run up there, so "is this the cell the run is on" answers yes either way (§6.5).
   */
  onTap: (key: string, wasPen: boolean) => void
  /** A cell the finger has been dragged into — carry the run on, or back out of the cell it came from. */
  onDrag: (key: string) => void
}

// One unit of the drawing, in viewBox units — everything else is a multiple of it, so the comb scales
// with its container and never off a pixel constant (docs/instructions/puzzle-screens.md §1).
const CELL = 10

// A hair under the full cell, which leaves the mortar line between neighbouring hexes.
const WAX = CELL * 0.93

const ROOT_3 = Math.sqrt(3)

/** Pointy-top axial layout: q runs east, r south-east, and the rows interleave by half a cell. */
const centre = ({ q, r }: Hex) => ({ x: ROOT_3 * CELL * (q + r / 2), y: 1.5 * CELL * r })

const CORNERS = Array.from({ length: 6 }, (_, corner) => ((60 * corner - 90) * Math.PI) / 180)

const hexPoints = (cell: Hex): string => {
  const { x, y } = centre(cell)
  return CORNERS.map(angle => `${x + WAX * Math.cos(angle)},${y + WAX * Math.sin(angle)}`).join(" ")
}

/**
 * The box the comb needs, whatever shape it came out — half a cell of air all round, then squared off
 * around its centre.
 *
 * **Square deliberately, even though no comb is.** The board is sized off the viewport's shorter side
 * (`max-w-[min(56vh,26rem)]`), and a taller-than-wide drawing given that width comes out taller than the
 * space there is — which is the one thing a puzzle board may not do (puzzle-screens.md §1). A square box
 * makes the width the whole constraint, exactly as it is for the grid families.
 */
const viewBox = (cells: Hex[]): { x: number; y: number; side: number } => {
  const centres = cells.map(centre)
  const left = Math.min(...centres.map(({ x }) => x)) - CELL
  const top = Math.min(...centres.map(({ y }) => y)) - CELL
  const right = Math.max(...centres.map(({ x }) => x)) + CELL
  const bottom = Math.max(...centres.map(({ y }) => y)) + CELL
  const side = Math.max(right - left, bottom - top)
  return { x: (left + right - side) / 2, y: (top + bottom - side) / 2, side }
}

/**
 * Which cell a point in the drawing falls in — `centre` run backwards, then rounded in cube
 * coordinates, where rounding means fixing the axis that was furthest out so the three still sum to
 * zero. This is what a drag needs and a tap does not: a tap knows its cell from the shape it landed on,
 * while a finger halfway between two cells has to be told which one it is nearer.
 */
const cellAt = (x: number, y: number): Hex => {
  const r = y / (1.5 * CELL)
  const q = x / (ROOT_3 * CELL) - r / 2
  const rounded = { q: Math.round(q), r: Math.round(r), s: Math.round(-q - r) }
  const off = { q: Math.abs(rounded.q - q), r: Math.abs(rounded.r - r), s: Math.abs(rounded.s + q + r) }
  if (off.q > off.r && off.q > off.s) return { q: -rounded.r - rounded.s, r: rounded.r }
  if (off.r > off.s) return { q: rounded.q, r: -rounded.q - rounded.s }
  return { q: rounded.q, r: rounded.r }
}

/**
 * The run the player has actually drawn: the cells holding 1, 2, 3 … for as long as each number is on
 * the board and touching the one before it.
 *
 * **It starts at the 1 and stops at the first break**, which is what makes it a line rather than a set
 * of joined-up pairs. Numbers further along that have not been reached yet — the ones the puzzle wrote
 * in across the comb — are not on it, because nothing connects them to anything: a stroke there would
 * claim a channel that has not been dug. So the line says how far the run has got, and the player reads
 * forward from its head.
 *
 * It is also the completion test in visible form: the board is finished exactly when this reaches the
 * last number (hidatoState's isHidatoSolved), so a board can never say "solved" with the line stopping
 * short of the end.
 */
const runPath = (values: Record<string, number>, last: number): Hex[] => {
  const cellFor = new Map(Object.entries(values).map(([key, value]) => [value, key]))
  const path: Hex[] = []
  for (let value = 1; value <= last; value++) {
    const cell = cellFor.get(value)
    if (cell === undefined) break
    const step = hexFromKey(cell)
    if (path.length && hexDistance(path[path.length - 1], step) !== 1) break
    path.push(step)
  }
  return path
}

const polyline = (cells: Hex[]): string =>
  cells
    .map(cell => {
      const { x, y } = centre(cell)
      return `${x},${y}`
    })
    .join(" ")

export const HidatoBoard: FC<Props> = ({
  puzzle,
  skin,
  values,
  pen,
  hatched,
  marked,
  lit,
  onPickUp,
  onTap,
  onDrag,
}) => {
  const box = viewBox(puzzle.cells)
  const surface = useRef<SVGSVGElement>(null)
  // The gesture lives in a ref rather than in state: a move has to be judged against the cell the finger
  // was last in, and reading that from state would make the run depend on whether React had re-rendered
  // between two pointer events.
  const drag = useRef<{ at: string; moved: boolean; wasPen: boolean } | undefined>(undefined)
  const cells = new Set(puzzle.cells.map(hexKey))
  const path = runPath(values, puzzle.cells.length)
  const reached = new Set(path.map(hexKey))
  // Bound to a capitalised local so it can be used as a tag: a component read straight off an optional
  // property is not a JSX element type as far as the compiler is concerned.
  const finish = skin.finish
  const Mark = finish?.Mark

  const begin = (key: string) => (event: PointerEvent<SVGGElement>) => {
    drag.current = { at: key, moved: false, wasPen: pen === key }
    // Captured on the whole board, so the moves keep arriving once the finger has left the cell it
    // started on — which is every drag past the first step.
    surface.current?.setPointerCapture(event.pointerId)
    // The press only picks the run up. What the touch MEANT is decided when it lifts (§6.5).
    onPickUp(key)
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !surface.current) return
    const frame = surface.current.getBoundingClientRect()
    if (!frame.width || !frame.height) return
    const at = {
      x: box.x + ((event.clientX - frame.left) / frame.width) * box.side,
      y: box.y + ((event.clientY - frame.top) / frame.height) * box.side,
    }
    const cell = cellAt(at.x, at.y)
    // **Only well inside the cell counts.** A hex's corners reach a whole cell-radius from its centre,
    // so a finger travelling between two neighbours clips the corners of the cells beside them — and a
    // clipped cell is a step the player did not mean to make. Reading a cell only from its middle
    // costs nothing (the previous one simply stays current a moment longer) and makes a drag land where
    // it was aimed (design doc §6.5).
    const middle = centre(cell)
    if (Math.hypot(at.x - middle.x, at.y - middle.y) > CELL * 0.72) return
    const key = hexKey(cell)
    // Only ever on crossing INTO a new cell of the comb: a finger wobbling inside one cell must not
    // lay a number per pointer event.
    if (key === drag.current.at || !cells.has(key)) return
    drag.current = { at: key, moved: true, wasPen: false }
    onDrag(key)
  }

  // A press that never left its cell is a tap, and only now is it known to be one.
  const end = () => {
    const gesture = drag.current
    drag.current = undefined
    if (gesture && !gesture.moved) onTap(gesture.at, gesture.wasPen)
  }

  return (
    // The board claims its own gestures — a drag across it draws the run rather than scrolling the page,
    // which is reached from the chrome around it (design doc §6).
    <svg
      ref={surface}
      viewBox={`${box.x} ${box.y} ${box.side} ${box.side}`}
      className="aspect-square w-full max-w-[min(56vh,26rem)] touch-none select-none"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <defs>
        {/* The hint's own marking, and the only thing on this board that is hatched — the boards may not
            hatch anything else, or the word stops naming one thing (puzzle-screens.md §4.2). */}
        <pattern id="hidato-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4" className={skin.hatch} strokeWidth="1.6" />
        </pattern>
      </defs>
      {puzzle.cells.map(cell => {
        const key = hexKey(cell)
        const value = values[key]
        const given = puzzle.givens[key] !== undefined
        return (
          <g
            key={key}
            role="button"
            tabIndex={0}
            onPointerDown={begin(key)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onTap(key, pen === key)
              }
            }}
            className="cursor-pointer outline-none"
          >
            <polygon
              points={hexPoints(cell)}
              strokeWidth={CELL * 0.09}
              className={clsx(
                skin.cell({
                  given,
                  filled: value !== undefined,
                  reached: reached.has(key),
                  lit: lit !== undefined && value !== undefined && value <= lit,
                }),
                "transition-colors"
              )}
            />
            {hatched === key && <polygon points={hexPoints(cell)} fill="url(#hidato-hatch)" opacity={0.55} />}
            {/* Evidence gets a ring, never the hatching: one ring over six cells would make "this cell" a
                guess between them (puzzle-screens.md §4.2). */}
            {(pen === key || marked?.has(key)) && (
              <polygon
                points={hexPoints(cell)}
                fill="none"
                strokeWidth={CELL * 0.16}
                className={pen === key ? skin.pen : skin.evidence}
              />
            )}
          </g>
        )
      })}
      {/* The run in one unbroken stroke, over the wax and under the numbers: a digit sits ON the line
          rather than cutting it, which is what makes it read as a channel dug through the comb rather
          than as a row of separate joins. Deaf to the pointer, because the cells under it are the
          board's hit targets and a stroke swallowing a tap would make the gap between two numbers a
          dead spot. */}
      {path.length > 1 && (
        <polyline
          points={polyline(path)}
          fill="none"
          strokeWidth={CELL * 0.24}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={clsx("pointer-events-none", skin.run)}
        />
      )}
      {/* The completion run travels the channel itself, not just the cells it passes: the light runs
          from the 1 to wherever the count has reached (puzzle-screens.md §3). */}
      {lit !== undefined && lit > 1 && (
        <polyline
          points={polyline(path.slice(0, lit))}
          fill="none"
          strokeWidth={CELL * 0.24}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={clsx("pointer-events-none", skin.litRun)}
        />
      )}
      <g className="pointer-events-none">
        {puzzle.cells.map(cell => {
          const key = hexKey(cell)
          const value = values[key]
          if (value === undefined) return null
          const { x, y } = centre(cell)
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CELL * 0.82}
              className={clsx(
                "font-semibold",
                skin.ink({
                  given: puzzle.givens[key] !== undefined,
                  filled: true,
                  reached: reached.has(key),
                  lit: lit !== undefined && value <= lit,
                })
              )}
            >
              {value}
            </text>
          )
        })}
      </g>
      {/* What the completion run leaves behind on a skin that has something to leave: a plant on every cell
          the water has reached, rooted on the cell's own ground and coming up in the run's order
          (design doc §9). A skin without one finishes with the light alone. */}
      {Mark && finish && lit !== undefined && (
        <g className="pointer-events-none">
          {path.slice(0, lit).map(cell => {
            const { x, y } = centre(cell)
            return (
              <svg
                key={hexKey(cell)}
                // Square, because the box is a viewBox: anything else scales the mark unevenly, which a
                // sprout survives and a written sign does not.
                x={x - CELL * 0.31}
                y={y - CELL * 0.98}
                width={CELL * 0.62}
                height={CELL * 0.62}
                viewBox="0 0 24 24"
                // Rooted just above the number and no taller than the cell's own top edge, so a plant
                // never grows over the one behind it. Dark against the ground it comes up on — the light
                // has been through by the time it appears, so the ground under it is at its brightest.
                className={clsx("origin-bottom", finish.arrival, finish.ink)}
              >
                <Mark value={values[hexKey(cell)]} />
              </svg>
            )
          })}
        </g>
      )}
    </svg>
  )
}
