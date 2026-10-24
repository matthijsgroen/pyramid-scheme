import type { Meta, StoryObj } from "@storybook/react-vite"
import { CaveBackdrop, CaveMouth } from "./CaveBackdrop"
import { DesertBackdrop } from "./DesertBackdrop"

const meta = {
  component: CaveMouth,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CaveMouth>

export default meta
type Story = StoryObj<typeof meta>

/** The tomb's way in: the hill stands on the desert where a pyramid's board would. */
export const Mouth: Story = {
  render: () => (
    <div className="h-screen">
      <DesertBackdrop levelNr={1} start="morning" timeStepSize={1}>
        <div className="flex flex-1 items-center justify-center">
          <CaveMouth />
        </div>
      </DesertBackdrop>
    </div>
  ),
}

export const Cavern: Story = {
  render: () => (
    <div className="h-screen">
      <CaveBackdrop />
    </div>
  ),
}
