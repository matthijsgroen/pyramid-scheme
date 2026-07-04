import type { Meta, StoryObj } from "@storybook/react-vite"
import { Badge } from "./Badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const WithCount: Story = {
  args: {
    count: 3,
    children: <div className="rounded bg-stone-800 p-4 text-white">Item</div>,
  },
}

export const WithLabel: Story = {
  args: {
    label: "New",
    children: <div className="rounded bg-stone-800 p-4 text-white">Item</div>,
  },
}

export const ZeroCount: Story = {
  args: {
    count: 0,
    children: <div className="rounded bg-stone-800 p-4 text-white">Item</div>,
  },
}

export const NoBadge: Story = {
  args: {
    children: <div className="rounded bg-stone-800 p-4 text-white">Item</div>,
  },
}
