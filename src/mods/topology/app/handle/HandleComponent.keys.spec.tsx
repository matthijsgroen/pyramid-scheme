// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import type { FamilyContext } from "@/app/families/familyRegistry"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { HANDLE_SIDES } from "@/game/siteTypes"
import { HandleComponent } from "./HandleComponent"

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

const ADDRESS = "s0#0/p1"

const open = () => {
  const setMechanismState = vi.fn()
  const onSolved = vi.fn()
  const ctx: FamilyContext = {
    journeyId: "j1",
    levelNr: 1,
    edgeId: "0:0,1",
    address: ADDRESS,
    sectionHash: "s0",
    freshArrival: true,
    mechanism: { states: [...HANDLE_SIDES], initial: "left", returnsToInitial: true, positions: [] },
  }
  const journeys = { getMechanismStates: () => new Map(), setMechanismState } as unknown as JourneyAPI
  render(
    <EncounterModal>
      <HandleComponent
        ctx={ctx}
        journeys={journeys}
        puzzle={{ satisfied: true }}
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

describe("HandleComponent by keys", () => {
  it("throws the lever by keys as a tap throws it, and Escape is the way back", () => {
    const keys = open()
    press("ArrowRight")
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /handle\.right/ }))
    press("Enter")
    press("Escape")
    const keyed = [keys.setMechanismState.mock.calls, keys.onSolved.mock.calls.length]
    cleanup()

    const taps = open()
    act(() => screen.getByRole("button", { name: /handle\.right/ }).click())
    act(() => screen.getByRole("button", { name: "ui.backToMap" }).click())
    expect(keyed).toEqual([taps.setMechanismState.mock.calls, taps.onSolved.mock.calls.length])
    expect(keyed).toEqual([[[ADDRESS, "right"]], 1])
  })
})
