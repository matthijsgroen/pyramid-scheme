import type { Meta, StoryObj } from "@storybook/react-vite"
import { FutoshikiPad } from "./FutoshikiPad"

const meta = {
  title: "Puzzle/FutoshikiPad",
  component: FutoshikiPad,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: {
    size: 5,
    pencil: false,
    exhausted: new Set<number>(),
    disabled: false,
    onNumber: () => {},
    onErase: () => {},
    onTogglePencil: () => {},
  },
} satisfies Meta<typeof FutoshikiPad>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Pencil on: the keys turn sky, which is the mode showing itself where it acts. */
export const Pencil: Story = { args: { pencil: true } }

/** No square is picked, so a number has nowhere to go. */
export const NothingPicked: Story = { args: { disabled: true } }

/** 1 and 3 already fill a square in every row, so they are dimmed but still in place. */
export const NumbersSpent: Story = { args: { exhausted: new Set([1, 3]) } }

/** Seven numbers wrap rather than shrink, split evenly so the last is not stranded alone. */
export const Wrapped: Story = { args: { size: 7 } }
