import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { TapHint } from "./TapHint"

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

/** A plain made-up target: the hand sits over whatever it wraps. */
const MapCard = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="w-full rounded-xl bg-amber-100 p-4 font-bold">
    Plan Expedition
  </button>
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
