// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { controlsInARow, press } from "@/app/input/controlsInARow.testing"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { Wall } from "@/mods/story/game/reading/walls"
import { WallScreen } from "./WallScreen"

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

const panel: Wall["panel"] = { aspect: 1.3, signs: { x: 0.2, y: 0.3, width: 0.6, height: 0.4 }, flow: "row" }

// Made-up walls: one with a sign cut wrong, one with a slot scoured empty.
const miscut: Wall = {
  at: { levelNr: 1, floor: 0 },
  cut: ["d1", "a1", "p1"],
  wrongAt: 1,
  answer: "a2",
  copy: "test.miscut",
  after: "test.miscutFixed",
  panel,
}
const scoured: Wall = { ...miscut, cut: ["d1", ""], answer: "s1", missing: true, panel: { ...panel, frame: 0 } }

const open = (wall: Wall) => {
  const onPut = vi.fn()
  const onBack = vi.fn()
  render(
    <EncounterModal>
      <WallScreen
        wall={wall}
        known={wall.cut.map(() => true)}
        repairable
        owned={["a2", "d1"]}
        picked={null}
        onPut={onPut}
        onBack={onBack}
      />
    </EncounterModal>
  )
  return { onPut, onBack }
}

describe("WallScreen by keys", () => {
  it("puts a sign from the tray by keys as a tap puts it, and Escape is the way back", () => {
    const keys = open(miscut)
    press("ArrowRight")
    press("ArrowRight")
    press("Enter")
    press("Escape")
    const keyed = [keys.onPut.mock.calls, keys.onBack.mock.calls.length]
    cleanup()

    const taps = open(miscut)
    act(() => screen.getAllByRole("button")[1].click())
    act(() => screen.getByRole("button", { name: "ui.back" }).click())
    expect(keyed).toEqual([taps.onPut.mock.calls, taps.onBack.mock.calls.length])
    expect(keyed).toEqual([[["d1"]], 1])
  })

  it("fills a scoured slot by keys as a tap on the gap fills it", () => {
    const keys = open(scoured)
    press("ArrowRight")
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "test.miscut.gap" }))
    press("Enter")
    expect(keys.onPut.mock.calls).toEqual([["s1"]])
  })
})
