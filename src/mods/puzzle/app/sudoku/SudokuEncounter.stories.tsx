import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SudokuPuzzle } from "./SudokuPuzzle"

// A sudoku in the frame it is met in, played by keys: arrows or WASD move the cursor and pick the square,
// a digit writes it, N or Shift switches to notes, Delete erases. On a game pad LB/RB walk a pick along the
// pad (drawn as the cursor on the key) and A presses it.
const meta = {
  title: "Puzzle/SudokuEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  render: () => (
    <EncounterModal tileset="junior">
      <SudokuPuzzle
        puzzle={generateSudoku(1, SUDOKU_CONFIG.junior)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
