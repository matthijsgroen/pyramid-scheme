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
      { symbolId: "d1", symbol: "𓇳", difficulty: "starter", availableCount: 2, maxNeeded: 3, canPlace: true },
      { symbolId: "d2", symbol: "𓃥", difficulty: "junior", availableCount: 0, maxNeeded: 2, canPlace: false },
      { symbolId: "d3", symbol: "𓅃", difficulty: "expert", availableCount: 1, maxNeeded: 1, canPlace: true },
    ],
  },
}
