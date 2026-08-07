import type { Meta, StoryObj } from "@storybook/react-vite"
import { TombLockPanel } from "./TombLockPanel"

const meta = {
  component: TombLockPanel,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1f2937" }] },
  },
  argTypes: {
    difficulty: {
      control: "select",
      options: ["starter", "junior", "expert", "master", "wizard"],
    },
    lockState: {
      control: "select",
      options: ["empty", "error", "open"],
    },
  },
} satisfies Meta<typeof TombLockPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    difficulty: "junior",
    lockState: "empty",
    value: "",
    placeholder: "????",
    onChange: () => {},
    onSubmit: () => {},
  },
}

export const Error: Story = {
  args: {
    difficulty: "junior",
    lockState: "error",
    value: "12",
    placeholder: "????",
    onChange: () => {},
    onSubmit: () => {},
  },
}
