import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { CANISTERS_CONFIG } from "@/mods/puzzle/game/canisters/canistersConfig"
import { generateCanisters } from "@/mods/puzzle/game/canisters/generateCanisters"
import { CanistersPuzzle } from "./CanistersPuzzle"

const meta = {
  title: "Puzzle/CanistersEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The board as a keyboard or pad player sees it: the focus is the cursor (look C, the lifted canister) and
 * starts on the first canister. Arrows or WASD walk the canisters and their claims, Enter or Space picks one
 * up and a second Enter pours it, Z undoes a pour, H asks for the hint, Escape leaves. A held canister wears
 * its own outline, as it does for touch.
 */
export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: () => (
    <EncounterModal tileset="junior">
      <CanistersPuzzle
        puzzle={generateCanisters(1, CANISTERS_CONFIG.junior)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}
