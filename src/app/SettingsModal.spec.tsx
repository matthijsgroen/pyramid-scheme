// @vitest-environment jsdom
import { render, cleanup, fireEvent } from "@testing-library/react"
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

// What the store holds, per key, for one test. `journeys` is read for the save version in the footer.
let stored: { journeys?: unknown[]; loaded?: boolean } = {}

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: (key: string) =>
    key === "journeys" ? [stored.journeys ?? [], vi.fn(), stored.loaded ?? true] : [true, vi.fn(), true],
  clearGameData: vi.fn(),
}))

const { SettingsModal } = await import("./SettingsModal")

const selectIn = (container: HTMLElement) => container.querySelector<HTMLSelectElement>("#language-select")!

afterEach(() => {
  cleanup()
  language = "en"
  stored = {}
  changeLanguage.mockClear()
})

// Characterisation, not regression: these also pass against the version that mirrored the language
// into local state, since after effects flush the two agree. What they pin is that the select always
// reports i18n's language — which is what stops a copy being reintroduced and drifting from it.
describe("SettingsModal language selection", () => {
  it("shows the language i18n is actually using, not a copy made when it mounted", () => {
    language = "nl"
    const { container } = render(<SettingsModal isOpen onClose={() => {}} />)
    expect(selectIn(container).value).toBe("nl")
  })

  it("hands the choice to i18n and reads the result back on the next render", () => {
    const { container, rerender } = render(<SettingsModal isOpen onClose={() => {}} />)
    expect(selectIn(container).value).toBe("en")

    fireEvent.change(selectIn(container), { target: { value: "nl" } })
    expect(changeLanguage).toHaveBeenCalledWith("nl")

    // No local copy to keep in step: the next render simply reflects i18n's new language.
    rerender(<SettingsModal isOpen onClose={() => {}} />)
    expect(selectIn(container).value).toBe("nl")
  })
})

// ── the save version in the footer ────────────────────────────────────────────

// A player can read this out, so "has your save been migrated yet?" is answered with a number rather
// than a guess — which is what the reshape release's full reset turns on.
describe("the save version beside the app version", () => {
  const footerOf = (container: HTMLElement) => container.textContent ?? ""

  it("shows the current version when there is nothing stored to migrate", () => {
    const { container } = render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(footerOf(container)).toContain("ui.saveVersion 3")
  })

  it("shows the lowest version across the saves, because one left behind is the one that matters", () => {
    stored = { journeys: [{ cellKeyVersion: 3 }, { cellKeyVersion: 2 }, { cellKeyVersion: 3 }] }

    const { container } = render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(footerOf(container)).toContain("ui.saveVersion 2")
  })

  it("reads an unstamped save as 0, so a save that never migrated says so", () => {
    stored = { journeys: [{ cellKeyVersion: 3 }, {}] }

    const { container } = render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(footerOf(container)).toContain("ui.saveVersion 0")
  })

  // An unloaded store looks exactly like no journeys at all, which would tell a player whose save is
  // behind that they are current — the one wrong answer this must never give.
  it("says nothing until storage has actually been read", () => {
    stored = { journeys: [{ cellKeyVersion: 0 }], loaded: false }

    const { container } = render(<SettingsModal isOpen onClose={vi.fn()} />)

    expect(footerOf(container)).not.toContain("ui.saveVersion")
    expect(footerOf(container)).toContain("ui.footer")
  })
})
