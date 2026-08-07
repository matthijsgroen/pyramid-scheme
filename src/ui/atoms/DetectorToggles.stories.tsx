import type { Meta, StoryObj } from "@storybook/react-vite"
import { DetectorToggles } from "./DetectorToggles"

const meta = {
  component: DetectorToggles,
  args: {
    activeDetector: null,
    compassLevel: 0,
    consumableDetectorLevel: 0,
    detectionLevel: 0,
    titles: { compass: "Compass", consumable: "Consumable detector", hiddenPassageway: "Hidden passageways" },
    onSetDetector: () => {},
  },
} satisfies Meta<typeof DetectorToggles>

export default meta
type Story = StoryObj<typeof meta>

// Nothing unlocked → nothing rendered, so the HUD row keeps no gap for it.
export const NoPerks: Story = {}

export const CompassOnly: Story = {
  args: { compassLevel: 1 },
}

export const AllThree: Story = {
  args: { compassLevel: 1, consumableDetectorLevel: 1, detectionLevel: 1 },
}

// The active mode is highlighted, and tapping it again switches back off.
export const CompassActive: Story = {
  args: { compassLevel: 1, consumableDetectorLevel: 1, detectionLevel: 1, activeDetector: "compass" },
}
