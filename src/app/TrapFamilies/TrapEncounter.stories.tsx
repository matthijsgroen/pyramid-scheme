import type { Meta, StoryObj } from "@storybook/react-vite"
import { TrapEncounter } from "./TrapEncounter"

const meta = {
  title: "TrapFamilies/TrapEncounter",
  component: TrapEncounter,
  parameters: { layout: "fullscreen" },
  args: {
    family: "arithmetic-reflex",
    seed: 42,
    trapInsightStacks: 0,
    onPass: () => {},
    onFail: () => {},
  },
} satisfies Meta<typeof TrapEncounter>

export default meta
type Story = StoryObj<typeof meta>

export const Expert: Story = { args: { difficulty: "expert" } }
export const Master: Story = { args: { difficulty: "master" } }
export const Wizard: Story = { args: { difficulty: "wizard" } }
export const WizardWithInsight: Story = { args: { difficulty: "wizard", trapInsightStacks: 2 } }
