import clsx from "clsx"
import { useRef, useState, type FC, type PointerEvent } from "react"
import type { Mark, ProcessionPuzzle, ProcessionState } from "@/mods/puzzle/game/procession/procession"
import { lastStart } from "@/mods/puzzle/game/procession/procession"
import type { ProcessionSkin } from "./skins"

type Props = {
  puzzle: ProcessionPuzzle
  state: ProcessionState
  skin: ProcessionSkin
  /** Which marks do not hold where the bars stand now — the board's only feedback. */
  broken: readonly number[]
  /** The mark the player tapped, so the rows it joins can say so. */
  focus?: number
  onFocus: (mark: number | undefined) => void
  /** The row a hint is about, and the ticks it says the bar belongs on. */
  hintBar?: number
  hintTick?: number
  solved?: boolean
  onSlide: (index: number, start: number) => void
}

/**
 * A day as a ruled track, the things that happen in it as bars, and what has to hold between them below.
 *
 * **Percentages of the frame rather than pixels**, so the day is as wide as the screen can make it and a
 * tick is never a number this file knows. A tick at the top tier is around 24px, which is not a tap target
 * — but nothing is tapped here. **The thing a finger grabs is the BAR**, two ticks wide at the very least,
 * and the snap does the precision (`docs/game-design/puzzles/procession.md` §5).
 */
export const ProcessionBoard: FC<Props> = ({
  puzzle,
  state,
  skin,
  broken,
  focus,
  onFocus,
  hintBar,
  hintTick,
  solved,
  onSlide,
}) => {
  const frame = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ index: number; from: number; origin: number } | undefined>()
  const share = 100 / puzzle.ticks
  const focused = focus === undefined ? undefined : puzzle.marks[focus]
  const about = (index: number) =>
    focused !== undefined &&
    focused.kind !== "span" &&
    (focused.a === index || (focused.kind !== "pin" && focused.b === index))

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || !frame.current) return
    const tick = frame.current.getBoundingClientRect().width / puzzle.ticks
    const wanted = drag.origin + Math.round((event.clientX - drag.from) / tick)
    if (wanted !== state.starts[drag.index]) onSlide(drag.index, wanted)
  }

  return (
    <div className="w-full max-w-[min(96vw,60vh)] select-none">
      <div
        ref={frame}
        className={clsx("relative w-full touch-none overflow-hidden rounded", skin.ground)}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(undefined)}
        onPointerCancel={() => setDrag(undefined)}
      >
        {puzzle.bars.map((bar, index) => {
          const start = state.starts[index]
          return (
            <div
              key={index}
              className={clsx("relative h-12 border-b border-stone-800 last:border-b-0", skin.row)}
              style={{
                backgroundImage: `linear-gradient(to right, ${skin.seam} 1px, transparent 1px)`,
                backgroundSize: `${share}% 100%`,
              }}
            >
              {/* The tick a pin names, drawn where it belongs rather than in the strip below: a pin is
                  about one row and one tick, and a chip would make the player find the tick again. */}
              {puzzle.marks.map((mark, at) =>
                mark.kind === "pin" && mark.a === index ? (
                  <div
                    key={at}
                    className={clsx("pointer-events-none absolute bottom-0 h-1.5 rounded-t", skin.pin)}
                    style={{ left: `${mark.tick * share}%`, width: `${share}%` }}
                  />
                ) : null
              )}

              {hintBar === index && hintTick !== undefined && (
                <div
                  className="pointer-events-none absolute inset-y-0"
                  style={{
                    left: `${hintTick * share}%`,
                    width: `${bar.len * share}%`,
                    backgroundImage: `repeating-linear-gradient(45deg, transparent 0 4px, ${skin.hatch} 4px 7px)`,
                  }}
                />
              )}

              <div
                role="button"
                aria-label={`bar ${index + 1}`}
                onPointerDown={event => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  onFocus(undefined)
                  setDrag({ index, from: event.clientX, origin: start })
                }}
                className={clsx(
                  "absolute inset-y-0.5 cursor-grab rounded border-2 transition-[left] duration-100",
                  skin.bars[index % skin.bars.length],
                  about(index) && `ring-2 ${skin.focus}`,
                  hintBar === index && `ring-2 ${skin.focus}`,
                  solved && skin.celebrate
                )}
                style={{ left: `${start * share}%`, width: `${bar.len * share}%` }}
              />
              {/* Where the row runs out, so a bar dragged to the edge reads as stopped rather than stuck. */}
              <span className="sr-only">
                {start + 1}–{start + bar.len} of {lastStart(puzzle, index) + bar.len}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {puzzle.marks.map((mark, index) =>
          mark.kind === "pin" ? null : (
            <button
              key={index}
              aria-label={`mark ${index + 1}`}
              onClick={() => onFocus(focus === index ? undefined : index)}
              className={clsx(
                "flex h-11 min-w-11 items-center gap-1 rounded border px-1.5 transition-colors",
                broken.includes(index) ? skin.markBroken : skin.markHeld,
                focus === index && `ring-2 ${skin.focus}`
              )}
            >
              <MarkGlyph mark={mark} skin={skin} bars={puzzle.bars.length} />
            </button>
          )
        )}
      </div>
    </div>
  )
}

/** A bar as it appears inside a mark: the row's own colour, so a mark names its rows without a word. */
const Swatch: FC<{ skin: ProcessionSkin; index: number; wide?: boolean }> = ({ skin, index, wide }) => (
  <span
    className={clsx("inline-block h-3 rounded-sm border", wide ? "w-6" : "w-4", skin.bars[index % skin.bars.length])}
  />
)

/**
 * What a mark says, drawn rather than written (`PUZZLE_FAMILIES.md` P2).
 *
 * Each chip is the relation in miniature: two bars with a numeral between them is a gap of that many
 * ticks, one arrow is "this one first", two arrows is "in some order, but never at once", and bars drawn
 * on top of each other is "at the same time". The numerals are the only content, and a numeral reads the
 * same in every language.
 */
const MarkGlyph: FC<{ mark: Mark; skin: ProcessionSkin; bars: number }> = ({ mark, skin, bars }) => {
  switch (mark.kind) {
    case "link":
      return (
        <>
          <Swatch skin={skin} index={mark.a} />
          <span className="px-0.5 text-xs tabular-nums">{mark.gap}</span>
          <Swatch skin={skin} index={mark.b} />
        </>
      )
    case "before":
      return (
        <>
          <Swatch skin={skin} index={mark.a} />
          <span className="text-sm">›</span>
          <Swatch skin={skin} index={mark.b} />
        </>
      )
    case "apart":
      return (
        <>
          <Swatch skin={skin} index={mark.a} />
          <span className="text-sm">‹›</span>
          <Swatch skin={skin} index={mark.b} />
        </>
      )
    case "together":
      return (
        <span className="relative inline-block h-5 w-7">
          <span className="absolute top-0 left-0">
            <Swatch skin={skin} index={mark.a} />
          </span>
          <span className="absolute bottom-0 left-2">
            <Swatch skin={skin} index={mark.b} />
          </span>
        </span>
      )
    case "span":
      return (
        <span className="flex items-center gap-1">
          <span className="flex flex-col gap-px">
            {Array.from({ length: Math.min(bars, 3) }, (_, row) => (
              <Swatch key={row} skin={skin} index={row} wide />
            ))}
          </span>
          <span className="text-xs tabular-nums">{mark.ticks}</span>
        </span>
      )
    default:
      return null
  }
}
