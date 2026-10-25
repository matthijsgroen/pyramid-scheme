import type { Meta, StoryObj } from "@storybook/react-vite"
import { HaulRow } from "./HaulRow"

const meta = {
  component: HaulRow,
  parameters: { layout: "centered" },
  args: {
    visual: <span className="size-full bg-[#E0A526]" />,
    title: "+85 munten",
    note: "Losse munten onderweg",
  },
  decorators: [
    Story => (
      <div className="w-80 bg-[#27304A] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HaulRow>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}
export const New: Story = { args: { title: "Bronzen waterkruik", note: "Nieuw in je kamp", badge: "NIEUW" } }
