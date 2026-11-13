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

// Three squares open (1 and 2 across the top, 4 below the 2): every 3 is placed, so LB/RB pass over it, and
// the 1 and the 2 run out as they go in. Solving it shows the board finishing without a cursor.
export const AlmostSolved: Story = {
  args: { tileset: "junior", children: null },
  render: () => (
    <EncounterModal tileset="junior">
      <SudokuPuzzle
        puzzle={{
          size: 4,
          boxWidth: 2,
          boxHeight: 2,
          givens: [
            [undefined, undefined, 3, 4],
            [3, undefined, 1, 2],
            [2, 1, 4, 3],
            [4, 3, 2, 1],
          ],
          solution: [
            [1, 2, 3, 4],
            [3, 4, 1, 2],
            [2, 1, 4, 3],
            [4, 3, 2, 1],
          ],
          techniqueCap: "nakedSingle",
        }}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
