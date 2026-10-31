import type { Meta, StoryObj } from "@storybook/react-vite"
import { TombDoor } from "./TombDoor"

const meta = {
  component: TombDoor,
  parameters: { layout: "centered" },
  argTypes: {
    wall: { control: "select", options: ["starter", "junior", "expert", "master", "wizard", "cave", "sphinx"] },
    open: { control: "boolean" },
  },
} satisfies Meta<typeof TombDoor>

export default meta
type Story = StoryObj<typeof meta>

const doorContent = <p className="mt-8 text-center font-bold text-white/80">Tomb Entrance</p>

export const Starter: Story = {
  args: { wall: "starter", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

export const Expert: Story = {
  args: { wall: "expert", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

export const Master: Story = {
  args: { wall: "master", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

export const Wizard: Story = {
  args: { wall: "wizard", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

export const Open: Story = {
  args: { wall: "starter", open: true, children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

export const Cave: Story = {
  args: { wall: "cave", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}

// No sphinx.webp until the panel is painted: the door shows the card colour.
export const Sphinx: Story = {
  args: { wall: "sphinx", children: doorContent },
  decorators: [
    Story => (
      <div className="size-48">
        <Story />
      </div>
    ),
  ],
}
