import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { CollectionTabs } from "./CollectionTabs"

const tabs = [
  { id: "a", label: "Hiërogliefen" },
  { id: "b", label: "Schatten · 1 nieuw" },
  { id: "c", label: "Kaarten" },
  { id: "d", label: "Sleutels" },
  { id: "e", label: "Constructies" },
]

const meta = {
  component: CollectionTabs,
  parameters: { layout: "centered" },
  args: { tabs, selected: "a", onSelect: () => {}, panelId: "story-panel" },
  decorators: [
    Story => (
      <div className="w-[358px] bg-[#F4EAD5] p-3.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CollectionTabs>

export default meta
type Story = StoryObj<typeof meta>

export const FiveTabs: Story = {
  render: args => {
    const [selected, setSelected] = useState(args.selected)
    return <CollectionTabs {...args} selected={selected} onSelect={setSelected} />
  },
}
export const TwoTabs: Story = { args: { tabs: tabs.slice(0, 2), selected: "b" } }
