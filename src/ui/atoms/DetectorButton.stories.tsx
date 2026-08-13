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

export const Closed: Story = { args: { activeDetector: null } }

// Open, the button wears the running mode's icon — the row still says which detector is reading
// without the panel having to be open.
export const OpenOnCorridor: Story = { args: { activeDetector: "hiddenPassageway" } }
export const OpenOnCompass: Story = { args: { activeDetector: "compass" } }
export const OpenOnSupplies: Story = { args: { activeDetector: "consumable" } }
