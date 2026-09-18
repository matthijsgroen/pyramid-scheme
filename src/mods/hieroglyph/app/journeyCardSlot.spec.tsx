// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import "@/mods/registerModApps"
import { journeyCardSlots } from "@/app/pages/journeyCardSlots"
import type { CombinedJourneyState } from "@/app/state/useJourneys"

// The travel card's tableau preview reaches the screen through the slot registry, and decides for
// itself which cards it belongs on — a pyramid, or a tomb nobody is part-way through, gets nothing.
const slot = () => journeyCardSlots().find(s => s.id === "hieroglyph:tableau-inventory")

const journeyState = (journeyId: string, inProgress: boolean) =>
  ({ journeyId, inProgress, levelNr: 1, randomSeed: 1, completionCount: 0 }) as unknown as CombinedJourneyState

describe("hieroglyph's journey-card slot", () => {
  it("is registered with the travel screen", () => {
    expect(slot()).toBeDefined()
  })

  it("shows nothing for a pyramid journey", () => {
    const Component = slot()!.Component
    const { container } = render(<Component journeyInfo={journeyState("starter_1", true)} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows nothing for a tomb that is not part-way through a run", () => {
    const Component = slot()!.Component
    const { container } = render(<Component journeyInfo={journeyState("starter_treasure_tomb", false)} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows the next tableau's symbols for a tomb in progress", () => {
    const Component = slot()!.Component
    const { container } = render(<Component journeyInfo={journeyState("starter_treasure_tomb", true)} />)
    expect(container.innerHTML).not.toBe("")
  })
})
