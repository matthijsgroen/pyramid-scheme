import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
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
    canUndo: true,
    exhausted: new Set<number>(),
    disabled: false,
    onNumber: () => {},
    onErase: () => {},
    onTogglePencil: () => {},
    onUndo: () => {},
  },
} satisfies Meta<typeof FutoshikiPad>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Pencil on: the numbers go in as notes rather than as answers. */
export const Pencil: Story = { args: { pencil: true } }

/** No square is picked, so a number has nowhere to go and nothing can be erased. */
export const NothingPicked: Story = { args: { disabled: true, canUndo: false } }

/** 1 and 3 already fill a square in every row, so they are dimmed but still in place. */
export const NumbersSpent: Story = { args: { exhausted: new Set([1, 3]) } }

/** The pencil really toggling, so the two states can be compared without switching stories. */
export const Interactive: Story = {
  render: args => {
    const [pencil, setPencil] = useState(false)
    return <FutoshikiPad {...args} pencil={pencil} onTogglePencil={() => setPencil(current => !current)} />
  },
}
