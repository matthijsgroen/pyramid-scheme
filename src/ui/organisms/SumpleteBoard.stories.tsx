import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateSumplete } from "@/game/generateSumplete"
import { computeColStatuses, computeRowStatuses, isSumpleteSolved } from "@/game/sumpleteStatus"
import { createSumpleteState, toggleSumpleteCell, type SumpleteCellState } from "@/game/sumpleteState"
import { SumpleteBoard } from "./SumpleteBoard"

const meta = {
  title: "UI/SumpleteBoard",
  component: SumpleteBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof SumpleteBoard>

export default meta
type Story = StoryObj<typeof meta>

const emptyCells = (n: number): SumpleteCellState[][] =>
  Array.from({ length: n }, () => new Array<SumpleteCellState>(n).fill("unknown"))

const p3 = generateSumplete(3, 1)
const p4 = generateSumplete(4, 7)

export const Unsolved3x3: Story = {
  args: {
    ...p3,
    cells: emptyCells(3),
    rowStatuses: computeRowStatuses(p3.grid, emptyCells(3), p3.rowTargets),
    colStatuses: computeColStatuses(p3.grid, emptyCells(3), p3.colTargets),
    onToggle: () => {},
  },
}

export const Unsolved4x4: Story = {
  args: {
    ...p4,
    cells: emptyCells(4),
    rowStatuses: computeRowStatuses(p4.grid, emptyCells(4), p4.rowTargets),
    colStatuses: computeColStatuses(p4.grid, emptyCells(4), p4.colTargets),
    onToggle: () => {},
  },
}

export const Interactive3x3: Story = {
  args: {
    ...p3,
    cells: emptyCells(3),
    rowStatuses: computeRowStatuses(p3.grid, emptyCells(3), p3.rowTargets),
    colStatuses: computeColStatuses(p3.grid, emptyCells(3), p3.colTargets),
    onToggle: () => {},
  },
  render: () => {
    const [state, setState] = useState(createSumpleteState(3))
    const rowStatuses = computeRowStatuses(p3.grid, state.cells, p3.rowTargets)
    const colStatuses = computeColStatuses(p3.grid, state.cells, p3.colTargets)
    const solved = isSumpleteSolved(rowStatuses, colStatuses)

    return (
      <div className="flex flex-col items-center gap-3">
        <SumpleteBoard
          {...p3}
          cells={state.cells}
          rowStatuses={rowStatuses}
          colStatuses={colStatuses}
          onToggle={(r, c) => setState(prev => toggleSumpleteCell(prev, r, c))}
        />
        {solved && <p className="text-sm text-green-400">Solved!</p>}
      </div>
    )
  },
}
