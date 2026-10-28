import type { Meta, StoryObj } from "@storybook/react-vite"
import { HaulRow } from "./HaulRow"
import { MapPieceIcon } from "./MapPieceIcon"

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
export const OversizedEmoji: Story = { args: { visual: <span className="text-6xl">🪙</span> } }
export const OversizedElement: Story = {
  args: { visual: <MapPieceIcon progress={{ found: 2, required: 4 }} />, title: "Kaartdeel", note: undefined },
}
export const WideElement: Story = {
  args: { visual: <span className="block h-12 w-32 rounded bg-[#2F5D7C]" />, title: "Brede tegel", note: undefined },
}
