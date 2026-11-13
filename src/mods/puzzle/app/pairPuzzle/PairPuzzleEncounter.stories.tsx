import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { generatePairPuzzle } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import { PAIR_PUZZLE_CONFIG } from "@/mods/puzzle/game/pairPuzzle/pairPuzzleConfig"
import { PairPuzzle } from "./PairPuzzle"

// A pair puzzle in the frame it is met in, played by keys: arrows or WASD move the cursor, Enter or Space
// cycles the square (ruled out, piece, empty), Z undoes, H asks for the hint, Escape leaves.
const meta = {
  title: "Puzzle/PairPuzzleEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The sweep by keys: hold Shift or N (pad Y) and the arrows rule out every square the cursor crosses, anchors
 * passed over, drawn as it goes; letting go lands the run as one move, which one Z takes back.
 */
export const KeyboardSweep: Story = {
  args: { tileset: "junior", children: null },
  render: () => (
    <EncounterModal tileset="junior">
      <PairPuzzle
        puzzle={generatePairPuzzle(3, PAIR_PUZZLE_CONFIG.junior)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
