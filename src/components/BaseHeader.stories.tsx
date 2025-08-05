import type { Meta, StoryObj } from "@storybook/react-vite"
import { BaseHeader } from "./BaseHeader"

const meta = {
  title: "Components/BaseHeader",
  component: BaseHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BaseHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InApp: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50">
      <BaseHeader />
      <div className="p-8">
        <h2 className="mb-4 text-2xl font-bold">App Content</h2>
        <p className="text-gray-600">
          This shows how the header looks in the context of the full
          application. Click the settings button to see the modal interaction.
        </p>
      </div>
    </div>
  ),
}
