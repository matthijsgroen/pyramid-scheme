import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"
import { CompassSheet, type CompassSheetProps } from "./CompassSheet"

const glyphs = [
  { id: "owl", symbol: "𓅓", progress: "1/3" },
  { id: "eye", symbol: "𓂀", progress: "2/4" },
  { id: "beetle", symbol: "𓆣", progress: "1/2" },
  { id: "sun", symbol: "𓇳", progress: "1/2" },
  { id: "ankh", symbol: "𓋹", progress: "3/4" },
]

const meta = {
  component: CompassSheet,
  decorators: [
    Story => (
      <div className="max-w-sm bg-camp-glass-solid p-2">
        <Story />
      </div>
    ),
  ],
  args: {
    parts: { held: 2, total: 3 },
    partsLabel: "2 of 3 parts · sees the floor",
    pickHeading: "What is the compass looking for?",
    onlyIncomplete: "Only signs you have a piece of, until they are complete.",
    glyphs,
    picked: "owl",
    onPick: fn(),
    whereHeading: "Where the pieces of 𓅓 lie",
    pickFirst: "Pick a sign to see where its pieces lie.",
    nothingToFind: "Every sign you can reach is complete.",
    rows: [
      { key: "a", label: "Temple of Thoth L1 F2", access: "open" },
      { key: "b", label: "Lighthouse of Alexandria L2 F1", access: "locked" },
      { key: "c", label: "Valley of the Artisans L3 F2", access: "hidden" },
    ],
    accessLabels: {
      open: "Nothing known in the way",
      locked: "Locked",
      hidden: "In a hidden corridor",
      unknown: "Maybe",
    },
    followLabel: "Follow this sign",
    followingLabel: "The compass follows this sign",
    following: false,
    onFollow: fn(),
  },
} satisfies Meta<typeof CompassSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Picked: Story = {}

export const Following: Story = { args: { following: true } }

export const NothingPicked: Story = { args: { picked: null } }

export const AllComplete: Story = { args: { glyphs: [] } }

/** Pick a sign to see its button wake up. */
export const Interactive: Story = {
  render: args => {
    const [picked, setPicked] = useState<string | null>(null)
    const props: CompassSheetProps = { ...args, picked, onPick: setPicked }
    return <CompassSheet {...props} />
  },
}
