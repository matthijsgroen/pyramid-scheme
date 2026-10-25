import type { Meta, StoryObj } from "@storybook/react-vite"
import { StructureRow } from "./StructureRow"

const labels = { progress: "2 van 4", built: "gebouwd", unknownPart: "???", toggle: "Onderdelen tonen" }
const art =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path d='M4 42 24 6l20 36z' fill='%23c9a15b'/></svg>"

const meta = {
  component: StructureRow,
  parameters: { layout: "centered" },
  args: { name: "Tent", artUrl: art, found: 2, total: 4, parts: [], open: false, onToggle: () => {}, labels },
  decorators: [
    Story => (
      <ul className="w-80">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof StructureRow>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}
export const Open: Story = {
  args: {
    open: true,
    parts: [{ name: "Tentstokken", iconUrl: art }, { name: "Geweven doek", iconUrl: art }, {}, {}],
  },
}
export const Complete: Story = {
  args: {
    found: 3,
    total: 3,
    open: true,
    parts: [{ name: "Palen", iconUrl: art }, { name: "Doek", iconUrl: art }, { name: "Haringen" }],
  },
}
export const WithoutArt: Story = { args: { artUrl: undefined } }
