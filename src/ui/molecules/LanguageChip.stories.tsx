import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { LanguageChip } from "./LanguageChip"

const meta = {
  component: LanguageChip,
  args: {
    name: "English",
    label: "Language",
    value: "en",
    preferred: [{ code: "en", name: "English" }],
    others: [
      { code: "de", name: "Deutsch" },
      { code: "fy", name: "Frysk" },
      { code: "nl", name: "Nederlands" },
    ],
    onChange: fn(),
  },
  decorators: [
    Story => (
      <div className="bg-amber-200 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LanguageChip>

export default meta
type Story = StoryObj<typeof meta>

export const OnTheCamp: Story = {}

export const LongName: Story = {
  args: { name: "Español (Latinoamérica)", value: "es" },
}
