import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { TapHint } from "./TapHint"
import { JourneyPathView } from "./JourneyPathView"

const meta = {
  component: TapHint,
  args: { show: true, children: null },
  decorators: [
    Story => (
      <div className="w-sm max-w-full bg-blue-100 p-4 text-black">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TapHint>

export default meta
type Story = StoryObj<typeof meta>

/** The travel screen's map card before any journey: the first place the hand points. */
const MapCard = ({ onClick }: { onClick: () => void }) => (
  <JourneyPathView
    label="Plan Expedition"
    inJourney={false}
    levelCount={5}
    levelNr={1}
    journeyLength="long"
    exterior="pyramid"
    onClick={onClick}
  />
)

export const OverItsTarget: Story = {
  render: args => (
    <TapHint show={args.show}>
      <MapCard onClick={() => {}} />
    </TapHint>
  ),
}

/** Tap the card: the hand goes, the way it does once the player has found the target. */
export const UntilTapped: Story = {
  render: function Render() {
    const [show, setShow] = useState(true)
    return (
      <TapHint show={show}>
        <MapCard onClick={() => setShow(false)} />
      </TapHint>
    )
  },
}
