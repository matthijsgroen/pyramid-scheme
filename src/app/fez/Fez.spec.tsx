// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

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
