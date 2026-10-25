import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyStops } from "./JourneyStops"

const meta = {
  component: JourneyStops,
  parameters: { layout: "centered" },
  args: {
    label: "Piramide",
    onStop: () => {},
    stops: [
      { n: 1, state: "done" },
      { n: 2, state: "done", dot: true, dotLabel: "Nog niet alles bekeken" },
      { n: 3, state: "ahead" },
      { n: 4, state: "buried" },
    ],
  },
  decorators: [
    Story => (
      <div className="w-[330px] bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JourneyStops>

export default meta
type Story = StoryObj<typeof meta>

export const Mixed: Story = {}
export const WithModSlot: Story = {
  render: args => (
    <JourneyStops {...args}>
      <p className="rounded-[10px] bg-[#E9DCBF] px-3 py-2 text-[13px]">Een kaartje van een mod</p>
    </JourneyStops>
  ),
}
