import clsx from "clsx"
import { useRef, useState, type CSSProperties, type FC, type PointerEvent } from "react"
import { colOf, rowOf } from "@/mods/puzzle/game/starBattle/starBattle"
import {
  lineStatus,
  pairConflicts,
  ruledOutByPieces,
  type LineStatus,
  type PairMarks,
  type PairPuzzle,
} from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import { useDelayedConflicts } from "../useDelayedConflicts"
import type { PairSkin } from "./skins"

type Props = {
  puzzle: PairPuzzle
  state: PairMarks
  skin: PairSkin
  /** Squares the current hint reasons FROM. Anchors may be among them. */
  highlighted?: ReadonlySet<number>
  /** Every square the current hint settles. */
  decided?: ReadonlySet<number>
  /** The one square the hint is ABOUT. */
  focus?: number
  /** The pieces that have had their turn in the completion run, so far. */
  celebrated?: ReadonlySet<number>
  /** The anchor each piece walks into during that run, as piece → anchor. */
  pairing?: ReadonlyMap<number, number>
  onTapCell: (cell: number) => void
  /** A run of squares ruled out in one gesture. */
  onSweepCells: (cells: number[]) => void
}

/** The player's own "not here": a dot, slight on purpose, since it is the mark they make most of. */
const EmptyGlyph: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <circle r={9} fill="currentColor" />
  </svg>
)

const hatchOf = (skin: PairSkin) => ({
  backgroundImage: `repeating-linear-gradient(45deg, transparent 0 5px, ${skin.hatch} 5px 7px)`,
})

/** Width of the count gutter, the same on both sides of the grid so a count sits on its own line. */
const GUTTER = "1.5rem"

export const PairPuzzleBoard: FC<Props> = ({
  puzzle,
  state,
  skin,
  highlighted,
  decided,
  focus,
  celebrated,
  pairing,
  onTapCell,
  onSweepCells,
}) => {
  const { size } = puzzle
  const arrived = new Set([...(celebrated ?? [])].flatMap(piece => pairing?.get(piece) ?? []))
  // The step from a piece to its anchor, in squares, for the walk the skin draws.
  const walkTo = (piece: number): CSSProperties | undefined => {
    const anchor = pairing?.get(piece)
    if (anchor === undefined) return undefined
    return {
      "--dx": colOf(size, anchor) - colOf(size, piece),
      "--dy": rowOf(size, anchor) - rowOf(size, piece),
    } as CSSProperties
  }
  const grid = useRef<HTMLDivElement | null>(null)
  // The gesture lives in a ref and lands once on release, so a drag is one undo step (see star battle).
  const drag = useRef<{ from: number; swept: number[] } | undefined>(undefined)
  const swallowClick = useRef(false)
  const [sweeping, setSweeping] = useState<number[]>([])
  const hatch = hatchOf(skin)

  // Worked out from the cell grid's own box, which excludes the count gutters: a drag captures the pointer on
  // its first square, so `pointerenter` never fires on the squares it crosses.
  const cellUnder = (x: number, y: number): number | undefined => {
    const box = grid.current?.getBoundingClientRect()
    if (!box) return undefined
    const col = Math.floor(((x - box.left) / box.width) * size)
    const row = Math.floor(((y - box.top) / box.height) * size)
    if (col < 0 || col >= size || row < 0 || row >= size) return undefined
    return row * size + col
  }

  const beginDrag = (cell: number) => (event: PointerEvent<HTMLButtonElement>) => {
    drag.current = { from: cell, swept: [] }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = drag.current
    if (!gesture) return
    const over = cellUnder(event.clientX, event.clientY)
    // An anchor is not a square a mark can go in, so a drag passes over it without taking it.
    if (over === undefined || over === gesture.from || puzzle.anchors[over]) return
    if (!gesture.swept.length) gesture.swept.push(gesture.from)
    if (!gesture.swept.includes(over)) gesture.swept.push(over)
    setSweeping([...gesture.swept])
  }

  const endDrag = () => {
    const gesture = drag.current
    drag.current = undefined
    setSweeping([])
    if (!gesture?.swept.length) return
    swallowClick.current = true
    onSweepCells(gesture.swept)
  }

  const conflicts = useDelayedConflicts(state.marks, marks => pairConflicts(puzzle, { marks }))
  const spent = ruledOutByPieces(puzzle, state.marks)
  const status = lineStatus(puzzle, state.marks)

  const countClass = (line: LineStatus) =>
    line === "met" ? skin.countMet : line === "broken" ? skin.countBroken : skin.countOpen
  const count = (kind: "row" | "col", index: number, value: number, line: LineStatus) => (
    <span
      key={`${kind}-${index}`}
      data-count={`${kind}-${index}`}
      data-status={line}
      className={clsx("flex items-center justify-center text-sm font-bold tabular-nums", countClass(line))}
    >
      {value}
    </span>
  )

  return (
    <div
      className="grid w-full max-w-[min(56vh,26rem)] touch-none select-none"
      style={{ gridTemplateColumns: `minmax(0, 1fr) ${GUTTER}`, gridTemplateRows: `${GUTTER} auto` }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {puzzle.colCounts.map((value, col) => count("col", col, value, status.cols[col]))}
      </div>
      <div />
      <div
        ref={grid}
        className="relative grid aspect-square w-full"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {state.marks.map((value, cell) => {
          const ring = clsx(
            conflicts.has(cell)
              ? `ring-2 ring-inset ${skin.conflict}`
              : cell === focus
                ? `ring-3 ring-inset ${skin.focus}`
                : highlighted?.has(cell) && `ring-2 ring-inset ${skin.evidence}`
          )
          return puzzle.anchors[cell] ? (
            // A printed anchor is floor plan, not a control: no button and no handlers, so a tap or a drag
            // starting on it does nothing and a screen reader is not offered a square it cannot use.
            <div
              key={cell}
              data-anchor
              aria-hidden
              className={clsx(
                "flex aspect-square min-h-0 items-center justify-center p-[10%]",
                skin.anchor,
                ring,
                arrived.has(cell) && skin.anchorCelebrate
              )}
            >
              <skin.Anchor />
            </div>
          ) : (
            <button
              key={cell}
              onPointerDown={beginDrag(cell)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ borderColor: skin.seam, ...(decided?.has(cell) ? hatch : {}) }}
              onClick={() => {
                if (swallowClick.current) {
                  swallowClick.current = false
                  return
                }
                onTapCell(cell)
              }}
              // `min-h-0` for the same WebKit reason as star battle: a glyph's percentage size must not set
              // the square's minimum, or marked squares outgrow their track.
              className={clsx(
                "flex aspect-square min-h-0 items-center justify-center border p-[10%] transition-colors",
                spent.has(cell) && !decided?.has(cell) ? skin.spent : skin.cell,
                ring
              )}
            >
              {value === "piece" ? (
                <span
                  className={clsx("block size-full", skin.answer, celebrated?.has(cell) && skin.celebrate)}
                  style={celebrated?.has(cell) ? walkTo(cell) : undefined}
                >
                  <skin.Glyph />
                </span>
              ) : value === "empty" || sweeping.includes(cell) ? (
                <span className={clsx("block size-full p-[25%]", skin.dark)}>
                  <EmptyGlyph />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="grid" style={{ gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}>
        {puzzle.rowCounts.map((value, row) => count("row", row, value, status.rows[row]))}
      </div>
    </div>
  )
}
