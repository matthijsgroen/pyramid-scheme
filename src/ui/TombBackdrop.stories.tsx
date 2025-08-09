import type { Meta, StoryObj } from "@storybook/react-vite"
import { TombBackdrop } from "./TombBackdrop"

const meta = {
  title: "UI/TombBackdrop",
  component: TombBackdrop,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {},
} satisfies Meta<typeof TombBackdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
