// @vitest-environment jsdom
import { render, cleanup, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { listenForPageLayers } from "@/app/input/pageLayers"

// `language` stands in for i18n's own current language, so a test can move it the way
// changeLanguage would and then re-render — which is what react-i18next does for real.
let language = "en"
const changeLanguage = vi.fn((next: string) => {
  language = next
})

// Renders the key with whatever was interpolated into it, so a test can read the numbers back out.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => [key, ...(vars ? Object.values(vars) : [])].join(" "),
    i18n: { language, changeLanguage },
  }),
}))

// Every key reads its own default, as a save that never stored it does; each key has its own setter.
const setters = new Map<string, ReturnType<typeof vi.fn>>()
const setterFor = (key: string) => {
  if (!setters.has(key)) setters.set(key, vi.fn())
  return setters.get(key)!
}
const sounds = vi.hoisted(() => ({ registered: false }))
vi.mock("@/app/audio/soundRegistry", async importOriginal => ({
  ...(await importOriginal<typeof import("@/app/audio/soundRegistry")>()),
  hasSounds: () => sounds.registered,
}))

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: (key: string, initialValue: unknown) => [initialValue, setterFor(key), true],
  clearGameData: vi.fn(async () => {}),
}))

// Heavy dev tools stand in as markers: what is pinned is which ones the dialog shows, not how they work.
vi.mock("@/app/dev/PuzzleLab", () => ({ PuzzleLab: () => <div data-testid="puzzle-lab" /> }))
vi.mock("@/app/dev/SaveTransfer", () => ({ SaveTransfer: () => <div data-testid="save-transfer" /> }))
vi.mock("@/app/dev/useDevActions", () => ({ useDevActions: () => [] }))
vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => [] }))
const startJourney = vi.fn()
vi.mock("@/app/state/useJourneys", async importOriginal => ({
  ...(await importOriginal<typeof import("@/app/state/useJourneys")>()),
  useJourneys: () => ({ startJourney }),
}))

const { SettingsModal } = await import("./SettingsModal")
const { DevelopContext } = await import("@/contexts/DevelopMode")

// Dialogs are input layers: Escape reaches them through the app's input stack.
let stopListening = () => {}
beforeEach(() => {
  stopListening = listenForPageLayers()
})
afterEach(() => stopListening())

const selectIn = (container: HTMLElement) => container.querySelector<HTMLSelectElement>("#language-select")!

afterEach(() => {
  cleanup()
  language = "en"
  changeLanguage.mockClear()
  setters.clear()
})

// Characterisation, not regression: these also pass against the version that mirrored the language
// into local state, since after effects flush the two agree. What they pin is that the select always
// reports i18n's language — which is what stops a copy being reintroduced and drifting from it.
describe("SettingsModal language selection", () => {
  it("shows the language i18n is actually using, not a copy made when it mounted", () => {
    language = "nl"
    const { container } = render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(selectIn(container).value).toBe("nl")
  })

  it("hands the choice to i18n and reads the result back on the next render", () => {
    const { container, rerender } = render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(selectIn(container).value).toBe("en")

    fireEvent.change(selectIn(container), { target: { value: "nl" } })
    expect(changeLanguage).toHaveBeenCalledWith("nl")

    // No local copy to keep in step: the next render simply reflects i18n's new language.
    rerender(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(selectIn(container).value).toBe("nl")
  })

  it("lists the browser's languages first, then a divider, then the rest", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "en-US"])
    const { container } = render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    const options = [...selectIn(container).options]
    expect(options.slice(0, 3).map(o => [o.value || o.textContent, o.disabled])).toEqual([
      ["de", false],
      ["en", false],
      ["──────────", true],
    ])
    expect(options.filter(o => o.value === "de")).toHaveLength(1)
    vi.restoreAllMocks()
  })
})

describe("the developer block", () => {
  const renderIn = (isDevelopMode: boolean) =>
    render(
      <DevelopContext.Provider value={{ isDevelopMode, setDevelopMode: () => {} }}>
        <SettingsModal isOpen onClose={vi.fn()} startGame={vi.fn()} />
      </DevelopContext.Provider>
    )

  it("shows no dev tool outside develop mode", () => {
    const { container } = renderIn(false)

    expect(container.textContent).not.toContain("Playtesting tools")
    expect(container.textContent).not.toContain("devLockEditor.open")
    expect(screen.queryByTestId("puzzle-lab")).toBeNull()
    expect(screen.queryByTestId("save-transfer")).toBeNull()
  })

  it("shows the playtesting panel, lock editor button and lab in develop mode", async () => {
    const { container } = renderIn(true)

    expect(await screen.findByText(/Playtesting tools/)).toBeTruthy()
    expect(container.textContent).toContain("devLockEditor.open")
    expect(screen.getByTestId("puzzle-lab")).toBeTruthy()
    expect(screen.getByTestId("save-transfer")).toBeTruthy()
  })
})

describe("SettingsModal as a dialog", () => {
  it("is a modal dialog that Escape closes", () => {
    const onClose = vi.fn()
    render(<SettingsModal isOpen onClose={onClose} startGame={() => {}} />)
    const dialog = screen.getByRole("dialog", { name: "ui.settings" })
    expect(dialog.getAttribute("aria-modal")).toBe("true")
    fireEvent.keyDown(dialog, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("mounts the playtesting tools only while open in develop mode", async () => {
    const withDevelop = (isOpen: boolean, isDevelopMode: boolean) => (
      <DevelopContext.Provider value={{ isDevelopMode, setDevelopMode: () => {} }}>
        <SettingsModal isOpen={isOpen} onClose={() => {}} startGame={() => {}} />
      </DevelopContext.Provider>
    )
    const { rerender } = render(withDevelop(true, false))
    expect(screen.queryByTestId("puzzle-lab")).toBeNull()
    rerender(withDevelop(true, true))
    expect(await screen.findByTestId("puzzle-lab")).toBeTruthy()
    rerender(withDevelop(false, true))
    expect(screen.queryByTestId("puzzle-lab")).toBeNull()
  })
})

describe("the sound switches", () => {
  const switchNamed = (name: string) => screen.getByLabelText<HTMLInputElement>(name)
  afterEach(() => {
    sounds.registered = false
  })

  it("shows no Sound effects switch while no sound is registered", () => {
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(screen.queryByLabelText("ui.soundEffects")).toBeNull()
  })

  it("shows Music unchecked for a save without it", () => {
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(switchNamed("ui.music").checked).toBe(false)
  })

  it("writes music on when its switch is checked", () => {
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    fireEvent.click(switchNamed("ui.music"))
    expect(setterFor("music")).toHaveBeenCalledWith(true)
  })

  it("shows Sound effects checked for a save without it once a sound is registered", () => {
    sounds.registered = true
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(switchNamed("ui.soundEffects").checked).toBe(true)
  })

  it("writes sound effects off when its switch is cleared", () => {
    sounds.registered = true
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    fireEvent.click(switchNamed("ui.soundEffects"))
    expect(setterFor("soundEffects")).toHaveBeenCalledWith(false)
  })

  it("keeps both switches when game data is cleared", async () => {
    const reload = vi.fn()
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload })
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "ui.clearGameData" }))
    const confirm = screen.getAllByRole("button", { name: "ui.clearGameData" }).at(-1)!
    fireEvent.click(confirm)
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
    expect(setterFor("soundEffects")).toHaveBeenCalledWith(true)
    expect(setterFor("music")).toHaveBeenCalledWith(false)
    vi.restoreAllMocks()
  })
})

describe("the credits", () => {
  it("opens the credits list from its button", () => {
    render(<SettingsModal isOpen onClose={() => {}} startGame={() => {}} />)
    expect(screen.queryByText("credits.sounds")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "ui.credits" }))
    expect(screen.getByText("credits.sounds")).toBeTruthy()
  })
})
