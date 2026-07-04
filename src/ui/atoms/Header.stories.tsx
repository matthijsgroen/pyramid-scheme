import type { Meta, StoryObj } from "@storybook/react-vite"
import { Header } from "./Header"

const meta = {
  title: "UI/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <>
        <div className="text-lg font-bold text-amber-900">Title</div>
        <div className="text-sm text-amber-700">Action</div>
      </>
    ),
  },
}
