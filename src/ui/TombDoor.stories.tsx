import type { Meta, StoryObj } from "@storybook/react-vite"
import { TombDoor } from "./TombDoor"

const meta = {
  title: "UI/TombDoor",
  component: TombDoor,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    difficulty: { control: "select", options: ["starter", "junior", "expert", "master", "wizard"] },
    open: { control: "boolean" },
  },
} satisfies Meta<typeof TombDoor>

export default meta
type Story = StoryObj<typeof meta>

const doorContent = <p className="mt-8 text-center font-bold text-white/80">Tomb Entrance</p>

export const Starter: Story = {
  args: { difficulty: "starter", children: doorContent },
  decorators: [Story => <div className="h-48 w-48"><Story /></div>],
}

export const Expert: Story = {
  args: { difficulty: "expert", children: doorContent },
  decorators: [Story => <div className="h-48 w-48"><Story /></div>],
}

export const Master: Story = {
  args: { difficulty: "master", children: doorContent },
  decorators: [Story => <div className="h-48 w-48"><Story /></div>],
}

export const Wizard: Story = {
  args: { difficulty: "wizard", children: doorContent },
  decorators: [Story => <div className="h-48 w-48"><Story /></div>],
}

export const Open: Story = {
  args: { difficulty: "starter", open: true, children: doorContent },
  decorators: [Story => <div className="h-48 w-48"><Story /></div>],
}
