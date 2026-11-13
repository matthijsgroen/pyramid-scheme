import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

// A star battle board in the frame it is met in, played by keys: arrows or WASD move the cursor, Enter or
// Space cycles the square (ruled out, star, empty), Z undoes, H asks for the hint, Escape leaves.
const meta = {
  title: "Puzzle/StarBattleEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const board = () => (
  <EncounterModal tileset="junior">
    <StarBattlePuzzle
      puzzle={generateStarBattle(3, STAR_BATTLE_CONFIG.junior)}
      difficulty="junior"
      onSolved={() => {}}
      onCancel={() => {}}
    />
  </EncounterModal>
)

export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  render: board,
}

/**
 * The sweep by keys: hold Shift or N (pad Y) and the arrows rule out every square the cursor crosses, drawn as
 * it goes; letting go lands the run as one move, which one Z takes back.
 */
export const KeyboardSweep: Story = {
  args: { tileset: "junior", children: null },
  render: board,
}
