import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import { generateConstellation } from "@/mods/puzzle/game/constellation/generateConstellation"
import { ConstellationPuzzle } from "./ConstellationPuzzle"

const meta = {
  title: "Puzzle/ConstellationEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const board = () => (
  <EncounterModal tileset="junior">
    <ConstellationPuzzle
      puzzle={generateConstellation(1, CONSTELLATION_CONFIG.junior)}
      difficulty="junior"
      onSolved={() => {}}
      onCancel={() => {}}
    />
  </EncounterModal>
)

/**
 * The board as a keyboard or pad player sees it: brackets (look B) on the cursor's star, starting on the first.
 * A direction jumps to the nearest star that way; N or Shift held (Y on a pad) turns a direction into a line
 * cycled that way, as a drag cycles it. Z undoes, H asks for the hint, Escape leaves.
 */
export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
}

/**
 * Alt held (Shift here): the brackets thicken and an arrow stands on each side of the star with a line a
 * direction would cycle.
 */
export const KeyboardAltHeld: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
  play: () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft", cancelable: true }))
  },
}
