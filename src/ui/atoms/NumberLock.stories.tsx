import type { Meta, StoryObj } from "@storybook/react-vite"
import { NumberLock } from "./NumberLock"

const meta = {
  component: NumberLock,
  parameters: { layout: "centered" },
  argTypes: {
    state: { control: "select", options: ["empty", "error", "open"] },
    variant: { control: "select", options: ["vibrant", "muted"] },
    onChange: { action: "changed" },
    onSubmit: { action: "submitted" },
  },
} satisfies Meta<typeof NumberLock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    state: "empty",
    variant: "vibrant",
    value: "",
    placeholder: "Enter code",
  },
}

export const WithValue: Story = {
  args: {
    state: "empty",
    variant: "vibrant",
    value: "42",
  },
}

export const Error: Story = {
  args: {
    state: "error",
    variant: "vibrant",
    value: "9999",
  },
}

export const Open: Story = {
  args: {
    state: "open",
    variant: "vibrant",
    value: "1234",
  },
}

export const Muted: Story = {
  args: {
    state: "empty",
    variant: "muted",
    value: "",
  },
}

export const MutedError: Story = {
  args: {
    state: "error",
    variant: "muted",
    value: "0000",
  },
}
