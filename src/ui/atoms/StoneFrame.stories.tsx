import type { Meta, StoryObj } from "@storybook/react-vite"
import { StoneFrame } from "./StoneFrame"

const meta = {
  component: StoneFrame,
  args: {
    children: <div className="size-40 bg-sky-900/60" />,
  },
} satisfies Meta<typeof StoneFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Wide: Story = { args: { children: <div className="h-24 w-72 bg-sky-900/60" /> } }
export const ThickerBorder: Story = { args: { className: "p-8" } }
