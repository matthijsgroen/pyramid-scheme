import clsx from "clsx"
import type { CSSProperties, FC } from "react"
import type { BalanceLine } from "@/mods/puzzle/game/balanceScale/balanceStatus"
import {
  hasTwin,
  type BalanceAssignment,
  type EquationRef,
  type Glyph,
  type Note,
  type Pan,
  type PanItem,
  type Scale,
} from "@/mods/puzzle/game/balanceScale/techniques"

type Props = {
  scales: Scale[]
  lines: BalanceLine[]
  /** Rows the player worked out — read like scales, and worked on in turn. */
  notes: Note[]
  glyphs: Glyph[]
  values: BalanceAssignment
  /** The glyph the number palette is setting. */
  selected?: Glyph
  maxValue: number
  /** The glyph the current hint names — lit wherever it stands. */
  highlighted?: Glyph
  /** The rows the hint's move is made on. */
  litRefs?: EquationRef[]
  /** A glyph tapped in a pan, waiting for a row that says what it is worth. */
  pending?: { ref: EquationRef; glyph: Glyph }
  /** Which rows can answer that tap. */
  swapSources?: EquationRef[]
  /** The scales that have had their turn in the completion run (`puzzle-screens.md` §3). */
  celebrated?: ReadonlySet<number>
  /** Whether this board offers taking things off both pans, and trading a glyph. */
  moves: { cancelling: boolean; swapping: boolean }
  /** What to do next with the tapped glyph, or why nothing can be done with it. */
  swapPrompt?: string
  onSelectGlyph: (glyph: Glyph) => void
  onPickWeight: (value: number) => void
  onTapPiece: (ref: EquationRef, pan: Pan, index: number) => void
  onTapRow: (ref: EquationRef) => void
  onRemoveNote: (index: number) => void
}

// How far the heavy pan drops. Small on purpose: the pans hold numbers the player is reading, and a
// dramatic tilt costs more legibility than it buys drama.
const DROP_PX = 7
const TILT_DEG = 4

const dropOf = (status: BalanceLine["status"]): number => (status === "left" ? 1 : status === "right" ? -1 : 0)

const refEquals = (a: EquationRef, b: EquationRef) => a.kind === b.kind && a.index === b.index
const refIn = (refs: EquationRef[] | undefined, ref: EquationRef) =>
  !!refs?.some(candidate => refEquals(candidate, ref))

type ChipProps = {
  values: BalanceAssignment
  highlighted?: Glyph
  pendingGlyph?: Glyph
  /** A piece with the same piece opposite it: one tap takes both off. */
  twins: (item: PanItem) => boolean
  /** Whether tapping this piece can do anything at all on this board. */
  movable: (item: PanItem) => boolean
  onTapPiece: (pan: Pan, index: number) => void
}

const PanItems: FC<ChipProps & { items: PanItem[]; pan: Pan }> = ({
  items,
  pan,
  values,
  highlighted,
  pendingGlyph,
  twins,
  movable,
  onTapPiece,
}) => (
  <>
    {items.map((item, index) => (
      // A piece with no move on this board is not a button: there is nothing to press, and a dead
      // press reads as a broken board.
      <button
        key={index}
        disabled={!movable(item)}
        onClick={() => onTapPiece(pan, index)}
        className={clsx("flex h-9 min-w-9 flex-col items-center justify-center rounded px-1 leading-none", {
          "bg-stone-600 text-base font-semibold text-stone-100": item.kind === "weight",
          // A piece that has its twin across the beam is takeable in one tap, and says so.
          "outline outline-stone-400 outline-dashed": twins(item),
          "bg-amber-700 ring-2 ring-amber-300": item.kind === "glyph" && item.glyph === pendingGlyph,
          "bg-sky-800 ring-2 ring-sky-300":
            item.kind === "glyph" && item.glyph === highlighted && item.glyph !== pendingGlyph,
          "bg-amber-900/70": item.kind === "glyph" && item.glyph !== highlighted && item.glyph !== pendingGlyph,
        })}
      >
        {item.kind === "weight" ? (
          item.value
        ) : (
          <>
            <span className="text-base">{item.glyph}</span>
            {values[item.glyph] !== undefined && (
              <span className="text-[0.6rem] text-amber-200">{values[item.glyph]}</span>
            )}
          </>
        )}
      </button>
    ))}
  </>
)

const PanBox: FC<
  ChipProps & { items: PanItem[]; pan: Pan; translate: number; total?: number; settling?: boolean; bob: number }
> = ({ items, pan, translate, total, settling, bob, ...chips }) => (
  <div
    className={clsx("flex flex-1 flex-col items-center transition-transform duration-300", settling && "animate-bob")}
    // Which way this pan rides the rock, read by the `bob` keyframes — the opposite sign to the pan across
    // the beam, the same way their resting tilts are opposite.
    style={{ transform: `translateY(${translate * DROP_PX}px)`, "--bob": bob } as CSSProperties}
  >
    <div className="flex min-h-11 w-full flex-wrap items-center justify-center gap-1 rounded-b-xl border-x-2 border-b-4 border-stone-500 bg-stone-800/70 p-1">
      <PanItems items={items} pan={pan} {...chips} />
    </div>
    {/* The pan's weight, so the arithmetic behind a move is checkable at a glance (design doc §7). */}
    <span className="text-xs text-stone-400">{total ?? "?"}</span>
  </div>
)

type RowProps = ChipProps & {
  scale: Scale
  lit: boolean
  /** This row is taking its turn in the completion run: its beam rocks once and comes level. */
  settling?: boolean
  /** This row can answer the pending tap: tapping it writes the note. */
  offering: boolean
  onTapRow: () => void
}

const ScaleRow: FC<RowProps & { line: BalanceLine }> = ({
  scale,
  line,
  lit,
  offering,
  settling,
  onTapRow,
  ...chips
}) => {
  const drop = dropOf(line.status)
  return (
    <div
      onClick={offering ? onTapRow : undefined}
      className={clsx("relative flex w-full items-start gap-2 rounded-lg border px-2 pt-3 pb-1 transition-colors", {
        "border-green-700 bg-green-950/40": line.status === "level",
        "border-stone-700 bg-stone-900/40": line.status !== "level",
        "ring-2 ring-sky-400": lit,
        "cursor-pointer border-amber-400 ring-2 ring-amber-400": offering,
      })}
    >
      {/* The beam: the tilt is the feedback this whole family teaches with. */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-x-4 top-2 h-1 rounded-full bg-stone-500 transition-transform duration-300",
          settling && "animate-settle"
        )}
        style={{ transform: `rotate(${-drop * TILT_DEG}deg)` }}
      />
      <PanBox items={scale.left} pan="left" translate={drop} total={line.left} settling={settling} bob={1} {...chips} />
      <span className="pt-4 text-stone-500">▲</span>
      <PanBox
        items={scale.right}
        pan="right"
        translate={-drop}
        total={line.right}
        settling={settling}
        bob={-1}
        {...chips}
      />
    </div>
  )
}

// A note: the same pieces, drawn slim and without a beam. It is a row the player worked out, not a
// scale standing in the room — always true, so there is nothing to tilt.
const NoteRow: FC<RowProps & { onRemove: () => void }> = ({ scale, lit, offering, onTapRow, onRemove, ...chips }) => (
  <div
    onClick={offering ? onTapRow : undefined}
    className={clsx("flex w-full items-center gap-1 rounded border border-dashed px-2 py-1", {
      "border-stone-600 bg-stone-900/60": !lit && !offering,
      "border-sky-400 ring-1 ring-sky-400": lit,
      "cursor-pointer border-amber-400 ring-1 ring-amber-400": offering,
    })}
  >
    <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
      <PanItems items={scale.left} pan="left" {...chips} />
    </div>
    <span className="text-stone-400">=</span>
    <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
      <PanItems items={scale.right} pan="right" {...chips} />
    </div>
    <button onClick={onRemove} className="px-1 text-xs text-stone-500 hover:text-stone-300">
      ✕
    </button>
  </div>
)

// Sized off its container, never off a pixel constant: the scales, the notes, the glyph row and the
// weight palette all have to fit a phone screen without pan or zoom (puzzle-screens.md §1).
export const BalanceBoard: FC<Props> = ({
  scales,
  lines,
  notes,
  glyphs,
  values,
  selected,
  maxValue,
  highlighted,
  litRefs,
  pending,
  swapSources,
  celebrated,
  swapPrompt,
  moves,
  onSelectGlyph,
  onPickWeight,
  onTapPiece,
  onTapRow,
  onRemoveNote,
}) => {
  const rowProps = (ref: EquationRef, scale: Scale) => ({
    values,
    highlighted,
    lit: refIn(litRefs, ref),
    offering: refIn(swapSources, ref),
    pendingGlyph: pending && refEquals(pending.ref, ref) ? pending.glyph : undefined,
    twins: (item: PanItem) => moves.cancelling && hasTwin(scale, item),
    // A number can only ever come off against another number; a glyph can also start a trade.
    movable: (item: PanItem) => (moves.cancelling && hasTwin(scale, item)) || (moves.swapping && item.kind === "glyph"),
    onTapPiece: (pan: Pan, index: number) => onTapPiece(ref, pan, index),
    onTapRow: () => onTapRow(ref),
  })

  return (
    <div className="flex w-full max-w-[min(52vh,26rem)] flex-col gap-2 select-none">
      {scales.map((scale, index) => (
        <ScaleRow
          key={index}
          scale={scale}
          line={lines[index]}
          settling={celebrated?.has(index)}
          {...rowProps({ kind: "scale", index }, scale)}
        />
      ))}

      {notes.map((note, index) => (
        <NoteRow
          key={index}
          scale={note}
          onRemove={() => onRemoveNote(index)}
          {...rowProps({ kind: "note", index }, note)}
        />
      ))}

      {/* A tapped glyph either has rows that can answer it or it does not, and both are worth saying:
          a tap that quietly does nothing reads as a broken board. */}
      {swapPrompt && (
        <p
          className={clsx("text-center text-xs", swapSources?.length ? "text-amber-300" : "text-stone-400")}
          aria-live="polite"
        >
          {swapPrompt}
        </p>
      )}

      {/* Which glyph the palette is setting, and what it weighs so far. */}
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {glyphs.map(glyph => (
          <button
            key={glyph}
            onClick={() => onSelectGlyph(glyph)}
            className={clsx("flex h-11 min-w-16 items-center justify-center gap-1 rounded-lg border px-2", {
              "border-amber-400 bg-amber-900/60": glyph === selected,
              "border-stone-600 bg-stone-800": glyph !== selected,
              "ring-2 ring-sky-300": glyph === highlighted,
            })}
          >
            <span className="text-xl">{glyph}</span>
            <span className="text-lg font-semibold text-stone-200">{values[glyph] ?? "?"}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: maxValue }, (_, index) => index + 1).map(value => (
          <button
            key={value}
            onClick={() => onPickWeight(value)}
            className={clsx("size-11 rounded border text-base font-semibold", {
              "border-amber-400 bg-amber-800 text-amber-100": selected !== undefined && values[selected] === value,
              "border-stone-600 bg-stone-800 text-stone-200": selected === undefined || values[selected] !== value,
            })}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
