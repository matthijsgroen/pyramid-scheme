import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { LanguageSelect } from "./LanguageSelect"

const meta = {
  component: LanguageSelect,
  args: {
    value: "en",
    preferred: [
      { code: "en", name: "English" },
      { code: "nl", name: "Nederlands" },
    ],
    others: [
      { code: "cs", name: "Čeština" },
      { code: "de", name: "Deutsch" },
      { code: "fy", name: "Frysk" },
      { code: "el", name: "Ελληνικά" },
    ],
    onChange: fn(),
    className: "rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900",
  },
} satisfies Meta<typeof LanguageSelect>

export default meta
type Story = StoryObj<typeof meta>

export const BrowserLanguagesFirst: Story = {}

/** A browser reading none of the shipped languages: one list, no divider. */
export const NoBrowserMatch: Story = {
  args: { preferred: [] },
}
