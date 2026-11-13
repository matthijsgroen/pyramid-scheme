import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { CollectionTabs } from "@/ui/molecules/CollectionTabs"
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

const shelves = [
  { id: "treasures", label: "Schatten" },
  { id: "tablets", label: "Tabletten" },
  { id: "keys", label: "Sleutels" },
]

// With the input set to keys or pad: the arrows walk the buttons, [ and ] (LB/RB) turn the tabs, Escape closes.
export const WithTabs: Story = {
  parameters: { pageLayers: true },
  render: function Render(args) {
    const [selected, setSelected] = useState(shelves[0].id)
    return (
      <CampPopup {...args} title="Verzameling">
        <div className="flex flex-col gap-3">
          <CollectionTabs
            tabs={shelves}
            selected={selected}
            onSelect={setSelected}
            label="Je verzameling"
            panelId="story-shelf"
          />
          <div id="story-shelf" role="tabpanel" className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <button
                key={i}
                type="button"
                className="rounded-[10px] border-2 border-camp-rule bg-camp-card px-3 py-4 font-extrabold"
              >
                {shelves.find(shelf => shelf.id === selected)?.label} {i + 1}
              </button>
            ))}
          </div>
        </div>
      </CampPopup>
    )
  },
}
