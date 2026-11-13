import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { STAR_BATTLE_CONFIG } from "@/mods/puzzle/game/starBattle/starBattleConfig"
import { generateStarBattle } from "@/mods/puzzle/game/starBattle/generateStarBattle"
import { StarBattlePuzzle } from "./StarBattlePuzzle"

// A star battle board in the frame it is met in, played by keys: arrows or WASD move the cursor, Enter or
// Space cycles the square (ruled out, star, empty), Z undoes, H asks for the hint, Escape leaves. The sweep
// stays a pointer gesture.
const meta = {
  title: "Puzzle/StarBattleEncounter",
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
      <StarBattlePuzzle
        puzzle={generateStarBattle(3, STAR_BATTLE_CONFIG.junior)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
