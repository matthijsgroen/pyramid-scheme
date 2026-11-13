import type { Meta, StoryObj } from "@storybook/react-vite"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { HIDATO_CONFIG } from "@/mods/puzzle/game/hidato/hidatoConfig"
import { generateHidato } from "@/mods/puzzle/game/hidato/generateHidato"
import { hexagon } from "@/mods/puzzle/game/hidato/hex"
import { HidatoBoard } from "./HidatoBoard"
import { HidatoPuzzle } from "./HidatoPuzzle"
import { skinFor } from "./skins"

const meta = {
  title: "Puzzle/HidatoEncounter",
  component: EncounterModal,
  parameters: { layout: "fullscreen" },
  globals: { input: "keys" },
} satisfies Meta<typeof EncounterModal>

export default meta
type Story = StoryObj<typeof meta>

const press = (code: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, cancelable: true }))
  window.dispatchEvent(new KeyboardEvent("keyup", { code }))
}

const board = () => (
  <EncounterModal tileset="junior">
    <HidatoPuzzle
      puzzle={generateHidato(2, HIDATO_CONFIG.junior)}
      difficulty="junior"
      onSolved={() => {}}
      onCancel={() => {}}
    />
  </EncounterModal>
)

/**
 * The comb as a keyboard or pad player sees it: the cell under the cursor lifted (look C), starting on the 1.
 * Arrows or WASD move it to a neighbour: left and right beside it, up and down to the upper-left and lower-left;
 * Shift (pad: Y) held, or E and X, bend up and down to the right. Enter or Space picks the run up on a number,
 * Z undoes, H asks for the hint, Escape leaves.
 */
export const KeyboardCursor: Story = {
  args: { tileset: "junior", children: null },
  render: board,
}

/**
 * The run picked up: a thicker, paler rim over the pen's ring. A direction now carries the run into that
 * neighbour, and the cursor stays on its head. Enter on the head takes it back off; Escape puts the run down.
 */
export const KeyboardRunPickedUp: Story = {
  args: { tileset: "junior", children: null },
  render: board,
  play: () => press("Enter"),
}

const comb = hexagon(2)

/**
 * Which key reaches which of the six neighbours, written on them: the keyboard on top, the pad below (✚ is the
 * D-pad, Y held bends it right). Arrows move the cursor and the labels go with it.
 */
const guided = (start: string) => () => (
  <EncounterModal tileset="junior">
    <HidatoBoard
      puzzle={{ cells: comb, givens: { [start]: 1 } }}
      skin={skinFor(undefined, undefined)}
      values={{ [start]: 1 }}
      onPickUp={() => {}}
      onTap={() => {}}
      onDrag={() => {}}
      boardInput={handler => handler}
      guide
    />
  </EncounterModal>
)

export const NeighbourKeys: Story = {
  args: { tileset: "junior", children: null },
  render: guided("0,0"),
}

/**
 * The cursor on the comb's left corner, where the upper-left and lower-left cells are off the board: ↑ and ↓
 * fall back to the right, so those cells carry both their own keys and the plain ones.
 */
export const NeighbourKeysAtEdge: Story = {
  args: { tileset: "junior", children: null },
  render: guided("-2,0"),
}
