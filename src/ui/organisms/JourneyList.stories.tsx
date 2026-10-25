import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyList } from "./JourneyList"
import { JourneyRow } from "@/ui/molecules/JourneyRow"
import { TierHeader } from "@/ui/molecules/TierHeader"

const noop = () => {}

const groups = [
  {
    key: "junior",
    open: true,
    header: <TierHeader title="Junior" progress="1 van 5 klaar" />,
    rows: [
      <JourneyRow
        key="1"
        name="Vallei van de Ambachtslieden"
        note="Bezig · piramide 3 van 5"
        status="current"
        exterior="pyramid"
        currentLabel="NU"
        onOpen={noop}
      />,
      <JourneyRow
        key="2"
        name="Heilige Ibis Migratie"
        note="Voltooid · 1 verborgen deur open"
        status="finished"
        exterior="pyramid"
        currentLabel="NU"
        dot
        dotLabel="Er is iets nieuws"
        onOpen={noop}
      />,
      <JourneyRow
        key="3"
        name="Edelman's Verborgen Kluis"
        note="Nog 1 kaartstuk nodig (2 van 3)"
        status="locked"
        exterior="tomb"
        currentLabel="NU"
      />,
    ],
  },
  {
    key: "beginner",
    open: false,
    header: (
      <TierHeader
        title="Beginner"
        progress="5 van 5 klaar"
        collapsible={{ open: false, onToggle: noop, label: "Tier tonen" }}
        dot
        dotLabel="Er is iets nieuws"
      />
    ),
    rows: [],
  },
]

const footer = (
  <p className="rounded-[10px] bg-[#E9DCBF] px-3 py-2.5 text-[13px] text-[#4A3B2A]">De volgende tier komt eraan.</p>
)

const meta = {
  component: JourneyList,
  parameters: { layout: "centered" },
  args: { groups, footer },
} satisfies Meta<typeof JourneyList>

export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = {
  decorators: [
    Story => (
      <div className="h-150 w-[358px] overflow-auto bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
}
export const InPanel: Story = {
  decorators: [
    Story => (
      <div className="h-150 w-110 overflow-auto bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
}
export const Empty: Story = { args: { groups: [], footer: undefined, emptyText: "Nog geen reizen." } }
