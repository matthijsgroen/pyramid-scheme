// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearGameData, latestGameValue } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const journeys = [
  { id: "low", name: "Low one", difficulty: "starter", levelCount: 1, exterior: "pyramid" },
  { id: "first", name: "First of tier", difficulty: "expert", levelCount: 2, exterior: "pyramid" },
  { id: "second", name: "Second of tier", difficulty: "expert", levelCount: 2, exterior: "pyramid" },
]
const startJourney = vi.fn()
vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => journeys }))
vi.mock("@/app/state/useJourneys", () => ({ useJourneys: () => ({ startJourney }) }))
vi.mock("@/app/pages/useAvailableJourneyIds", () => ({
  useAvailableJourneyIds: () => new Set(["low", "first", "second"]),
}))
vi.mock("@/app/pages/journeyContributions", () => ({
  useMergedJourneyContributions: () => ({ lock: () => undefined, hidden: () => false }),
}))

const { NewChapter } = await import("./NewChapter")

beforeEach(async () => {
  await clearGameData()
  startJourney.mockReset()
})
afterEach(cleanup)

describe(NewChapter, () => {
  it("sets off on the tier's first open journey and marks the chapter", async () => {
    const startGame = vi.fn()
    render(<NewChapter tier="expert" startGame={startGame} onClose={() => {}} />)

    await act(async () => fireEvent.click(screen.getByText("camp.continue.setOff")))

    expect(startJourney).toHaveBeenCalledWith(journeys[1])
    expect(startGame).toHaveBeenCalledOnce()
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [], chapter: "expert" })
  })

  it("marks the chapter on close and starts nothing", async () => {
    const startGame = vi.fn()
    const onClose = vi.fn()
    render(<NewChapter tier="expert" startGame={startGame} onClose={onClose} />)

    await act(async () => fireEvent.click(screen.getByText("camp.chapter.later")))

    expect(onClose).toHaveBeenCalledOnce()
    expect(startJourney).not.toHaveBeenCalled()
    expect(startGame).not.toHaveBeenCalled()
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [], chapter: "expert" })
  })
})
