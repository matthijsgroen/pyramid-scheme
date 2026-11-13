// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { TorchComponent } from "./TorchComponent"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

let stopLayers: () => void
beforeEach(() => {
  controlsInARow()
  stopLayers = listenForPageLayers()
})
afterEach(() => {
  cleanup()
  stopLayers()
  vi.restoreAllMocks()
})

const ADDRESS = "s0#0/p2"

const open = () => {
  const setMechanismState = vi.fn()
  const onSolved = vi.fn()
  const ctx: FamilyContext = {
    journeyId: "j1",
    levelNr: 1,
    edgeId: "0:0,2",
    address: ADDRESS,
    sectionHash: "s0",
    freshArrival: true,
    mechanism: { states: ["off", "lit"], initial: "off", returnsToInitial: false, positions: [] },
  }
  const journeys = { getMechanismStates: () => new Map(), setMechanismState } as unknown as JourneyAPI
  render(
    <EncounterModal>
      <TorchComponent
        ctx={ctx}
        journeys={journeys}
        puzzle={{}}
        progression={undefined as never}
        inventory={undefined as never}
        applyReward={vi.fn()}
        onSolved={onSolved}
        onCancel={vi.fn()}
      />
    </EncounterModal>
  )
  return { setMechanismState, onSolved }
}

describe("TorchComponent by keys", () => {
  it("lights the torch by keys as a tap lights it, and Escape is the way back", () => {
    const keys = open()
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "torch.invitation" }))
    press("Enter")
    press("Escape")
    const keyed = [keys.setMechanismState.mock.calls, keys.onSolved.mock.calls.length]
    cleanup()

    const taps = open()
    act(() => screen.getByRole("button", { name: "torch.invitation" }).click())
    act(() => screen.getByRole("button", { name: "ui.backToMap" }).click())
    expect(keyed).toEqual([taps.setMechanismState.mock.calls, taps.onSolved.mock.calls.length])
    expect(keyed).toEqual([[[ADDRESS, "lit"]], 1])
  })
})
