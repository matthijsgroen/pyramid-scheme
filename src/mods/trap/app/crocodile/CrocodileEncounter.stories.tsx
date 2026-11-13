import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { CROCODILE_CONFIG } from "@/mods/trap/game/crocodile/crocodileConfig"
import { generateCrossing } from "@/mods/trap/game/crocodile/generateCrossing"
import { CrocodilePit } from "./CrocodilePit"

// A crocodile crossing in the frame it is met in, played by keys: left and right move the cursor along the
// row on offer, Enter or Space steps onto that stone, H asks for the hint, Escape leaves.
const meta = {
  title: "Trap/CrocodileEncounter",
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
      <CrocodilePit
        puzzle={generateCrossing(1, CROCODILE_CONFIG.junior)}
        difficulty="junior"
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  ),
}

/** Played by pad: the same cursor, with the pad's buttons under the rules. */
export const PadCursor: Story = { ...KeyboardCursor, globals: { input: "pad", pad: "xbox" } }
