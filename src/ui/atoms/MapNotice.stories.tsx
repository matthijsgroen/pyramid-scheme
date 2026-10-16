import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapNotice } from "./MapNotice"

const meta = {
  component: MapNotice,
  parameters: { layout: "centered" },
  decorators: [
    Story => (
      <div className="flex h-32 w-72 items-center justify-center bg-stone-800">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapNotice>

export default meta
type Story = StoryObj<typeof meta>

export const CannotPass: Story = { args: { label: "Cannot pass with a stone" } }

export const CannotPassDutch: Story = { args: { label: "Niet te passeren met een steen" } }
