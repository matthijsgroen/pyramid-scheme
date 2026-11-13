import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { FUTOSHIKI_CONFIG } from "@/mods/puzzle/game/futoshiki/futoshikiConfig"
import { generateFutoshiki } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FutoshikiPuzzle } from "./FutoshikiPuzzle"

// A futoshiki in the frame it is met in, played by keys: arrows or WASD move the cursor and pick the
// square, a digit writes it, N or Shift switches to notes, Delete erases. On a game pad LB/RB walk a pick
// along the pad (drawn as the cursor on the key) and A presses it.
const meta = {
  title: "Puzzle/FutoshikiEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const { size, ...options } = FUTOSHIKI_CONFIG.junior

export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  render: () => (
    <EncounterModal tileset="junior">
      <FutoshikiPuzzle
        puzzle={generateFutoshiki(size, 1, options)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
