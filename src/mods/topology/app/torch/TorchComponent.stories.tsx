import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { TorchComponent } from "./TorchComponent"

const meta = {
  title: "Topology/TorchComponent",
  component: TorchComponent,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TorchComponent>

export default meta
type Story = StoryObj<typeof meta>

const ADDRESS = "s0#0/p2"

const ctx: FamilyContext = {
  journeyId: "story",
  levelNr: 1,
  edgeId: "0:0,2",
  address: ADDRESS,
  sectionHash: "s0",
  freshArrival: true,
  mechanism: { states: ["off", "lit"], initial: "off", returnsToInitial: false, positions: [] },
}

const Torch = () => {
  const [state, setState] = useState<string>()
  const journeys = {
    getMechanismStates: () => new Map(state === undefined ? [] : [[ADDRESS, state]]),
    setMechanismState: (_address: string, value: string) => setState(value),
  } as unknown as JourneyAPI
  return (
    <EncounterModal tileset="junior">
      <TorchComponent
        ctx={ctx}
        journeys={journeys}
        puzzle={{}}
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
 * The torch as a keyboard or pad player meets it: the encounter frame is the input layer, so arrows or WASD
 * walk its buttons, Enter or Space lights it and Escape is the way back to the map.
 */
export const KeyboardCursor: Story = {
  args: {} as never,
  globals: { input: "keys" },
  parameters: { pageLayers: true },
  render: () => <Torch />,
}
