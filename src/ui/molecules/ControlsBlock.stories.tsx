import type { Meta, StoryObj } from "@storybook/react-vite"
import { arrows, key, pad } from "@/ui/atoms/glyphs"
import { ControlsBlock, type ControlStep } from "./ControlsBlock"

const steps: ControlStep[] = [
  { keys: [key("Enter")], pad: [pad("a")], label: "take it" },
  { keys: [arrows], pad: [pad("dpad")], label: "slide" },
  { keys: [key("Enter"), key("Esc")], pad: [pad("a"), pad("b")], label: "let go" },
  { keys: [key("Shift"), "+", arrows], pad: [pad("y"), "+", pad("dpad")], label: "hold and point" },
  { keys: [key("1–6")], label: "a keys-only step" },
  { pad: [pad("lb"), pad("rb")], label: "a pad-only step" },
]

const meta = {
  component: ControlsBlock,
  args: { heading: "Controls", input: "keys", brand: "xbox", steps },
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

export const Keys: Story = {}

export const PadXbox: Story = { args: { input: "pad", brand: "xbox" } }

export const PadPlayStation: Story = { args: { input: "pad", brand: "playstation" } }

/** Touch draws nothing. */
export const Touch: Story = { args: { input: "touch" } }
