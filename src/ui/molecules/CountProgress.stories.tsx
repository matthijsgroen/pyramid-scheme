import type { Meta, StoryObj } from "@storybook/react-vite"
import { CountProgress } from "./CountProgress"

const meta = {
  component: CountProgress,
  parameters: { layout: "centered" },
  args: { label: "61 van 252 stukjes", value: 61, max: 252 },
  decorators: [
    Story => (
      <div className="w-[330px] bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CountProgress>

export default meta
type Story = StoryObj<typeof meta>

export const WithNote: Story = { args: { label: "61 van 252 stukjes", note: "3 nieuw" } }
export const WithoutNote: Story = {}
export const Full: Story = { args: { label: "252 van 252 stukjes", value: 252 } }
