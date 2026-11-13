import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { PROCESSION_CONFIG } from "@/mods/puzzle/game/procession/processionConfig"
import { generateProcession } from "@/mods/puzzle/game/procession/generateProcession"
import { ProcessionPuzzle } from "./ProcessionPuzzle"

const meta = {
  title: "Puzzle/ProcessionEncounter",
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
    <ProcessionPuzzle
      puzzle={generateProcession(1, PROCESSION_CONFIG.junior)}
      difficulty="junior"
      onSolved={() => {}}
      onCancel={() => {}}
    />
  </EncounterModal>
)

/**
 * The board as a keyboard or pad player sees it: brackets (look B) on the bar of the cursor's row, starting on the
 * first row. Up and down change the row, left and right slide its bar one hour a press, H asks for the hint,
 * Escape leaves.
 */
export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
}

/**
 * A mark picked by keys: `]` or PageDown (RB on a pad) walks the marks under the board and `[` or PageUp (LB) walks
 * back, each picked as a tap picks it, ringing the rows it is about.
 */
export const KeyboardMarkPicked: Story = {
  args: { tileset: "junior", children: null },
  globals: { input: "keys" },
  render: board,
  play: () => press("BracketRight"),
}
