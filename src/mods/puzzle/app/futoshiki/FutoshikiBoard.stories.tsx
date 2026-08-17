import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateFutoshiki } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "@/mods/puzzle/game/futoshiki/futoshikiConfig"
import {
  createFutoshikiState,
  futoshikiNotes,
  futoshikiValues,
  setFutoshikiValue,
  toggleFutoshikiNote,
} from "@/mods/puzzle/game/futoshiki/futoshikiState"
import { futoshikiConflicts, strandedNotes } from "@/mods/puzzle/game/futoshiki/futoshikiStatus"
import { buildFutoshikiHint } from "./futoshikiHint"
import { FutoshikiBoard } from "./FutoshikiBoard"

const meta = {
  title: "Puzzle/FutoshikiBoard",
  component: FutoshikiBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof FutoshikiBoard>

export default meta
type Story = StoryObj<typeof meta>

const board = (difficulty: keyof typeof FUTOSHIKI_CONFIG, seed: number) => {
  const { size, ...options } = FUTOSHIKI_CONFIG[difficulty]
  return generateFutoshiki(size, seed, options)
}

const starter = board("starter", 1)
const wizard = board("wizard", 4)

const staticArgs = (puzzle: ReturnType<typeof board>) => {
  const state = createFutoshikiState(puzzle)
  return {
    puzzle,
    cells: state.cells,
    conflicts: futoshikiConflicts(puzzle, futoshikiValues(state)),
    onSelect: () => {},
  }
}

export const Starter: Story = { args: staticArgs(starter) }

export const Wizard: Story = { args: staticArgs(wizard) }

/**
 * Pencilled options in some squares, a number written into another, and one square picked. The 2
 * written into the middle column strikes the pencilled 2 above it through in red rather than rubbing
 * it out — correcting that 2 would bring the note back.
 */
export const WithNotes: Story = {
  args: staticArgs(starter),
  render: () => {
    let state = createFutoshikiState(starter)
    state = toggleFutoshikiNote(state, 0, 0, 1)
    state = toggleFutoshikiNote(state, 0, 0, 3)
    state = toggleFutoshikiNote(state, 1, 1, 2)
    state = toggleFutoshikiNote(state, 1, 1, 4)
    state = setFutoshikiValue(state, 2, 1, 2)
    const values = futoshikiValues(state)
    return (
      <FutoshikiBoard
        puzzle={starter}
        cells={state.cells}
        conflicts={futoshikiConflicts(starter, values)}
        stranded={strandedNotes(starter, values, futoshikiNotes(state))}
        selected={{ row: 1, col: 1 }}
        onSelect={() => {}}
      />
    )
  },
}

/** The same number twice in one row, and a sign the two numbers beside it read the wrong way round. */
export const WithConflicts: Story = {
  args: staticArgs(starter),
  render: () => {
    const size = starter.size
    const values = Array.from({ length: size }, () => new Array<number | undefined>(size).fill(undefined))
    values[0][0] = size
    values[0][1] = size
    const cells = values.map(row => row.map(value => ({ value, notes: [] as number[], given: false })))
    return (
      <FutoshikiBoard
        puzzle={starter}
        cells={cells}
        conflicts={futoshikiConflicts(starter, values)}
        onSelect={() => {}}
      />
    )
  },
}

/** The board as played, with the hint's squares and sign lit — the state after pressing Hint. */
export const WithHint: Story = {
  args: staticArgs(starter),
  render: () => {
    const [state, setState] = useState(() => createFutoshikiState(starter))
    const hint = buildFutoshikiHint(
      starter,
      futoshikiValues(state),
      futoshikiNotes(state),
      starter.solution,
      starter.techniqueCap
    )
    return (
      <div className="flex flex-col items-center gap-3">
        <FutoshikiBoard
          puzzle={starter}
          cells={state.cells}
          conflicts={futoshikiConflicts(starter, futoshikiValues(state))}
          highlighted={hint?.cells}
          litSigns={hint?.constraints}
          onSelect={(row, col) => setState(prev => toggleFutoshikiNote(prev, row, col, 1))}
        />
        <p className="text-sm text-amber-300">{hint ? hint.key : "nothing forced"}</p>
      </div>
    )
  },
}
