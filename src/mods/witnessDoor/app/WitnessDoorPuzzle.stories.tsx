import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateWitnessDoor } from "../game/generateWitnessDoor"
import { WitnessDoorPuzzle } from "./WitnessDoorPuzzle"

const meta = {
  title: "WitnessDoor/WitnessDoorPuzzle",
  component: WitnessDoorPuzzle,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: { site: "junior_2#3#2", onSolved: () => {}, onCancel: () => {}, onMint: () => {} },
} satisfies Meta<typeof WitnessDoorPuzzle>

export default meta
type Story = StoryObj<typeof meta>

/** The smallest board the family ships: one fork, two shrines, five mirrors. */
export const Starter: Story = { args: { board: generateWitnessDoor(1, "starter") } }

/** How every board opens — dark, and dark still after any one mirror is turned. */
export const Junior: Story = { args: { board: generateWitnessDoor(1, "junior") } }

/** The widest board, where a cell is at its smallest and the tap targets reach furthest past it. */
export const Wizard: Story = { args: { board: generateWitnessDoor(3, "wizard") } }
