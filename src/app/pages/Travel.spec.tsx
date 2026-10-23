// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}))

const visitLevel = vi.fn()
const journey = {
  id: "t",
  name: "t",
  levelCount: 2,
  exterior: "tomb",
  journeyLength: "short",
  difficulty: "starter",
  difficultyLabel: "Starter",
}
let stored = { levelNr: 3, completionCount: 1, inProgress: false, journey }

vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({
    activeJourneyId: "t",
    startJourney: vi.fn(),
    visitLevel,
    cancelJourney: vi.fn(),
    getJourney: () => stored,
    getOutstandingHiddenCorridorCount: () => 0,
    getUnexploredLevels: () => [],
  }),
}))
vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => [journey] }))
vi.mock("@/mods/registerModApps", () => ({}))
vi.mock("@/app/SiteMap/detectorLevels", async importOriginal => ({
  ...(await importOriginal<typeof import("@/app/SiteMap/detectorLevels")>()),
  useMergedDetectorLevels: () => ({}),
}))
vi.mock("@/app/SiteMap/keyProviders", async importOriginal => ({
  ...(await importOriginal<typeof import("@/app/SiteMap/keyProviders")>()),
  useMergedHeldKeys: () => [],
}))
vi.mock("@/app/state/useTapHint", () => ({ useTapHint: () => [false, () => {}] }))
vi.mock("@/app/dev/useDevActions", () => ({ useDevActions: () => ({}) }))
vi.mock("./journeyContributions", () => ({
  useMergedJourneyContributions: () => ({ lock: () => undefined, hidden: () => false }),
}))
vi.mock("./journeyAvailability", () => ({
  availablePyramidJourneyIds: () => new Set(),
  comingSoonDifficulty: () => undefined,
}))
vi.mock("@/ui/atoms/JourneyPathView", () => ({
  JourneyPathView: ({ onClick }: { onClick: () => void }) => <button data-testid="journey-map" onClick={onClick} />,
}))

const { TravelPage } = await import("./Travel")

describe(TravelPage, () => {
  it("resumes a completed journey at its last level from the map", async () => {
    const startGame = vi.fn()
    render(<TravelPage startGame={startGame} />)

    await act(async () => fireEvent.click(screen.getByTestId("journey-map")))

    expect(visitLevel).toHaveBeenCalledWith("t", 2)
    expect(startGame).toHaveBeenCalled()
  })

  it("resumes at the level it stopped on when that one exists", async () => {
    stored = { ...stored, levelNr: 1 }
    visitLevel.mockClear()
    render(<TravelPage startGame={() => {}} />)

    await act(async () => fireEvent.click(screen.getByTestId("journey-map")))

    expect(visitLevel).toHaveBeenCalledWith("t", 1)
  })
})
