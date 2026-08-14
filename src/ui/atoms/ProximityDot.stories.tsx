import type { Meta, StoryObj } from "@storybook/react-vite"
import { ProximityDot } from "./ProximityDot"

const meta = {
  component: ProximityDot,
  decorators: [
    Story => (
      <div className="bg-stone-950 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProximityDot>

export default meta
type Story = StoryObj<typeof meta>

// Side by side is the only way to judge whether the three rates are actually tellable apart.
export const AllBands: Story = {
  args: { band: "near", label: "close by" },
  render: () => (
    <div className="flex items-center gap-8 text-xs text-stone-400">
      {(["pyramid", "floor", "near"] as const).map(band => (
        <span key={band} className="flex items-center gap-2">
          <ProximityDot band={band} label={band} />
          {band}
        </span>
      ))}
    </div>
  ),
}

export const NothingDetected: Story = { args: { band: "none", label: "nothing" } }
