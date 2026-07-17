import type { Meta, StoryObj } from "@storybook/react-vite"
import { CategoryGrid } from "./CategoryGrid"
import { HieroglyphTile } from "./HieroglyphTile"

// Auto-fits tiles to the available width; `density` sets the gap. Widen/narrow the canvas to see
// the column count adapt.
const meta = {
  title: "UI/CategoryGrid",
  component: CategoryGrid,
  parameters: { layout: "fullscreen" },
  decorators: [Story => <div className="p-4">{<Story />}</div>],
  tags: ["autodocs"],
} satisfies Meta<typeof CategoryGrid>

export default meta
type Story = StoryObj<typeof meta>

const cells = Array.from({ length: 45 }, (_, i) => (
  <HieroglyphTile key={i} symbol="𓂀" difficulty="starter" className="aspect-square" />
))

export const Comfortable: Story = { args: { density: "comfortable", children: cells } }
export const Compact: Story = { args: { density: "compact", children: cells } }
