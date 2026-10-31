import type { Meta, StoryObj } from "@storybook/react-vite"
import { CampHud } from "./CampHud"

const Coins = () => <span className="font-extrabold">340</span>
const Hearts = () => <span aria-label="3 hearts">♥ ♥ ♥</span>

const meta = {
  component: CampHud,
  parameters: { layout: "fullscreen" },
  args: { title: "Kamp", onTitleTap: () => {}, settingsLabel: "Instellingen", onSettings: () => {} },
} satisfies Meta<typeof CampHud>

export default meta
type Story = StoryObj<typeof meta>

export const WithWidgets: Story = {
  render: args => (
    <CampHud {...args}>
      <Coins />
      <Hearts />
    </CampHud>
  ),
}
export const WithDevBadge: Story = {
  args: { devBadge: "DEV" },
  render: args => (
    <CampHud {...args}>
      <Coins />
    </CampHud>
  ),
}
export const CountingTaps: Story = { args: { tapsLeft: 2 } }
