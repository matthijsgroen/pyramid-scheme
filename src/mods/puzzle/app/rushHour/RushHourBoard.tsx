import clsx from "clsx"
import { useRef, useState, type FC, type PointerEvent } from "react"
import { exitLane, legalRange, type RushHourPuzzle, type RushHourState } from "@/mods/puzzle/game/rushHour/rushHour"
import type { RushHourSkin } from "./skins"

type Props = {
  puzzle: RushHourPuzzle
  state: RushHourState
  skin: RushHourSkin
  /** The piece the current hint is about, and the cells it would end up on. */
  hintPiece?: number
  hintCells?: readonly number[]
  /** True once the board is solved, so the player's piece leaves by the gap (`puzzle-screens.md` §3). */
  leaving?: boolean
  /** A piece was shoved to a new offset. Reported per cell crossed, so a drag is a run of these. */
  onSlide: (index: number, offset: number) => void
}

/**
 * The blockade, as a frame of lanes with pieces standing in them.
 *
 * **Percentages of the frame rather than pixels**, so the board is whatever the screen can give it and a
 * cell is never a number this file knows. The frame is a square, and the drag maths asks the DOM how big a
 * cell turned out to be.
 *
 * **The frame clips.** The completion run drives the player's piece past the east edge, and a piece drawn
 * outside an unclipped frame paints over the shell around it — the piece has to leave THROUGH the gap, which
 * means disappearing behind the wall it went through.
 *
 * **So the frame keeps a gutter to its east and the way out is drawn in it**, outside the board where no
 * piece can cover it. The frame takes 92% of the width it is given and the marker has the rest.
 */
export const RushHourBoard: FC<Props> = ({ puzzle, state, skin, hintPiece, hintCells, leaving, onSlide }) => {
  const frame = useRef<HTMLDivElement>(null)
  /** The piece being dragged: which one, where the finger went down, and the offset it started at. */
  const [drag, setDrag] = useState<{ index: number; from: number; origin: number } | undefined>()
  const share = 100 / puzzle.size
  const lane = exitLane(puzzle)

  /**
   * A drag, resolved to whole cells and committed as it goes.
   *
   * **Committed per cell rather than on release**, which is what makes a shove feel like a shove: the
   * piece moves under the finger, and it stops dead where something is in its way because `slidePiece`
   * clamps to the legal range. There is no illegal preview to undo and no gesture to reject.
   */
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || !frame.current) return
    const piece = puzzle.pieces[drag.index]
    const cell = frame.current.getBoundingClientRect().width / puzzle.size
    const travelled = (piece.horizontal ? event.clientX : event.clientY) - drag.from
    const wanted = drag.origin + Math.round(travelled / cell)
    if (wanted !== state.offsets[drag.index]) onSlide(drag.index, wanted)
  }

  return (
    <div className="relative w-full max-w-[min(92vw,60vh)]">
      <div
        ref={frame}
        className={clsx("relative aspect-square w-[92%] touch-none overflow-hidden select-none", skin.ground)}
        style={skin.art && { backgroundImage: `url(${skin.art.ground})`, backgroundSize: "100% 100%" }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(undefined)}
        onPointerCancel={() => setDrag(undefined)}
      >
        {/* The lanes. Drawn as cell edges rather than as a grid image: half the reading of this board is
          counting how many cells a piece owns and how many are free in front of it. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${skin.seam} 1px, transparent 1px), linear-gradient(to bottom, ${skin.seam} 1px, transparent 1px)`,
            backgroundSize: `${share}% ${share}%`,
          }}
        />

        {/* Walled cells, hatched: a kind of thing no piece looks like, so nobody plans around shifting one
          (skins.ts). Drawn before the pieces, which is safe because no board ever stands a piece on one. */}
        {puzzle.walls?.map(cell => (
          <div
            key={`wall-${cell}`}
            className={clsx("pointer-events-none absolute", skin.wall)}
            style={{
              left: `${(cell % puzzle.size) * share}%`,
              top: `${Math.floor(cell / puzzle.size) * share}%`,
              width: `${share}%`,
              height: `${share}%`,
              backgroundImage: [
                `repeating-linear-gradient(45deg, transparent 0 4px, ${skin.wallHatch} 4px 7px)`,
                skin.art && `url(${skin.art.wall})`,
              ]
                .filter(Boolean)
                .join(", "),
              backgroundSize: "auto, 100% 100%",
            }}
          />
        ))}

        {hintCells?.map(cell => (
          <div
            key={cell}
            className={clsx("pointer-events-none absolute rounded ring-2 ring-inset", skin.evidence)}
            style={{
              left: `${(cell % puzzle.size) * share}%`,
              top: `${Math.floor(cell / puzzle.size) * share}%`,
              width: `${share}%`,
              height: `${share}%`,
            }}
          />
        ))}

        {puzzle.pieces.map((piece, index) => {
          const offset = state.offsets[index]
          const mine = index === 0
          const [low, high] = legalRange(puzzle, state, index)
          const pinned = low === high
          return (
            <div
              key={index}
              role="button"
              aria-label={`piece ${index + 1}`}
              onPointerDown={event => {
                event.currentTarget.setPointerCapture(event.pointerId)
                setDrag({
                  index,
                  from: piece.horizontal ? event.clientX : event.clientY,
                  origin: offset,
                })
              }}
              className={clsx(
                "absolute rounded-lg border-2 transition-[left,top] duration-150",
                mine ? skin.player : skin.piece,
                mine ? skin.playerEdge : skin.pieceEdge,
                pinned ? "cursor-default" : "cursor-grab",
                hintPiece === index && `ring-2 ${skin.focus}`,
                mine && leaving && skin.celebrate
              )}
              style={{
                left: `${(piece.horizontal ? (mine && leaving ? puzzle.size : offset) : piece.lane) * share}%`,
                top: `${(piece.horizontal ? piece.lane : offset) * share}%`,
                width: `${(piece.horizontal ? piece.len : 1) * share}%`,
                height: `${(piece.horizontal ? 1 : piece.len) * share}%`,
                // **The player's piece has a nose**, which is the signal a player who reads no colour gets:
                // it is the only piece on the board that is not a plain rectangle, and it points at the way
                // out (`puzzle-screens.md` §2). A painted face draws its own prow, so the clip stands down.
                clipPath: mine && !skin.art ? "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)" : undefined,
              }}
            >
              {skin.art && (
                <img
                  src={mine ? skin.art.player : piece.len === 3 ? skin.art.piece3 : skin.art.piece2}
                  alt=""
                  draggable={false}
                  // `max-w-none` because preflight caps an image at the width of its box, and a turned sprite
                  // is deliberately wider than its box — without it the art is squashed rather than turned.
                  className="pointer-events-none absolute max-w-none object-fill"
                  // **The whole sledge is inside the cells it owns, runners and all.** Drawing the deck to the
                  // cell lines and letting the handles hang over the neighbours was truer to the object and
                  // read as clutter — a dozen pieces overlapping each other is a board that looks jumbled
                  // rather than gridded. Whole-object-in-box asks the player to read length off the sledge
                  // rather than off the cell lines, which they can: the handles are visibly part of the thing.
                  //
                  // **A piece across the board is the piece along it, turned** — one image serves both axes,
                  // which only works because the art has no lighting direction (`rush-hour.md` §5). A turned
                  // image swaps the box it fills, so it is hung off the middle and spun there.
                  style={{
                    top: "50%",
                    left: "50%",
                    translate: "-50% -50%",
                    width: `${(piece.horizontal ? 1 : piece.len) * 100}%`,
                    height: `${(piece.horizontal ? 1 : 1 / piece.len) * 100}%`,
                    rotate: piece.horizontal ? undefined : "90deg",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* The way out, drawn OUTSIDE the board on the player's own lane.
          **No piece can ever stand in front of it**, which is the whole reason it is out here: a marker
          inside the east edge is covered by whatever occupies the last column, and that is the one thing on
          the board every move is aimed at. The gutter it stands in is the 8% the frame gives up above.
          Its box is an unclipped twin of the frame, which is what lets it speak in the same cell
          percentages the pieces do. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[92%]">
        <div
          className={clsx("absolute", skin.exit)}
          style={{
            left: "100%",
            top: `${lane * share}%`,
            height: `${share}%`,
            width: `${share * 0.5}%`,
            // A chevron pointing the way out, so the marker says WHICH WAY as well as where.
            clipPath: "polygon(0 15%, 55% 15%, 100% 50%, 55% 85%, 0 85%)",
          }}
        />
      </div>
    </div>
  )
}
