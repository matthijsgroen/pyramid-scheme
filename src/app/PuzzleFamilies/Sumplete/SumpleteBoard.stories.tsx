import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { generateSumplete } from "../../../game/generateSumplete"
import { SumpleteBoard } from "./SumpleteBoard"

const meta = {
  title: "App/PuzzleFamilies/Sumplete/SumpleteBoard",
  component: SumpleteBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
} satisfies Meta<typeof SumpleteBoard>

export default meta
type Story = StoryObj<typeof meta>

const p3 = generateSumplete(3, 1)
const p4 = generateSumplete(4, 7)

export const Unsolved3x3: Story = {
  args: { ...p3, onSolved: () => {} },
}

export const Unsolved4x4: Story = {
  args: { ...p4, onSolved: () => {} },
}

export const Interactive3x3: Story = {
  args: { ...p3, onSolved: () => {} },
  render: () => {
    const [solved, setSolved] = useState(false)
    return (
      <div className="flex flex-col items-center gap-3">
        <SumpleteBoard {...p3} onSolved={() => setSolved(true)} />
        {solved && <p className="text-sm text-green-400">onSolved fired!</p>}
      </div>
    )
  },
}
