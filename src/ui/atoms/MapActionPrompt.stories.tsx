import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapActionPrompt } from "./MapActionPrompt"
import { KeyGlyph } from "./KeyGlyph"
import { key, pad } from "./glyphs"

const meta = {
  component: MapActionPrompt,
  parameters: { layout: "centered" },
  decorators: [
    Story => (
      <div className="flex h-32 w-64 items-center justify-center bg-stone-800">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapActionPrompt>

export default meta
type Story = StoryObj<typeof meta>

export const TakeTheStairs: Story = {
  args: { label: "Take the stairs", onClick: () => {} },
}

export const LeaveThisPlace: Story = {
  args: { label: "Leave this place", onClick: () => {} },
}

/** With keys: the Enter keycap that takes the prompt, beside its words. */
export const WithKey: Story = {
  args: { label: "Take the stairs", onClick: () => {}, glyph: <KeyGlyph glyph={key("Enter")} size="sm" /> },
}

/** With a PlayStation pad: the cross that takes the prompt. */
export const WithPadButton: Story = {
  args: {
    label: "Take the stairs",
    onClick: () => {},
    glyph: <KeyGlyph glyph={pad("a")} brand="playstation" size="sm" />,
  },
}
