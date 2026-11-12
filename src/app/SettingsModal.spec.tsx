// @vitest-environment jsdom
import { render, cleanup, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"

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

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: () => [true, vi.fn(), true],
  clearGameData: vi.fn(),
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

const selectIn = (container: HTMLElement) => container.querySelector<HTMLSelectElement>("#language-select")!

afterEach(() => {
  cleanup()
  language = "en"
  changeLanguage.mockClear()
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
