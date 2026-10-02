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
