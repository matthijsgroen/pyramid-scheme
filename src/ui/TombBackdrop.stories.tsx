import type { Meta, StoryObj } from "@storybook/react-vite"
import { TombBackdrop } from "./TombBackdrop"

const meta = {
  title: "UI/TombBackdrop",
  component: TombBackdrop,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    difficulty: {
      options: ["starter", "junior", "expert", "master", "wizard"],
      control: {
        type: "select",
      },
    },
    scale: {
      options: ["large", "small"],
      control: {
        type: "radio",
      },
    },
    zoom: {
      control: {
        type: "boolean",
      },
    },
    fade: {
      control: {
        type: "boolean",
      },
    },
  },
  args: {
    className: "w-full h-screen",
  },
} satisfies Meta<typeof TombBackdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Starter: Story = {
  args: {
    difficulty: "starter",
  },
}

export const Junior: Story = {
  args: {
    difficulty: "junior",
  },
}

export const Expert: Story = {
  args: {
    difficulty: "expert",
  },
}

export const Master: Story = {
  args: {
    difficulty: "master",
  },
}

export const Wizard: Story = {
  args: {
    difficulty: "wizard",
  },
}
