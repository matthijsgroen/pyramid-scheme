import { useCallback, useEffect, type FC, type ReactNode } from "react"
import clsx from "clsx"
import { useTranslation } from "react-i18next"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import {
  cellKey,
  directionStep,
  opposite,
  sameCell,
  type CellRef,
  type Direction,
  type MirrorAngle,
} from "@/mods/core/game/beam/physics"
import { traceWitnessBeam, type WitnessBoard, type WitnessSegment } from "../game/generateWitnessDoor"
import {
  chooseWitnessShrine,
  createWitnessDoorState,
  isWitnessDoorSolved,
  turnWitnessMirror,
  type WitnessDoorState,
} from "../game/witnessDoorState"
import { witnessKeyId, WITNESS_SHRINES } from "../game/witnessKeys"

type Props = {
  board: WitnessBoard
  /** Which door this is — the site half of the key ids it mints (see witnessSite). */
  site: string
  onSolved: () => void
  /** The key the named shrine hands over, once the light reaches it. */
  onMint: (keyId: string) => void
  /** Omitted where there is nowhere to go back to — a story, a spec exercising only the minting. */
  onCancel?: () => void
}

// Glyphs, each drawn on its own 100-unit square so it scales with the cell.

const Glyph: FC<{ children: ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 100 100" className="size-full overflow-visible">
    {children}
  </svg>
)

/**
 * A mirror, as the one bar it is, turned into place.
 *
 * Folded into (−90°, 90°] so the two stops are a quarter turn apart in the drawing as well as in the
 * physics: a mirror line is the same line half a turn later, and the other representative would swing the
 * bar the long way round, which is the difference between a turn the eye follows and a jump.
 */
const Mirror: FC<{ angle: MirrorAngle }> = ({ angle }) => {
  const turn = (-angle * 22.5) % 180
  return (
    <Glyph>
      <g
        className="origin-center transition-transform duration-200 ease-out"
        style={{ transform: `rotate(${turn <= -90 ? turn + 180 : turn}deg)` }}
      >
        <line x1={6} y1={50} x2={94} y2={50} strokeWidth={14} strokeLinecap="round" className="stroke-sky-200" />
      </g>
    </Glyph>
  )
}

/** The disc the light leaves, with a nose saying which way it goes. */
const SunDisc: FC<{ facing: Direction }> = ({ facing }) => {
  const { row, col } = directionStep(facing)
  const point = (along: number, across: number) =>
    `${50 + col * along - row * across},${50 + row * along + col * across}`
  return (
    <Glyph>
      <circle cx={50} cy={50} r={30} className="fill-amber-300" />
      <polygon points={`${point(46, 0)} ${point(24, 16)} ${point(24, -16)}`} className="fill-amber-300" />
    </Glyph>
  )
}

/** A niche cut in the wall. Ringed while it is the one the player named, filled once the light arrives. */
const ShrineNiche: FC<{ lit: boolean; named: boolean }> = ({ lit, named }) => (
  <Glyph>
    <path
      d="M22 92 L22 46 A28 28 0 0 1 78 46 L78 92 Z"
      strokeWidth={8}
      className={clsx(lit ? "fill-amber-200 stroke-amber-100" : "fill-stone-900 stroke-stone-400")}
    />
    {named && <circle cx={50} cy={58} r={46} fill="none" strokeWidth={6} className="stroke-amber-400" />}
  </Glyph>
)

/** Where a beam travelling `direction` crosses a cell's edge. */
const sidePoint = (at: CellRef, direction: Direction): [number, number] => {
  const { row, col } = directionStep(direction)
  return [at.col + (col === 0 ? 0.5 : col > 0 ? 1 : 0), at.row + (row === 0 ? 0.5 : row > 0 ? 1 : 0)]
}

const segmentPoints = (segment: WitnessSegment): string => {
  const centre: [number, number] = [segment.at.col + 0.5, segment.at.row + 0.5]
  const points = [sidePoint(segment.at, opposite(segment.enter)), centre]
  if (segment.exit !== undefined) points.push(sidePoint(segment.at, segment.exit))
  return points.map(([x, y]) => `${x},${y}`).join(" ")
}

/** The light, over the pieces: a beam that stopped under a glyph would read as a beam that stopped short. */
const BeamLayer: FC<{ size: number; path: readonly WitnessSegment[] }> = ({ size, path }) => (
  <svg
    viewBox={`0 0 ${size} ${size}`}
    className="pointer-events-none absolute inset-0 z-20 size-full mix-blend-screen"
    aria-hidden
  >
    {path.map(segment => (
      <polyline
        key={`${cellKey(segment.at)},${segment.enter}`}
        points={segmentPoints(segment)}
        fill="none"
        strokeWidth={0.09}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-amber-200"
      />
    ))}
  </svg>
)

/**
 * How far a mirror's tap target reaches past its own cell, per side — the full 5px onto a neighbour that
 * holds no mirror, and nothing at all onto one that does.
 *
 * A cell on a wizard board is about 37px on a 360px screen, under the 44px bar
 * (docs/instructions/puzzle-screens.md), so the target has to grow. Lightbeam grows its by refusing any
 * board whose pieces touch; this family cannot — both branches of one fork share a small grid, and 87% of
 * starter drafts hold a touching pair — so it grows only into the space a board actually leaves free.
 *
 * Only the four square neighbours are asked. Two diagonal mirrors still overlap, in the 5px square at the
 * corner they share — a place a thumb aimed at either one does not land.
 */
const tapInset = (mirrorCells: ReadonlySet<string>, at: CellRef): string =>
  (
    [
      { row: at.row - 1, col: at.col },
      { row: at.row, col: at.col + 1 },
      { row: at.row + 1, col: at.col },
      { row: at.row, col: at.col - 1 },
    ] as CellRef[]
  )
    .map(beside => (mirrorCells.has(cellKey(beside)) ? "0px" : "-5px"))
    .join(" ")

const WitnessDoorBoard: FC<{
  board: WitnessBoard
  state: WitnessDoorState
  onTurn: (mirror: number) => void
}> = ({ board, state, onTurn }) => {
  const { size, sun, mirrors } = board.grid
  const walk = traceWitnessBeam(board, state.angles)
  const mirrorAt = new Map(mirrors.map((at, index) => [cellKey(at), index]))
  const mirrorCells = new Set(mirrorAt.keys())
  return (
    // `isolate`, so the layering below is this board's own rather than whatever stacking context an
    // ancestor happens to have opened.
    <div className="relative isolate aspect-square w-full max-w-[min(56vh,26rem)] select-none">
      <div
        className="grid size-full gap-px"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: size * size }, (_, index) => {
          const at: CellRef = { row: Math.floor(index / size), col: index % size }
          const cls = "relative flex aspect-square min-h-0 items-center justify-center rounded bg-stone-800 p-[8%]"
          const shrine = WITNESS_SHRINES.find(candidate => sameCell(board.shrines[candidate], at))
          const mirror = mirrorAt.get(cellKey(at))
          if (mirror !== undefined)
            return (
              // `z-10` is what makes the target below reach anything: every cell is positioned, so a
              // later one in reading order paints — and takes taps — over an earlier one's overhang.
              <button key={cellKey(at)} onClick={() => onTurn(mirror)} className={clsx(cls, "z-10")}>
                <Mirror angle={state.angles[mirror]} />
                {/* The target, reaching past the cell wherever the board leaves room — see tapInset. */}
                <span className="absolute" style={{ inset: tapInset(mirrorCells, at) }} />
              </button>
            )
          return (
            <div key={cellKey(at)} className={cls}>
              {shrine && <ShrineNiche lit={walk.shrine === shrine} named={state.chosen === shrine} />}
              {sameCell(sun.at, at) && <SunDisc facing={sun.facing} />}
            </div>
          )
        })}
      </div>
      <BeamLayer size={size} path={walk.path} />
    </div>
  )
}

/**
 * The room where solving is choosing: one beam, two shrines, and the shrine the player names is the branch
 * of the floor's fork they open. Reaching the other one lights it and settles nothing.
 */
export const WitnessDoorPuzzle: FC<Props> = ({ board, site, onSolved, onMint, onCancel }) => {
  const { t } = useTranslation("common")
  const [state, setState] = usePuzzleState(() => createWitnessDoorState(board))

  const chosen = state.chosen
  const solved = isWitnessDoorSolved(board, state, chosen)

  // The key is handed over the moment the light lands, not when the banner is dismissed: the player may
  // back out of a solved board, and the branch they opened stays open.
  useEffect(() => {
    if (solved && chosen) onMint(witnessKeyId(site, chosen))
  }, [solved, chosen, site, onMint])

  const turn = useCallback(
    (mirror: number) => {
      if (solved) return // the door has opened; nothing may move under it
      setState(prev => turnWitnessMirror(prev, mirror))
    },
    [solved, setState]
  )

  /**
   * Naming a shrine, which a lit board no longer allows.
   *
   * The choice binds THIS VISIT, not the door: keys accumulate, so a player who walks back in may name
   * the other shrine and open the other branch too — the cost of a choice is a walk, never lost content.
   * What the freeze buys is that one visit hands over one key, so the walk is actually paid.
   */
  const choose = useCallback(
    (shrine: (typeof WITNESS_SHRINES)[number]) => {
      if (solved) return
      setState(prev => chooseWitnessShrine(prev, shrine))
    },
    [solved, setState]
  )

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel ?? (() => {})}
      solved={solved}
      onReset={() => setState(createWitnessDoorState(board))}
      title={t("witnessDoor.name")}
      goal={t("witnessDoor.goal")}
      rules={
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("witnessDoor.rules.shrines")}</li>
          <li>{t("witnessDoor.rules.choice")}</li>
          <li>{t("witnessDoor.rules.tap")}</li>
        </ul>
      }
    >
      {({ reportInput }) => (
        <>
          {/* The choice sits above the board, because it is the question the board is an answer to. */}
          <fieldset className="flex w-full flex-col items-center gap-2">
            <legend className="mb-1 w-full text-center text-sm text-stone-400">{t("witnessDoor.choose")}</legend>
            <div className="flex w-full gap-2">
              {WITNESS_SHRINES.map(shrine => (
                <button
                  key={shrine}
                  aria-pressed={chosen === shrine}
                  onClick={() => {
                    reportInput()
                    choose(shrine)
                  }}
                  className={clsx(
                    "flex h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors",
                    chosen === shrine ? "bg-amber-700 text-amber-100" : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  )}
                >
                  {t(`witnessDoor.shrine.${shrine}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <WitnessDoorBoard
            board={board}
            state={state}
            onTurn={mirror => {
              reportInput()
              turn(mirror)
            }}
          />
        </>
      )}
    </PuzzleFamilyShell>
  )
}
