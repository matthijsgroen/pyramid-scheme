import type { Meta, StoryObj } from "@storybook/react-vite"
import { NoticeDot } from "./NoticeDot"

const meta = {
  component: NoticeDot,
  parameters: { layout: "centered" },
  args: { label: "Iets nieuws" },
} satisfies Meta<typeof NoticeDot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Decorative: Story = { args: { label: undefined } }
