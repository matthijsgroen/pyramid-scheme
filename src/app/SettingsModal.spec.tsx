import { render, cleanup, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"

// `language` stands in for i18n's own current language, so a test can move it the way
// changeLanguage would and then re-render — which is what react-i18next does for real.
let language = "en"
const changeLanguage = vi.fn((next: string) => {
  language = next
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language, changeLanguage } }),
}))

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: () => [true, vi.fn()],
  clearGameData: vi.fn(),
}))

const { SettingsModal } = await import("./SettingsModal")

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
