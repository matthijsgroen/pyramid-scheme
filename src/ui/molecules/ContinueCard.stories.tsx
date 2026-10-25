import type { Meta, StoryObj } from "@storybook/react-vite"
import { ContinueCard } from "./ContinueCard"

const meta = {
  component: ContinueCard,
  parameters: { layout: "centered" },
  args: {
    heading: "Verder met",
    setOffLabel: "Op pad",
    onSetOff: () => {},
  },
  decorators: [
    Story => (
      <div className="w-[358px] bg-[#F4EAD5] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContinueCard>

export default meta
type Story = StoryObj<typeof meta>

export const InProgress: Story = {
  args: { journeyName: "Vallei van de Ambachtslieden", detail: "Piramide 3 van 5 · Junior" },
}
export const Start: Story = { args: { journeyName: "Dageraad bij de Sfinx", detail: "Nieuw" } }
export const Empty: Story = { args: { emptyText: "Alles is gedaan. Kijk rond in het kamp." } }
export const WithHint: Story = {
  args: {
    journeyName: "Vallei van de Ambachtslieden",
    detail: "Piramide 3 van 5 · Junior",
    hint: { text: "2 oude reizen hebben iets nieuws te ontdekken", onOpen: () => {} },
  },
}
