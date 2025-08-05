import type { Meta, StoryObj } from "@storybook/react-vite"
import { Block } from "./Block"

const meta = {
  title: "UI/Block",
  component: Block,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    selected: {
      control: "boolean",
    },
    className: {
      control: "text",
    },
  },
} satisfies Meta<typeof Block>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "42",
  },
}

export const Selected: Story = {
  args: {
    children: "42",
    selected: true,
  },
}

export const WithCustomClass: Story = {
  args: {
    children: "100",
    className: "bg-yellow-200 border-yellow-500",
  },
}

export const Empty: Story = {
  args: {
    children: "",
  },
}

export const LongText: Story = {
  args: {
    children: "1000",
  },
}
