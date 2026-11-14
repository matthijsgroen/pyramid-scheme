import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { TreasureComponent } from "./plugin"
import type { FamilyContext } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import "@/mods/registerModApps"

type Args = { tier: Difficulty; ward: boolean; stayOpen?: boolean }

// Tap the chest to open it; once it hands over to the reward, it closes again so it can be tapped anew —
// unless it stays open, to watch the light behind it breathe.
const Harness = ({ tier, ward, stayOpen }: Args) => {
  const [round, setRound] = useState(0)
  const ctx = {
    difficulty: tier,
    tileset: tier,
    reward: ward ? { type: "tombKey", keyId: "made_up" } : { type: "mosaicPiece" },
  } as unknown as FamilyContext
  const onSolved = stayOpen ? () => {} : () => setTimeout(() => setRound(r => r + 1), 1200)
  const props = { ctx, onSolved } as unknown as Parameters<typeof TreasureComponent>[0]
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

export const PlainChestStaysOpen: Story = { args: { tier: "junior", ward: false, stayOpen: true } }

export const WardKeyChestStaysOpen: Story = { args: { tier: "junior", ward: true, stayOpen: true } }
