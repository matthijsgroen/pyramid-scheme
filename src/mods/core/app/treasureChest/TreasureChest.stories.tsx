import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { TreasureComponent } from "./plugin"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import "@/mods/registerModApps"

type Args = { tier: Difficulty; ward: boolean }

// Tap the chest to open it; once it hands over to the reward, it closes again so it can be tapped anew.
const Harness = ({ tier, ward }: Args) => {
  const [round, setRound] = useState(0)
  const ctx = {
    difficulty: tier,
    tileset: tier,
    reward: ward ? { type: "tombKey", keyId: "made_up" } : { type: "mosaicPiece" },
  } as unknown as FamilyContext
  const props = { ctx, onSolved: () => setTimeout(() => setRound(r => r + 1), 1200) } as unknown as Parameters<
    typeof TreasureComponent
  >[0]
  return <TreasureComponent key={`${tier}-${ward}-${round}`} {...props} />
}

const meta: Meta<Args> = {
  title: "Core/TreasureChest",
  render: args => <Harness {...args} />,
  parameters: { layout: "fullscreen" },
  argTypes: {
    tier: { control: "select", options: ["starter", "junior", "expert", "master", "wizard"] },
    ward: { control: "boolean" },
  },
}

export default meta
type Story = StoryObj<Args>

export const PlainChest: Story = { args: { tier: "starter", ward: false } }

export const WardKeyChest: Story = { args: { tier: "junior", ward: true } }
