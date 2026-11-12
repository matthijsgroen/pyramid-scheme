import type { Meta, StoryObj } from "@storybook/react-vite"
import clsx from "clsx"
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from "react"
import type { CellMark, StarBattlePuzzle } from "@/mods/puzzle/game/starBattle/starBattle"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { createSudokuState, sudokuValues } from "@/mods/puzzle/game/sudoku/sudokuState"
import { sudokuConflicts } from "@/mods/puzzle/game/sudoku/sudokuStatus"
import { StarBattleBoard } from "../starBattle/StarBattleBoard"
import { skinFor as starSkinFor } from "../starBattle/skins"
import { SudokuBoard } from "../sudoku/SudokuBoard"
import { skinFor as sudokuSkinFor } from "../sudoku/skins"

type Variant = "ring" | "glow" | "lift"

const EMBER = "var(--color-ember-400)"
const EMBER_SOFT = "color-mix(in srgb, var(--color-ember-400) 45%, transparent)"
const INK = "var(--color-ink-900)"

const VARIANT_LABEL: Record<Variant, string> = {
  ring: "A. Thick amber ring",
  glow: "B. Soft glow + corner brackets",
  lift: "C. Lifted cell",
}

const Brackets: FC<{ inset: number }> = ({ inset }) => {
  const arm = "28%"
  const line = `3px solid ${EMBER}`
  const corner = (pos: CSSProperties, borders: CSSProperties) => (
    <span className="absolute" style={{ width: arm, height: arm, maxWidth: 14, maxHeight: 14, ...pos, ...borders }} />
  )
  return (
    <>
      {corner({ top: inset, left: inset }, { borderTop: line, borderLeft: line })}
      {corner({ top: inset, right: inset }, { borderTop: line, borderRight: line })}
      {corner({ bottom: inset, left: inset }, { borderBottom: line, borderLeft: line })}
      {corner({ bottom: inset, right: inset }, { borderBottom: line, borderRight: line })}
    </>
  )
}

/** What lies over the focused thing, for the variants that draw over it rather than move it. */
const Overlay: FC<{ variant: Variant; rounded?: boolean }> = ({ variant, rounded }) => {
  if (variant === "ring")
    return (
      <span
        className={clsx("pointer-events-none absolute inset-[-5px]", rounded ? "rounded-full" : "rounded-[3px]")}
        style={{ border: `3px solid ${EMBER}`, boxShadow: `0 0 0 1.5px ${INK}, inset 0 0 0 1.5px ${INK}` }}
      />
    )
  if (variant === "glow")
    return (
      <span
        className={clsx("pointer-events-none absolute inset-0", rounded && "rounded-full")}
        style={{
          boxShadow: `inset 0 0 0 2px ${EMBER_SOFT}, inset 0 0 14px 2px ${EMBER_SOFT}`,
          background: "color-mix(in srgb, var(--color-ember-300) 12%, transparent)",
        }}
      >
        <Brackets inset={rounded ? -4 : -2} />
      </span>
    )
  return null
}

/** C moves the element itself: a little larger, lifted on a shadow, a thin ring. */
const liftStyle: Partial<CSSStyleDeclaration> = {
  transform: "scale(1.15)",
  filter: "brightness(1.3)",
  zIndex: "5",
  position: "relative",
  boxShadow: `0 6px 12px rgba(0,0,0,0.55), 0 0 0 1.5px ${EMBER}`,
}

/** Draws the fake cursor over cell `index` of whatever grid board is inside. */
const CursorOver: FC<{ variant: Variant; index: number; children: ReactNode }> = ({ variant, index, children }) => {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number }>()

  useLayoutEffect(() => {
    const root = wrap.current
    const grid = root?.querySelector<HTMLElement>('[style*="grid-template-rows"]')
    const cell = grid?.children[index] as HTMLElement | undefined
    if (!root || !cell) return
    const measure = () => {
      const outer = root.getBoundingClientRect()
      const inner = cell.getBoundingClientRect()
      setBox({ left: inner.left - outer.left, top: inner.top - outer.top, width: inner.width, height: inner.height })
    }
    measure()
    if (variant !== "lift") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }
    const before = cell.getAttribute("style") ?? ""
    Object.assign(cell.style, liftStyle)
    return () => cell.setAttribute("style", before)
  }, [variant, index])

  return (
    <div ref={wrap} className="relative w-full">
      {children}
      {variant !== "lift" && box && (
        <div className="pointer-events-none absolute" style={box}>
          <Overlay variant={variant} />
        </div>
      )}
    </div>
  )
}

/** The shell's undo pill, copied in look, shown with the variant's focus treatment. */
const pillCls =
  "relative flex h-11 flex-1 items-center justify-center gap-1 rounded-full px-3 text-sm font-medium transition-colors"

const FocusedPill: FC<{ variant: Variant; className: string; children: ReactNode }> = ({
  variant,
  className,
  children,
}) => (
  <button
    className={clsx(pillCls, className)}
    style={
      variant === "lift"
        ? { transform: "scale(1.06)", boxShadow: `0 6px 12px rgba(0,0,0,0.55), 0 0 0 1.5px ${EMBER}` }
        : undefined
    }
  >
    {children}
    <Overlay variant={variant} rounded />
  </button>
)

const sudoku = generateSudoku(1, SUDOKU_CONFIG.starter)
const sudokuSkin = sudokuSkinFor(undefined, undefined)
const sudokuState = createSudokuState(sudoku)
const sudokuConflictSet = sudokuConflicts(sudoku, sudokuValues(sudokuState))

const starPuzzle: StarBattlePuzzle = {
  size: 6,
  quota: 1,
  // prettier-ignore
  regions: [
    0, 0, 1, 1, 1, 2,
    0, 0, 1, 2, 2, 2,
    3, 0, 4, 4, 2, 2,
    3, 3, 4, 5, 5, 2,
    3, 3, 4, 4, 5, 5,
    3, 3, 3, 4, 5, 5,
  ],
}
const starMarks: (CellMark | undefined)[] = new Array(36).fill(undefined)
starMarks[1] = "star"
starMarks[8] = "dark"
starMarks[14] = "dark"
const starSkin = starSkinFor(starPuzzle, undefined, undefined)

const clamp = (value: number, max: number) => Math.max(0, Math.min(max - 1, value))

const useArrowCursor = () => {
  const [pos, setPos] = useState({ row: 2, col: 2 })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key]
      if (!move) return
      event.preventDefault()
      setPos(({ row, col }) => ({ row: clamp(row + move[0], 6), col: clamp(col + move[1], 6) }))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return pos
}

const Column: FC<{ variant: Variant; row: number; col: number }> = ({ variant, row, col }) => (
  <section className="flex w-88 max-w-full flex-col items-center gap-4 rounded-lg bg-black/30 p-3">
    <h2 className="self-start text-sm font-semibold text-parchment-200">{VARIANT_LABEL[variant]}</h2>
    <CursorOver variant={variant} index={Math.min(row, sudoku.size - 1) * sudoku.size + Math.min(col, sudoku.size - 1)}>
      <SudokuBoard
        puzzle={sudoku}
        skin={sudokuSkin}
        cells={sudokuState.cells}
        conflicts={sudokuConflictSet}
        onSelect={() => {}}
      />
    </CursorOver>
    <CursorOver variant={variant} index={row * starPuzzle.size + col}>
      <StarBattleBoard
        puzzle={starPuzzle}
        state={{ marks: starMarks }}
        skin={starSkin}
        onTapCell={() => {}}
        onSweepCells={() => {}}
      />
    </CursorOver>
    <div className="flex w-full items-center gap-2 pt-2">
      <FocusedPill variant={variant} className="bg-stone-800 text-stone-200">
        ↩ Undo
      </FocusedPill>
      <button className={clsx(pillCls, "bg-amber-700 text-amber-100")}>💡 Hint</button>
    </div>
  </section>
)

const Spike: FC<{ variants: Variant[] }> = ({ variants }) => {
  const { row, col } = useArrowCursor()
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-parchment-300">
        Arrow keys move the cursor (click the canvas first). Cell row {row + 1}, col {col + 1}. The undo pill is drawn
        as focused.
      </p>
      <div className="flex flex-wrap items-start gap-6">
        {variants.map(variant => (
          <Column key={variant} variant={variant} row={row} col={col} />
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: "Spikes/Board cursor",
  component: Spike,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof Spike>

export default meta
type Story = StoryObj<typeof meta>

export const SideBySide: Story = { args: { variants: ["ring", "glow", "lift"] } }
export const ThickRing: Story = { args: { variants: ["ring"] } }
export const GlowBrackets: Story = { args: { variants: ["glow"] } }
export const LiftedCell: Story = { args: { variants: ["lift"] } }
