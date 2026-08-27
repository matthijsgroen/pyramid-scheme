import clsx from "clsx"
import { useRef, useState, type FC, type PointerEvent } from "react"
import {
  colOf,
  rowOf,
  ruledOutByStars,
  starBattleConflicts,
  type StarBattleMarks,
  type StarBattlePuzzle,
} from "@/mods/puzzle/game/starBattle/starBattle"
import { useDelayedConflicts } from "../useDelayedConflicts"
import type { StarBattleSkin } from "./skins"

type Props = {
  puzzle: StarBattlePuzzle
  state: StarBattleMarks
  /** Which place this room is — everything on the board that is not a rule comes from here. */
  skin: StarBattleSkin
  /** Squares the current hint reasons FROM — its evidence. */
  highlighted?: ReadonlySet<number>
  /**
   * Every square the current hint SETTLES, the focus among them.
   *
   * A rung here often decides a whole row at once, and its sentence says so ("the rest is empty"). Ringing
   * one square while saying that leaves the player to work out which squares "the rest" was.
   */
  decided?: ReadonlySet<number>
  /** The one square the current hint is ABOUT, drawn strongest of all. */
  focus?: number
  /** The answers that have had their turn in the completion run, so far (`puzzle-screens.md` §3). */
  celebrated?: ReadonlySet<number>
  onTapCell: (cell: number) => void
  /** A run of squares ruled out in one gesture — see the drag handlers below. */
  onSweepCells: (cells: number[]) => void
}

/**
 * The player's own "not here" mark.
 *
 * Deliberately slight — a dot rather than a shape. This is the mark they will make most of, and a board
 * covered in marks as heavy as the answers would look as though it had answered itself. Its colour is the
 * skin's; its weight is not, because "slight" is a rule about the board rather than about the place.
 */
const DarkGlyph: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <circle r={9} fill="currentColor" />
  </svg>
)

/**
 * The squares a hint is about, hatched.
 *
 * **The words name this**, which is the whole reason it is a hatch and not another ring or another shade: a
 * hint that says "rule out the hatched squares" leaves nothing to match up, where "the rest of the row"
 * leaves the player deciding which squares that was. Diagonal lines are also the one treatment on this board
 * that cannot be read as something else — the walls are amber strokes, a star is a shape, a dark mark is a
 * dot, and a receded square is a shade.
 */
const hatchOf = (skin: StarBattleSkin) => ({
  backgroundImage: `repeating-linear-gradient(45deg, transparent 0 5px, ${skin.hatch} 5px 7px)`,
})

/**
 * A boundary is a drawn edge, and it has to be, not a fill.
 *
 * There are as many regions as rows, and a palette that tells eight regions apart is a palette nobody can
 * read at arm's length — a colour-blind player reads none of it. So the shape is carried by the strokes on
 * the edges where two regions meet, and the outer rim of the grid is one of those edges. What COLOUR that
 * stroke is belongs to the place — amber over a sky, water over farmland — but that it is a drawn edge does
 * not.
 */
const boundary = (puzzle: StarBattlePuzzle, cell: number, dRow: number, dCol: number) => {
  const [row, col] = [rowOf(puzzle.size, cell) + dRow, colOf(puzzle.size, cell) + dCol]
  if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) return true
  return puzzle.regions[row * puzzle.size + col] !== puzzle.regions[cell]
}

/**
 * How wide a wall is drawn, in CSS pixels.
 *
 * Held against the seam rather than chosen on its own: the two are told apart by weight, so what matters is
 * that this stays several times the 1px the squares draw on the edges they share.
 */
const WALL_WIDTH = 5

/**
 * The walls, drawn once along the line they mark.
 *
 * A square cannot draw this. A border belongs to one square and is painted inside it, so a wall between two
 * of them came out as two half-walls — twice as thick inside the grid as around its rim, where there is only
 * one square to draw it. Worse, the grid does not land on whole device pixels (an 8×8 board on a phone is
 * 46.75px a square), so the two halves were rounded independently and the wall drifted off the line it was
 * marking, by up to half a pixel in either direction.
 *
 * One stroke on the boundary itself has neither problem: `non-scaling-stroke` keeps it the same width
 * wherever the board is scaled to, and a stroke is centred on its path, so the rim is drawn exactly like
 * every wall inside. The seams stay on the squares — they are symmetric, so they were never crooked.
 */
const Walls: FC<{ puzzle: StarBattlePuzzle; colour: string }> = ({ puzzle, colour }) => {
  const { size } = puzzle
  const segments: string[] = []
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const cell = row * size + col
      // Only the top and left of each square, so a wall between two of them is emitted once. That leaves the
      // far two sides of the grid, which no square is above or to the right of, added after.
      if (boundary(puzzle, cell, -1, 0)) segments.push(`M${col} ${row}h1`)
      if (boundary(puzzle, cell, 0, -1)) segments.push(`M${col} ${row}v1`)
    }
  for (let i = 0; i < size; i++) segments.push(`M${i} ${size}h1`, `M${size} ${i}v1`)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      aria-hidden
      focusable="false"
    >
      <path
        d={segments.join("")}
        stroke={colour}
        strokeWidth={WALL_WIDTH}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}

export const StarBattleBoard: FC<Props> = ({
  puzzle,
  state,
  skin,
  highlighted,
  decided,
  focus,
  celebrated,
  onTapCell,
  onSweepCells,
}) => {
  const { size } = puzzle
  const grid = useRef<HTMLDivElement | null>(null)
  /**
   * The gesture in flight, and the squares it has ruled out so far.
   *
   * The run is held here and committed once on release, which buys two things at once: the marks appear
   * under the finger as it moves, and the whole run lands as a SINGLE move, so undo takes it back in one
   * press. The gesture itself lives in a ref, the way constellation's does — a release has to act on what
   * the finger actually did, and reading that from state would make it depend on whether React re-rendered
   * between two pointer events.
   */
  const drag = useRef<{ from: number; swept: number[] } | undefined>(undefined)
  const swallowClick = useRef(false)
  const [sweeping, setSweeping] = useState<number[]>([])
  const hatch = hatchOf(skin)

  /**
   * Which square a point is over, worked out from the grid's own box rather than from the DOM.
   *
   * A drag captures the pointer on the square it started from, so `pointerenter` never fires on the squares
   * it crosses — which is the whole difficulty with a touch drag. The grid is uniform, so arithmetic answers
   * the question exactly and needs no hit-testing.
   */
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
    // Reaching a DIFFERENT square is what turns a tap into a sweep, so the threshold is one square wide —
    // generous enough that a wobbly tap stays a tap.
    if (over === undefined || over === gesture.from) return
    if (!gesture.swept.length) gesture.swept.push(gesture.from)
    if (!gesture.swept.includes(over)) gesture.swept.push(over)
    setSweeping([...gesture.swept])
  }

  /**
   * A release ends the gesture, and a sweep swallows the click that follows it.
   *
   * The tap stays a real `click`, which is what keeps a keyboard and a screen reader working without this
   * component reimplementing either. A drag ends with a click too, though, so a sweep has to say so.
   */
  const endDrag = () => {
    const gesture = drag.current
    drag.current = undefined
    setSweeping([])
    if (!gesture?.swept.length) return
    swallowClick.current = true
    onSweepCells(gesture.swept)
  }

  // Held back a beat: a star cleared straight after being made is not a mistake (see the hook).
  const conflicts = useDelayedConflicts(state.marks, marks => starBattleConflicts(puzzle, { marks }))
  // The adjacency rule drawn rather than tapped out — see `ruledOutByStars`.
  const spent = ruledOutByStars(puzzle, state.marks)
  return (
    // The board claims its own gestures: a drag across it rules squares out, so it cannot also scroll the
    // page. The page is scrolled to the rules from the chrome around the board — the trade constellation
    // made first, for the same reason.
    <div
      className="aspect-square w-full max-w-[min(56vh,26rem)] touch-none select-none"
      // The rim is a wall like any other, so it is drawn centred on the board's edge and half of it falls
      // outside the grid. The room for that half is reserved here, rather than left to bleed over whatever
      // the board is sitting in — the tomb screen scrolls, and a scroll container clips.
      style={{ padding: WALL_WIDTH / 2 }}
    >
      <div
        ref={grid}
        className="relative grid size-full"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {state.marks.map((value, cell) => (
          <button
            key={cell}
            onPointerDown={beginDrag(cell)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              // Every edge alike: the walls are drawn over the top of these, by `Walls`.
              borderColor: skin.seam,
              ...(decided?.has(cell) ? hatch : {}),
            }}
            onClick={() => {
              if (swallowClick.current) {
                swallowClick.current = false
                return
              }
              onTapCell(cell)
            }}
            className={clsx(
              "flex aspect-square items-center justify-center border p-[14%] transition-colors",
              // A square a star already rules out RECEDES: it is not a mark and must not read as one, so it
              // loses contrast rather than gaining anything of its own.
              spent.has(cell) && !decided?.has(cell) ? skin.spent : skin.cell,
              // Inset, because the squares touch: a ring drawn outside one would sit on top of its
              // neighbour. A broken rule first, then the one square a hint is ABOUT, then the squares it
              // argues FROM — evidence and conclusion cannot look the same, or "this square" is a guess
              // between six of them.
              conflicts.has(cell)
                ? `ring-2 ring-inset ${skin.conflict}`
                : cell === focus
                  ? `ring-3 ring-inset ${skin.focus}`
                  : highlighted?.has(cell) && `ring-2 ring-inset ${skin.evidence}`
            )}
          >
            {value === "star" ? (
              <span className={clsx("block size-full", skin.answer, celebrated?.has(cell) && skin.celebrate)}>
                <skin.Glyph />
              </span>
            ) : value === "dark" || sweeping.includes(cell) ? (
              <span className={clsx("block size-full", skin.dark)}>
                <DarkGlyph />
              </span>
            ) : null}
          </button>
        ))}
        <Walls puzzle={puzzle} colour={skin.wall} />
      </div>
    </div>
  )
}
