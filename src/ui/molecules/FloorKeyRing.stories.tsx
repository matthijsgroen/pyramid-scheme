import type { Meta, StoryObj } from "@storybook/react-vite"
import { FloorKeyRing } from "./FloorKeyRing"

const labels = {
  heldLabel: (color: string) => `${color} key — in hand`,
  neededLabel: (color: string) => `${color} door — still locked`,
}

const meta = {
  component: FloorKeyRing,
  args: labels,
  decorators: [
    Story => (
      <div className="bg-stone-950 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FloorKeyRing>

export default meta
type Story = StoryObj<typeof meta>

export const OneKeyHeld: Story = { args: { held: ["blue"], needed: [] } }
export const KeyHeldAndDoorsLeft: Story = { args: { held: ["blue", "green"], needed: ["red", "purple"] } }
export const NothingFoundYet: Story = { args: { held: [], needed: ["yellow"] } }
export const EmptyWithLabel: Story = { args: { held: [], needed: [], emptyLabel: "No keys on this floor" } }
export const EmptyRendersNothing: Story = { args: { held: [], needed: [] } }
