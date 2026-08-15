import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateSumplete } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { SUMPLETE_CONFIG } from "@/mods/puzzle/game/sumplete/sumpleteConfig"
import { computeColLines, computeRowLines, isSumpleteSolved } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import { createSumpleteState, toggleSumpleteCell } from "@/mods/puzzle/game/sumplete/sumpleteState"
import { buildSumpleteHint } from "./sumpleteHint"
import { SumpleteBoard } from "./SumpleteBoard"

const meta = {
  title: "Puzzle/SumpleteBoard",
  component: SumpleteBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof SumpleteBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: keyof typeof SUMPLETE_CONFIG, seed: number) => {
  const { size, ...options } = SUMPLETE_CONFIG[difficulty]
  return generateSumplete(size, seed, options)
}

const starter = board("starter", 1)
const wizard = board("wizard", 7)

const staticArgs = (puzzle: ReturnType<typeof board>) => {
  const cells = createSumpleteState(puzzle.grid.length).cells
  return {
    grid: puzzle.grid,
    cells,
    rows: computeRowLines(puzzle.grid, cells, puzzle.rowTargets),
    cols: computeColLines(puzzle.grid, cells, puzzle.colTargets),
    onToggle: () => {},
  }
}

export const Starter: Story = { args: staticArgs(starter) }

export const Wizard: Story = { args: staticArgs(wizard) }

/** The board as played, with the hint's cells and line lit — the state after pressing Hint. */
export const WithHint: Story = {
  args: staticArgs(starter),
  render: () => {
    const [state, setState] = useState(createSumpleteState(starter.grid.length))
    const rows = computeRowLines(starter.grid, state.cells, starter.rowTargets)
    const cols = computeColLines(starter.grid, state.cells, starter.colTargets)
    const hint = buildSumpleteHint(starter, state.cells, starter.solution, starter.techniqueCap)

    return (
      <div className="flex flex-col items-center gap-3">
        <SumpleteBoard
          grid={starter.grid}
          cells={state.cells}
          rows={rows}
          cols={cols}
          highlighted={hint?.cells}
          litLine={hint?.line}
          onToggle={(row, col) => setState(prev => toggleSumpleteCell(prev, row, col))}
        />
        <p className="text-sm text-amber-300">{hint ? hint.key : "nothing forced"}</p>
        {isSumpleteSolved(rows, cols) && <p className="text-sm text-green-400">Solved!</p>}
      </div>
    )
  },
}
