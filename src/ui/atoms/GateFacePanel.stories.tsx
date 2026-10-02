import type { Meta, StoryObj } from "@storybook/react-vite"
import { GateFacePanel } from "./GateFacePanel"
import { KeyIcon } from "./KeyIcon"

const meta = {
  component: GateFacePanel,
  args: {
    title: "A door that waits",
    hint: "Every sign must burn before it opens.",
    turnAroundLabel: "Turn around",
    onTurnAround: () => {},
  },
} satisfies Meta<typeof GateFacePanel>

export default meta
type Story = StoryObj<typeof meta>

export const TwoTorchesOneLit: Story = {
  args: {
    markers: [
      { id: "a", icon: <span>🔥</span>, lit: true, label: "Torch: lit" },
      { id: "b", icon: <span>🔥</span>, lit: false, label: "Torch: unlit" },
    ],
  },
}

export const TorchesAndAKey: Story = {
  args: {
    markers: [
      { id: "a", icon: <span>🔥</span>, lit: true, label: "Torch: lit" },
      { id: "b", icon: <span>🔥</span>, lit: true, label: "Torch: lit" },
      { id: "c", icon: <span>🔥</span>, lit: false, label: "Torch: unlit" },
      { id: "k", icon: <KeyIcon color="red" size={40} />, lit: false, label: "Key: not held" },
    ],
  },
}

export const AllLit: Story = {
  args: {
    markers: [
      { id: "a", icon: <span>🔥</span>, lit: true, label: "Torch: lit" },
      { id: "b", icon: <span>🎚️</span>, lit: true, label: "Lever: set" },
    ],
  },
}

export const SequenceMidRun: Story = {
  args: {
    markers: [],
    orders: [
      {
        id: "plates",
        tiles: [
          { id: "0", glyph: "𓀀", status: "inOrder", label: "Step 1: walked in order" },
          { id: "1", glyph: "𓁐", status: "unwalked", label: "Step 2: not yet walked" },
          { id: "2", glyph: "𓂀", status: "unwalked", label: "Step 3: not yet walked" },
        ],
      },
    ],
  },
}

export const SequenceSpoiled: Story = {
  args: {
    markers: [],
    orders: [
      {
        id: "plates",
        tiles: [
          { id: "0", glyph: "𓀀", status: "inOrder", label: "Step 1: walked in order" },
          { id: "1", glyph: "𓁐", status: "unwalked", label: "Step 2: not yet walked" },
          { id: "2", glyph: "𓂀", status: "outOfOrder", label: "Step 3: walked out of order" },
        ],
        note: "A tile was walked out of order.",
        reset: { label: "Start again", onReset: () => {} },
      },
    ],
  },
}
