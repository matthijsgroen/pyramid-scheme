// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const changeLanguage = vi.fn()
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage, exists: () => true },
  }),
}))

const { WelcomeLanguageChip } = await import("./WelcomeLanguageChip")
const { FezContext } = await import("@/app/fez/context")
const { Fez } = await import("@/app/fez/Fez")

const during = (conversation?: string) =>
  render(
    <FezContext.Provider value={{ showConversation: () => {}, speaking: conversation !== undefined, conversation }}>
      <WelcomeLanguageChip />
    </FezContext.Provider>
  )

afterEach(() => {
  cleanup()
  changeLanguage.mockClear()
})

describe("WelcomeLanguageChip", () => {
  it("shows the current language while the welcome plays", () => {
    during("welcome")
    expect(screen.getByRole("combobox", { name: "ui.language" })).toBeTruthy()
    expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("en")
  })

  it("is gone once the welcome is over", () => {
    during(undefined)
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("is not shown in any other conversation", () => {
    during("levelCompleted")
    expect(screen.queryByRole("combobox")).toBeNull()
  })

  it("switches the language when one is chosen", () => {
    during("welcome")
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fy" } })
    expect(changeLanguage).toHaveBeenCalledWith("fy")
  })
})

describe("beside the welcome", () => {
  it("takes a click without moving the conversation on", () => {
    vi.useFakeTimers()
    const settle = () => {
      for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(100))
    }
    render(
      <>
        <Fez conversation="welcome" onComplete={() => {}} />
        <FezContext.Provider value={{ showConversation: () => {}, speaking: true, conversation: "welcome" }}>
          <WelcomeLanguageChip />
        </FezContext.Provider>
      </>
    )
    settle()
    expect(screen.getByText("welcome")).toBeTruthy()

    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fy" } })
    settle()
    vi.useRealTimers()

    expect(screen.getByText("welcome")).toBeTruthy()
    expect(screen.queryByText("welcome2")).toBeNull()
  })
})
