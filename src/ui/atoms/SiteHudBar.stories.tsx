import type { Meta, StoryObj } from "@storybook/react-vite"
import { SiteHudBar } from "./SiteHudBar"
import { HealthDisplay } from "./HealthDisplay"

const meta = {
  title: "UI/SiteHudBar",
  component: SiteHudBar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    Story => (
      <div className="relative h-64 w-full bg-stone-950">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SiteHudBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <HealthDisplay currentHealth={6} maxHealth={8} />,
  },
}
