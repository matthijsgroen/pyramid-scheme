import type { Meta, StoryObj } from "@storybook/react-vite"
import { CaveBackdrop } from "./CaveBackdrop"

const meta = {
  component: CaveBackdrop,
  parameters: { layout: "fullscreen" },
  args: { variant: "mouth" },
  argTypes: { variant: { control: "select", options: ["mouth", "cavern"] } },
  render: args => (
    <div className="h-screen">
      <CaveBackdrop {...args} />
    </div>
  ),
} satisfies Meta<typeof CaveBackdrop>

export default meta
type Story = StoryObj<typeof meta>

// Neither painting exists yet, so both stories show the CSS scene; each renders the art as soon as its
// PNG is in src/assets/exteriors.
export const Mouth: Story = {}

export const Cavern: Story = { args: { variant: "cavern" } }
