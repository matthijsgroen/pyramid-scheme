import type { Meta, StoryObj } from "@storybook/react-vite"
import { CreditsList } from "./CreditsList"

const meta = {
  component: CreditsList,
  args: {
    heading: "Sounds",
    empty: "No sounds are credited yet.",
    sourceLabel: "Source",
    licenceLabel: "Licence",
    credits: [
      {
        file: "music-made-up",
        title: "A Made-up Tune",
        author: "Somebody",
        source: "https://example.com/tune",
        licence: "Some Licence",
        licenceUrl: "https://example.com/licence",
      },
    ],
  },
  decorators: [
    Story => (
      <div className="max-w-md bg-white p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreditsList>

export default meta
type Story = StoryObj<typeof meta>

export const OneTrack: Story = {}

export const Nothing: Story = {
  args: { credits: [] },
}
