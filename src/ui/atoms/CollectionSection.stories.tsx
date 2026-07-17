import type { Meta, StoryObj } from "@storybook/react-vite"
import { CollectionSection } from "./CollectionSection"

const meta = {
  title: "UI/CollectionSection",
  component: CollectionSection,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CollectionSection>

export default meta
type Story = StoryObj<typeof meta>

const body = <div className="text-white">section body</div>

export const Purple: Story = { args: { title: "Deities", accent: "purple", children: body } }
export const Amber: Story = { args: { title: "Merchant Cache", accent: "amber", children: body } }
export const Emerald: Story = { args: { title: "Junk", accent: "emerald", children: body } }
