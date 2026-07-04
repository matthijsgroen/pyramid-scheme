import type { Meta, StoryObj } from "@storybook/react-vite"
import { InputBlock } from "./InputBlock"

const meta = {
  title: "UI/InputBlock",
  component: InputBlock,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "number",
    },
    selected: {
      control: "boolean",
    },
    shouldFocus: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    feedback: {
      control: "select",
      options: [undefined, "pending", "correct", "incorrect"],
    },
  },
} satisfies Meta<typeof InputBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onChange: value => console.log("Value changed:", value),
  },
}

export const WithValue: Story = {
  args: {
    value: 42,
    onChange: value => console.log("Value changed:", value),
  },
}

export const Selected: Story = {
  args: {
    value: 42,
    selected: true,
    onChange: value => console.log("Value changed:", value),
  },
}

export const Disabled: Story = {
  args: {
    value: 42,
    disabled: true,
    onChange: value => console.log("Value changed:", value),
  },
}

export const Empty: Story = {
  args: {
    selected: true,
    onChange: value => console.log("Value changed:", value),
  },
}

export const Interactive: Story = {
  args: {
    onChange: value => console.log("Value changed:", value),
    onSelect: () => console.log("Selected"),
    onBlur: () => console.log("Blurred"),
  },
}

// earlyFeedback pending state — shown from level start, glows to signal live feedback incoming
export const FeedbackPending: Story = {
  args: {
    feedback: "pending",
    onChange: value => console.log("Value changed:", value),
  },
}

// errorHighlight state — shown when a wrong value has been entered
export const ErrorHighlight: Story = {
  args: {
    value: 99,
    feedback: "incorrect",
    onChange: value => console.log("Value changed:", value),
  },
}

export const FeedbackCorrect: Story = {
  args: {
    value: 42,
    feedback: "correct",
    onChange: value => console.log("Value changed:", value),
  },
}
