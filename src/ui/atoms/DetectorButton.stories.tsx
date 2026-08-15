import type { Meta, StoryObj } from "@storybook/react-vite"
import { DetectorButton } from "./DetectorButton"

const meta = {
  component: DetectorButton,
  args: { title: "Detector", onToggle: () => {} },
  decorators: [
    Story => (
      <div className="bg-stone-950 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DetectorButton>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = { args: { activeDetector: null, readoutOpen: false } }

// The readout open, so the button reads as pressed and wears the running mode's icon.
export const ReadoutOpen: Story = { args: { activeDetector: "hiddenPassageway", readoutOpen: true } }

// The case this feature exists for: a detector still reading with its readout shut, the dot carrying
// the reading. Pulse rate is the distance — slow in the pyramid, quicker on the floor, fast up close.
export const RunningPyramid: Story = {
  args: { activeDetector: "hiddenPassageway", readoutOpen: false, band: "pyramid", bandLabel: "in this pyramid" },
}
export const RunningFloor: Story = {
  args: { activeDetector: "hiddenPassageway", readoutOpen: false, band: "floor", bandLabel: "on this floor" },
}
export const RunningNear: Story = {
  args: { activeDetector: "hiddenPassageway", readoutOpen: false, band: "near", bandLabel: "close by" },
}
export const RunningCompassNear: Story = {
  args: { activeDetector: "compass", readoutOpen: false, band: "near", bandLabel: "close by" },
}

// All three rates side by side, to compare how distinguishable they are.
export const AllRates: Story = {
  args: { activeDetector: "hiddenPassageway", readoutOpen: false },
  render: () => (
    <div className="flex items-center gap-6">
      {(["pyramid", "floor", "near"] as const).map(band => (
        <DetectorButton
          key={band}
          activeDetector="hiddenPassageway"
          readoutOpen={false}
          title="Detector"
          band={band}
          bandLabel={band}
          onToggle={() => {}}
        />
      ))}
    </div>
  ),
}
