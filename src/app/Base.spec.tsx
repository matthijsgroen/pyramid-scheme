// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DevelopContext } from "@/contexts/DevelopMode"
import { FezContext } from "@/app/fez/context"
import { clearGameData, latestGameValue, writeGameData } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => [key, ...(vars ? Object.values(vars) : [])].join(" "),
    i18n: { language: "en" },
  }),
}))

// No mod registers anything in this spec: the home must stand on core alone.
vi.mock("@/mods/registerModApps", () => ({}))

const journeys = [
  { id: "a", name: "Journey A", difficulty: "starter", difficultyLabel: "Starter", levelCount: 3, exterior: "pyramid" },
  { id: "b", name: "Journey B", difficulty: "starter", difficultyLabel: "Starter", levelCount: 2, exterior: "pyramid" },
]
let activeJourneyId: string | undefined
let available = new Set<string>()
let progress: Record<string, { inProgress: boolean; completionCount: number; levelNr: number }> = {}
const startJourney = vi.fn()

vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => journeys }))
vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({
    activeJourneyId,
    startJourney,
    getJourney: (id: string) => progress[id],
    getUnexploredLevels: () => new Set<number>(),
  }),
}))
vi.mock("@/app/pages/useAvailableJourneyIds", () => ({ useAvailableJourneyIds: () => available }))
vi.mock("@/app/pages/journeyContributions", () => ({
  useMergedJourneyContributions: () => ({ lock: () => undefined, hidden: () => false }),
}))
vi.mock("@/app/SiteMap/keyProviders", () => ({ useMergedHeldKeys: () => new Set<string>() }))
let chapter = "starter"
vi.mock("@/app/pages/journeyAvailability", () => ({ currentChapter: () => chapter }))
vi.mock("@/app/state/useTapHint", () => ({ useTapHint: () => [false, () => {}] }))
vi.mock("@/app/home/useElementSize", () => ({ useElementSize: () => [() => {}, { width: 400, height: 800 }] }))
vi.mock("@/app/dev/LockEditorHost", () => ({ LockEditorHost: () => null }))
vi.mock("@/app/pages/Travel", () => ({ TravelPage: () => <div>travel content</div> }))
vi.mock("@/app/pages/Collection", () => ({ CollectionPage: () => <div>collection content</div> }))
vi.mock("@/app/SettingsModal", () => ({
  SettingsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="settings" /> : null),
}))
vi.mock("@/ui/atoms/CampScene", () => ({
  CampScene: ({
    entrances,
  }: {
    entrances: Record<string, { label: string; badge?: number; onOpen: () => void } | undefined>
  }) => (
    <div data-testid="scene">
      {Object.entries(entrances).map(([spot, e]) =>
        e ? (
          <button key={spot} onClick={e.onOpen}>
            {e.label}
          </button>
        ) : null
      )}
    </div>
  ),
}))

const { Base } = await import("./Base")
const { registerModEntrance } = await import("@/app/home/modEntrances")
const { registerHomeHook } = await import("@/app/home/homeHooks")

const stubDesktop = (desktop: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

const Develop = ({ children }: { children: ReactNode }) => {
  const [isDevelopMode, setDevelopMode] = useState(false)
  return <DevelopContext.Provider value={{ isDevelopMode, setDevelopMode }}>{children}</DevelopContext.Provider>
}

const Arrival = ({ startGame, cameHome }: { startGame: () => void; cameHome: boolean }) => {
  const [arriving, setArriving] = useState(cameHome)
  return <Base startGame={startGame} cameHome={arriving} onArrived={() => setArriving(false)} />
}

const renderBase = (startGame = vi.fn(), cameHome = false) => {
  render(
    <Develop>
      <FezContext.Provider value={{ showConversation: () => {} }}>
        <Arrival startGame={startGame} cameHome={cameHome} />
      </FezContext.Provider>
    </Develop>
  )
  return startGame
}

beforeEach(async () => {
  await clearGameData()
  chapter = "starter"
  stubDesktop(false)
  activeJourneyId = undefined
  available = new Set(["a", "b"])
  progress = {}
  startJourney.mockReset()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe(Base, () => {
  it("renders the scene, the card and the chest, which opens the collection until Escape", () => {
    renderBase()

    expect(screen.getByTestId("scene")).toBeTruthy()
    expect(screen.getByText("camp.continue.heading")).toBeTruthy()
    fireEvent.click(screen.getByText("camp.entrance.collection"))
    expect(screen.getByRole("dialog", { name: "camp.entrance.collection" })).toBeTruthy()
    expect(screen.getByText("collection content")).toBeTruthy()

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("continues a journey in progress without starting one", async () => {
    activeJourneyId = "b"
    progress = { b: { inProgress: true, completionCount: 0, levelNr: 2 } }
    const startGame = renderBase()

    await act(async () => fireEvent.click(screen.getByText("camp.continue.setOff")))

    expect(startJourney).not.toHaveBeenCalled()
    expect(startGame).toHaveBeenCalled()
  })

  it("starts the offered journey, then sets off, when none is in progress", async () => {
    const order: string[] = []
    startJourney.mockImplementation(async () => order.push("start"))
    const startGame = renderBase(vi.fn(() => order.push("game")))

    await act(async () => fireEvent.click(screen.getByText("camp.continue.setOff")))

    expect(startJourney).toHaveBeenCalledWith(journeys[0])
    expect(startGame).toHaveBeenCalled()
    expect(order).toEqual(["start", "game"])
  })

  it("opens the journeys as a dialog on a phone", () => {
    renderBase()
    expect(screen.queryByText("travel content")).toBeNull()

    fireEvent.click(screen.getByText("camp.continue.allJourneys"))

    expect(screen.getByRole("dialog", { name: "camp.entrance.journeys" })).toBeTruthy()
    expect(screen.getByText("travel content")).toBeTruthy()
  })

  it("shows the journeys in the page on desktop, with no all-journeys button on the card", () => {
    stubDesktop(true)
    renderBase()

    expect(screen.getByText("travel content")).toBeTruthy()
    expect(screen.queryByText("camp.continue.allJourneys")).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows a registered window entrance and opens its screen in a dialog", () => {
    registerModEntrance({
      id: "made-up",
      object: "window",
      useLabel: () => ({ label: "Made-up window", badge: 2 }),
      Screen: () => <div>made-up screen</div>,
      title: () => "Made-up title",
    })
    renderBase()

    fireEvent.click(screen.getByText("Made-up window"))

    expect(screen.getByRole("dialog", { name: "Made-up title" })).toBeTruthy()
    expect(screen.getByText("made-up screen")).toBeTruthy()
  })

  it("opens settings from the gear and turns develop mode on after seven title taps", () => {
    renderBase()
    expect(screen.queryByTestId("settings")).toBeNull()
    expect(screen.queryByText("DEV")).toBeNull()

    fireEvent.click(screen.getByLabelText("ui.settings"))
    expect(screen.getByTestId("settings")).toBeTruthy()

    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByText("camp.title"))
    expect(screen.getByText("DEV")).toBeTruthy()
  })

  describe("coming home and the new chapter", () => {
    it("shows the coming-home screen over the camp after a journey, and none otherwise", async () => {
      renderBase(vi.fn(), true)
      expect(screen.getByText("camp.comingHome.title")).toBeTruthy()
      expect(screen.getByTestId("scene")).toBeTruthy()

      await act(async () => fireEvent.click(screen.getByText("camp.comingHome.toCamp")))
      expect(screen.queryByText("camp.comingHome.title")).toBeNull()
    })

    it("runs a registered home hook when the camp shows, not behind the coming-home screen", async () => {
      const ran = vi.fn()
      registerHomeHook(() => ran())
      renderBase(vi.fn(), true)
      expect(ran).not.toHaveBeenCalled()

      await act(async () => fireEvent.click(screen.getByText("camp.comingHome.toCamp")))
      expect(ran).toHaveBeenCalled()
    })

    it("shows no coming-home screen on a plain visit", () => {
      renderBase()
      expect(screen.queryByText("camp.comingHome.title")).toBeNull()
    })

    it("announces a tier reached after the record once Uitpakken is done, and marks it on close", async () => {
      await writeGameData({ homecoming: { version: 1, haul: [], chapter: "starter" } })
      chapter = "expert"
      renderBase(vi.fn(), true)
      await screen.findByText("camp.comingHome.title")
      expect(screen.queryByText("camp.chapter.title")).toBeNull()

      await act(async () => fireEvent.click(screen.getByText("camp.comingHome.toCamp")))
      expect(await screen.findByText("camp.chapter.title")).toBeTruthy()

      await act(async () => fireEvent.click(screen.getByText("camp.chapter.later")))
      expect(screen.queryByText("camp.chapter.title")).toBeNull()
      expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [], chapter: "expert" })
    })

    it("stores the current chapter silently for a save without a record", async () => {
      chapter = "expert"
      renderBase()

      await vi.waitFor(() => expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [], chapter: "expert" }))
      expect(screen.queryByText("camp.chapter.title")).toBeNull()
    })
  })
})
