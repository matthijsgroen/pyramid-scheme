import type { Meta, StoryObj } from "@storybook/react-vite"
import { CollectibleSlot } from "./CollectibleSlot"

const meta = {
  component: CollectibleSlot,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CollectibleSlot>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { state: "empty" } }
export const Partial: Story = {
  args: { state: "partial", symbol: "𓂀", difficulty: "expert", progress: { found: 1, required: 3 } },
}
export const Collected: Story = { args: { state: "collected", symbol: "𓂀", difficulty: "master" } }
export const CollectedSelected: Story = {
  args: { state: "collected", symbol: "𓂀", difficulty: "wizard", selected: true },
}
// Stackable item (junk): the count badge shows how many are held.
export const CollectedWithCount: Story = {
  args: { state: "collected", symbol: "𓂀", difficulty: "junior", count: 7 },
}
