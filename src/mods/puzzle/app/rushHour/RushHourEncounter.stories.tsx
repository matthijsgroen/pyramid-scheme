import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { RUSH_HOUR_CONFIG } from "@/mods/puzzle/game/rushHour/rushHourConfig"
import { generateRushHour } from "@/mods/puzzle/game/rushHour/generateRushHour"
import { RushHourPuzzle } from "./RushHourPuzzle"

const meta = {
  title: "Puzzle/RushHourEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const press = (code: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
  window.dispatchEvent(new KeyboardEvent("keyup", { code }))
}

const board = () => (
  <EncounterModal tileset="junior">
    <RushHourPuzzle
      puzzle={generateRushHour(1, RUSH_HOUR_CONFIG.junior)}
      difficulty="junior"
      onSolved={() => {}}
      onCancel={() => {}}
    />
  </EncounterModal>
)

/**
 * The board as a keyboard or pad player sees it: brackets (look B) on the piece the cursor is on, starting on the
 * player's sledge. Arrows or WASD jump to the nearest piece that way, Enter or Space takes it in hand, Z undoes a
 * move, H asks for the hint, Escape leaves.
 */
export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
}

/**
 * A piece held: thicker, lighter brackets with a stronger glow, the piece lifted under them, and an arrow at each
 * end it can still move to. Arrows along its lane shove it a cell a press; Enter, Space or Escape let it go, and
 * the whole shove is one move.
 */
export const KeyboardHeld: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
  play: () => press("Enter"),
}
