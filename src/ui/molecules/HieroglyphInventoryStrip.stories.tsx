import type { Meta, StoryObj } from "@storybook/react-vite"
import { HieroglyphInventoryStrip } from "./HieroglyphInventoryStrip"

const meta = {
  title: "UI/HieroglyphInventoryStrip",
  component: HieroglyphInventoryStrip,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1f2937" }] },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof HieroglyphInventoryStrip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: "Available symbols",
    onItemClick: (symbolId: string) => console.log("clicked", symbolId),
    items: [
      { symbolId: "d1", symbol: "𓇳", difficulty: "starter", owned: true, found: 2, required: 2 },
      { symbolId: "d2", symbol: "𓃥", difficulty: "junior", owned: false, found: 1, required: 2 },
      { symbolId: "d3", symbol: "𓅃", difficulty: "expert", owned: true, found: 3, required: 3 },
    ],
  },
}
