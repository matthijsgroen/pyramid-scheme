// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"

// A two-hander whose FIRST line is the explorer's — the case the portrait got wrong.
const WRITTEN = new Set(["arrival.starter_1.1.explorer", "arrival.starter_1.2.fez"])

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: (key: string) => WRITTEN.has(key) },
  }),
}))

const { Fez } = await import("./Fez")

describe("who slides in", () => {
  it("is whoever speaks first, before any line is showing", () => {
    // The portrait animates in ahead of the first bubble. Reading the line at index 0 fell off the
    // start of the list and defaulted to Fez, so he appeared with an empty bubble and vanished as
    // the explorer arrived on the other side of the screen.
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    expect(screen.getByRole("img").getAttribute("alt")).toMatch(/explorer/i)
  })

  it("says nothing until there is something to say", () => {
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    // The bubble exists for the animation but is transparent until a line is current.
    expect(document.querySelector(".opacity-0")).toBeTruthy()
  })
})

describe("facing", () => {
  it("mirrors the explorer on the right, so he faces the speaker on the left", () => {
    render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)

    expect(screen.getByRole("img").classList).toContain("-scale-x-100")
  })

  it("draws Fez as painted, already facing right from the left side", () => {
    render(<Fez conversation="levelCompleted" onComplete={() => {}} />)

    expect(screen.getByRole("img").classList).not.toContain("-scale-x-100")
  })

  it("swaps in a new portrait when the speaker changes, so the mirroring never animates", () => {
    vi.useFakeTimers()
    const { container } = render(<Fez conversation="arrival.starter_1" onComplete={() => {}} />)
    for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(100))
    const explorer = screen.getByRole("img")

    fireEvent.click(container.firstElementChild as HTMLElement)
    for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(100))
    vi.useRealTimers()

    expect(screen.getByRole("img").getAttribute("alt")).not.toMatch(/explorer/i)
    expect(explorer.isConnected).toBe(false)
  })
})

describe("where the conversation stands", () => {
  it.each(["arrival.starter_1", "levelCompleted"])(
    "puts %s in the centred column the game's panels share, not in the screen's corners",
    conversation => {
      render(<Fez conversation={conversation} onComplete={() => {}} />)

      const column = screen.getByRole("img").closest(".max-w-md")
      expect(column?.classList).toContain("mx-auto")
    }
  )
})
