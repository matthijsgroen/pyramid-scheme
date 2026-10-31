import type { Meta, StoryObj } from "@storybook/react-vite"
import { NewBadge } from "./NewBadge"

const meta = {
  component: NewBadge,
  parameters: { layout: "centered" },
  args: { label: "NIEUW" },
} satisfies Meta<typeof NewBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
