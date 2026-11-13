import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { markFor } from "@/game/mark"
import { HANDLE_SIDES } from "@/game/siteTypes"
import { HandleComponent } from "./HandleComponent"

const meta = {
  title: "Topology/HandleComponent",
  component: HandleComponent,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HandleComponent>

export default meta
type Story = StoryObj<typeof meta>

const ADDRESS = "s0#0/p1"

const ctx: FamilyContext = {
  journeyId: "story",
  levelNr: 1,
  edgeId: "0:0,1",
  address: ADDRESS,
  sectionHash: "s0",
  freshArrival: true,
  mechanism: { states: [...HANDLE_SIDES], initial: "left", returnsToInitial: true, positions: [] },
  mark: markFor(0),
}

const Lever = () => {
  const [side, setSide] = useState<string>()
  const journeys = {
    getMechanismStates: () => new Map(side === undefined ? [] : [[ADDRESS, side]]),
    setMechanismState: (_address: string, value: string) => setSide(value),
  } as unknown as JourneyAPI
  return (
    <EncounterModal tileset="junior">
      <HandleComponent
        ctx={ctx}
        journeys={journeys}
        puzzle={{ satisfied: true }}
        progression={undefined as never}
        inventory={undefined as never}
        applyReward={() => {}}
        onSolved={() => {}}
        onCancel={() => {}}
      />
    </EncounterModal>
  )
}

/**
 * The lever as a keyboard or pad player meets it: the encounter frame is the input layer, so arrows or WASD
 * walk its buttons, Enter or Space throws the focused side and Escape is the way back to the map.
 */
export const KeyboardCursor: Story = {
  args: {} as never,
  globals: { input: "keys" },
  parameters: { pageLayers: true },
  render: () => <Lever />,
}
