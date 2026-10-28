import type { Meta, StoryObj } from "@storybook/react-vite"
import { CampPopup } from "./CampPopup"

const meta = {
  component: CampPopup,
  parameters: { layout: "fullscreen" },
  args: { title: "Alle reizen", closeLabel: "Sluiten", onClose: () => {} },
} satisfies Meta<typeof CampPopup>

export default meta
type Story = StoryObj<typeof meta>

export const WithFiller: Story = {
  render: args => (
    <CampPopup {...args}>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i} className="rounded-[10px] border-2 border-camp-rule bg-camp-card px-3 py-2.5 font-extrabold">
            Reis {i + 1}
          </li>
        ))}
      </ul>
    </CampPopup>
  ),
}

// On a phone the panel starts below a taller HUD.
