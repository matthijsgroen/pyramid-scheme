import type { Meta, StoryObj } from "@storybook/react-vite"
import { HieroglyphUnlockPanel } from "./HieroglyphUnlockPanel"

const meta = {
  title: "UI/HieroglyphUnlockPanel",
  component: HieroglyphUnlockPanel,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    hieroglyphDifficulty: {
      control: "select",
      options: ["starter", "junior", "expert", "master", "wizard"],
    },
    artifactId: {
      control: "select",
      options: ["t24", "t26"],
      description: "t24 = Meteorite Fragment, t26 = Time Crystal",
    },
  },
} satisfies Meta<typeof HieroglyphUnlockPanel>

export default meta
type Story = StoryObj<typeof meta>

export const MeteoriteFragment: Story = {
  args: {
    hieroglyphSymbol: "𓁺",
    hieroglyphDifficulty: "master",
    artifactId: "t24",
    onUnlock: () => console.log("Unlocked!"),
    onDismiss: () => console.log("Dismissed"),
  },
}

export const TimeCrystal: Story = {
  args: {
    hieroglyphSymbol: "𓆕",
    hieroglyphDifficulty: "master",
    artifactId: "t26",
    onUnlock: () => console.log("Unlocked!"),
    onDismiss: () => console.log("Dismissed"),
  },
}

export const StarterDifficulty: Story = {
  args: {
    hieroglyphSymbol: "𓀀",
    hieroglyphDifficulty: "starter",
    artifactId: "t24",
    onUnlock: () => console.log("Unlocked!"),
    onDismiss: () => console.log("Dismissed"),
  },
}
