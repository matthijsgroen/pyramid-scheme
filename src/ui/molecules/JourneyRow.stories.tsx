import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyRow } from "./JourneyRow"
import { JourneyStops } from "./JourneyStops"

const meta = {
  component: JourneyRow,
  parameters: { layout: "centered" },
  args: { name: "Vallei van de Smeden", status: "open", exterior: "pyramid", currentLabel: "NU" },
  decorators: [
    Story => (
      <div className="w-[358px] bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JourneyRow>

export default meta
type Story = StoryObj<typeof meta>

export const Current: Story = { args: { status: "current", note: "Bezig · piramide 3 van 5" } }
export const Open: Story = { args: { note: "Nog niet begonnen" } }
export const Finished: Story = { args: { status: "finished", note: "Voltooid" } }
export const FinishedWithDot: Story = {
  args: { status: "finished", note: "Voltooid · 1 verborgen deur open", dot: true, dotLabel: "Er is iets nieuws" },
}
export const Tomb: Story = { args: { exterior: "tomb", note: "Graftombe" } }
export const WithMark: Story = { args: { status: "finished", note: "Voltooid", mark: "★ 3" } }
export const Locked: Story = {
  args: { status: "locked", exterior: "tomb", name: "Kluis van de Edelman", note: "Nog 1 kaartstuk nodig (2 van 3)" },
}
export const LockedWithSymbols: Story = {
  args: {
    status: "locked",
    name: "Volgende tier",
    needs: [
      {
        label: "Vind een van deze schatten",
        symbols: [
          { symbol: "𓂀", held: true },
          { symbol: "𓋹", held: false },
        ],
      },
    ],
  },
}
export const WithDetails: Story = {
  args: {
    status: "open",
    note: "Nog niet begonnen",
    details: [
      <p key="stones" className="text-[13px]">
        3 van 5 stenen getrokken
      </p>,
    ],
  },
}
export const Compact: Story = { args: { status: "current", note: "piramide 3 van 5", compact: true } }
export const StopsClosed: Story = {
  args: {
    status: "finished",
    note: "Voltooid",
    stops: { label: "Piramides tonen", open: false, onToggle: () => {} },
  },
}
export const StopsOpen: Story = {
  args: {
    status: "finished",
    note: "Voltooid",
    stops: { label: "Piramides verbergen", open: true, onToggle: () => {} },
    children: (
      <JourneyStops
        onStop={() => {}}
        stops={[
          { n: 1, label: "Piramide 1", state: "done" },
          { n: 2, label: "Piramide 2", state: "done", dot: true, dotLabel: "Nog niet alles bekeken" },
          { n: 3, label: "Piramide 3", state: "buried" },
        ]}
      />
    ),
  },
}
