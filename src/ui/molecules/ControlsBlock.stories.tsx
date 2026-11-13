import type { Meta, StoryObj } from "@storybook/react-vite"
import { arrows, key, pad } from "@/ui/atoms/glyphs"
import { ControlsBlock, type ControlLine } from "./ControlsBlock"

const lines: ControlLine[] = [
  [
    { keys: [key("Enter")], pad: [pad("a")], label: "take it" },
    { keys: [arrows], pad: [pad("dpad")], label: "slide" },
    { keys: [key("Enter"), key("Esc")], pad: [pad("a"), pad("b")], label: "let go" },
  ],
  [{ keys: [key("Shift"), "+", arrows], pad: [pad("y"), "+", pad("dpad")], label: "hold and point" }],
  [{ pad: [pad("lb"), pad("rb")], label: "a pad-only step" }],
]

const meta = {
  component: ControlsBlock,
  args: { lines },
  decorators: [
    Story => (
      <div className="max-w-sm rounded-lg bg-black/30 p-3 text-sm text-stone-400">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ControlsBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Keys: Story = { globals: { input: "keys" } }

export const Pad: Story = { globals: { input: "pad" } }

/** Touch draws nothing. */
export const Touch: Story = { globals: { input: "touch" } }
