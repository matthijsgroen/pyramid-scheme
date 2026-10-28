import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyRow } from "./JourneyRow"
import { JourneyStops } from "./JourneyStops"

const meta = {
  component: JourneyRow,
  parameters: { layout: "centered" },
  args: { name: "Vallei van de Smeden", status: "open", exterior: "pyramid", currentLabel: "NU" },
  decorators: [
    Story => (
      <div className="w-[358px] bg-camp-paper p-3.5">
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
        label: "Vind deze schat",
        symbols: [{ symbol: "𓋹", held: false }],
      },
    ],
  },
}
export const LockedTierWithHint: Story = {
  args: {
    status: "locked",
    name: "Expert-reizen",
    needs: [
      { label: "Vind deze schat", symbols: [{ symbol: "𓋹", held: true }] },
      { label: "Je hebt een ezel nodig", hint: "Fez verkoopt er een in de Graftombe van Ra" },
    ],
  },
}
export const LockedTombWithNeed: Story = {
  args: {
    status: "locked",
    exterior: "tomb",
    name: "Kluis van de Edelman",
    needs: [{ label: "Je hebt een kar nodig", hint: "Fez verkoopt er een in de Graftombe van Ra" }],
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
        label="Piramide"
        onStop={() => {}}
        stops={[
          { n: 1, state: "done" },
          { n: 2, state: "done", dot: true, dotLabel: "Nog niet alles bekeken" },
          { n: 3, state: "buried" },
        ]}
      />
    ),
  },
}
