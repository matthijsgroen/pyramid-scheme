import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateSumplete } from "@/game/generateSumplete"
import { computeColStatuses, computeRowStatuses, isSumpleteSolved, type SumpleteCellState } from "@/game/sumpleteStatus"
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
    const [cells, setCells] = useState(emptyCells(3))
    const rowStatuses = computeRowStatuses(p3.grid, cells, p3.rowTargets)
    const colStatuses = computeColStatuses(p3.grid, cells, p3.colTargets)
    const solved = isSumpleteSolved(rowStatuses, colStatuses)
    const cycle = (s: SumpleteCellState): SumpleteCellState =>
      s === "unknown" ? "excluded" : s === "excluded" ? "included" : "unknown"

    return (
      <div className="flex flex-col items-center gap-3">
        <SumpleteBoard
          {...p3}
          cells={cells}
          rowStatuses={rowStatuses}
          colStatuses={colStatuses}
          onToggle={(r, c) =>
            setCells(prev => {
              const next = prev.map(row => [...row])
              next[r][c] = cycle(prev[r][c])
              return next
            })
          }
        />
        {solved && <p className="text-sm text-green-400">Solved!</p>}
      </div>
    )
  },
}
