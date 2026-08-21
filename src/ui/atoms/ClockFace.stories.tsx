import type { Meta, StoryObj } from "@storybook/react-vite"
import { ClockFace, DigitalTime } from "./ClockFace"

const meta = {
  component: ClockFace,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: { time: 8 * 60 + 20, className: "w-48" },
} satisfies Meta<typeof ClockFace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnTheHour: Story = { args: { time: 3 * 60 } }

/** The reading a swapped pair of hands gives, side by side with the time itself. */
export const HandsSwapped: Story = {
  render: () => (
    <div className="flex gap-4">
      {[3 * 60 + 45, 9 * 60 + 15].map(time => (
        <div key={time} className="flex w-40 flex-col items-center gap-1">
          <ClockFace time={time} className="w-full" />
          <DigitalTime time={time} className="text-stone-300" />
        </div>
      ))}
    </div>
  ),
}

/** Every five minutes of one hour, which is where the minute hand has to be read and not recognised. */
export const RoundTheHour: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_unused, index) => 4 * 60 + index * 5).map(time => (
        <div key={time} className="flex w-24 flex-col items-center">
          <ClockFace time={time} className="w-full" />
          <DigitalTime time={time} className="text-xs text-stone-400" />
        </div>
      ))}
    </div>
  ),
}
