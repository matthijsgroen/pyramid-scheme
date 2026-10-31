import type { Meta, StoryObj } from "@storybook/react-vite"
import { NewChapterScreen } from "./NewChapterScreen"

const meta = {
  component: NewChapterScreen,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Er doemt een nieuwe piramide op",
    subtitle: "Nieuw hoofdstuk",
    body: "Expert-reizen zijn open. Hier liggen de eerste valstrikken — kom terug naar het kamp om op te knappen.",
    setOffLabel: "Op pad",
    onSetOff: () => {},
    closeLabel: "Later",
    onClose: () => {},
  },
  decorators: [
    Story => (
      <div className="h-screen bg-[#E9A45B]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NewChapterScreen>

export default meta
type Story = StoryObj<typeof meta>

export const WithJourney: Story = { args: { journeyName: "Vallei der Koningen", journeyNote: "Eerste expert-reis" } }
export const WithoutJourney: Story = {}
