import type { FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { getFamilyPlugin, type FamilyContext } from "@/app/families/familyRegistry"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"
import { useInventory } from "@/app/Inventory/useInventory"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { Tileset } from "@/game/siteTypes"
import "@/mods/registerModApps"

// A shut door in the encounter frame the game opens it in, on the wall of the room it stands in.
const KeyGate: FC<{ tileset: Tileset; variant: "floor-key" | "tomb-key"; satisfied: boolean }> = ({
  tileset,
  variant,
  satisfied,
}) => {
  const progression = useProgression()
  const journeys = useJourneys()
  const inventory = useInventory()
  const family = getFamilyPlugin("key-gate")
  if (!family) return <p className="p-4 text-white">No key-gate in the registry.</p>
  const requiredKeyId = variant === "tomb-key" ? `${tileset === "cave" ? "starter" : tileset}_1` : "floor-key"
  const ctx: FamilyContext = {
    journeyId: "key-gate-story",
    levelNr: 1,
    edgeId: "story:1",
    address: "story#1@gate",
    sectionHash: "story",
    freshArrival: true,
    difficulty: "starter",
    tileset,
    requiredKeyId,
    gateVariant: variant,
    keyColor: variant === "floor-key" ? "blue" : undefined,
    ownedKeys: satisfied ? new Set([requiredKeyId]) : new Set(),
  }
  const Component = family.Component
  return (
    <EncounterModal tileset={tileset}>
      <Component
        puzzle={family.generate(1, ctx)}
        ctx={ctx}
        progression={progression}
        journeys={journeys}
        inventory={inventory}
        applyReward={() => {}}
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  )
}

const meta = {
  component: KeyGate,
  parameters: { layout: "fullscreen" },
  argTypes: {
    tileset: {
      control: "inline-radio",
      options: ["starter", "junior", "expert", "master", "wizard", "cave", "sphinx"],
    },
    variant: { control: "inline-radio", options: ["floor-key", "tomb-key"] },
  },
  args: { tileset: "starter", variant: "floor-key", satisfied: false },
} satisfies Meta<typeof KeyGate>

export default meta
type Story = StoryObj<typeof meta>

export const ColourDoor: Story = {}
export const WardGate: Story = { args: { variant: "tomb-key", tileset: "expert" } }
