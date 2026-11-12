import type { Meta, StoryObj } from "@storybook/react-vite"
import cardPng from "../../../docs/review/junior/save-card/starter-1L-card.png"
import { SaveCardPanel } from "./SaveCardPanel"

const meta = {
  component: SaveCardPanel,
  parameters: { layout: "centered" },
  args: {
    labels: {
      explain: "Take your expedition to another device: make a card here and read it there within 15 minutes.",
      make: "Make travel card",
      share: "Share card",
      download: "Download card",
      read: "Read travel card",
      cardAlt: "Pyramid Scheme",
    },
    busy: false,
    canShare: true,
    onMake: () => {},
    onShare: () => {},
    onRead: () => {},
  },
  decorators: [
    Story => (
      <div className="w-100 bg-white p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SaveCardPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}
export const Busy: Story = { args: { busy: true, status: "One moment…" } }
export const CardReady: Story = { args: { card: { url: cardPng, fileName: "reiskaart.png" } } }
export const ShareUnavailable: Story = {
  args: { card: { url: cardPng, fileName: "reiskaart.png" }, canShare: false },
}
export const Refused: Story = { args: { status: "This card has expired; make a new one." } }
