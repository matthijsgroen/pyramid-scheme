// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Credit } from "./audioCredits"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const credits = vi.hoisted(() => ({ list: [] as Credit[] }))
vi.mock("./audioCredits", () => ({ audioCredits: () => credits.list }))

const { CreditsPanel } = await import("./CreditsPanel")

const madeUp: Credit = {
  file: "music-made-up",
  title: "Made-up Tune",
  author: "Somebody",
  source: "https://example.com/tune",
  licence: "Some Licence",
  licenceUrl: "https://example.com/licence",
}

describe("CreditsPanel", () => {
  it("says no sound is credited when no file is credited", () => {
    credits.list = []
    render(<CreditsPanel />)
    expect(screen.getByText("credits.none")).toBeTruthy()
  })

  it("lists each credited sound with its author, and links its source and licence in a new tab", () => {
    credits.list = [madeUp]
    render(<CreditsPanel />)
    expect(screen.getByText("Made-up Tune")).toBeTruthy()
    expect(screen.getByText(/Somebody/)).toBeTruthy()
    const links = screen.getAllByRole("link").map(link => [link.getAttribute("href"), link.getAttribute("target")])
    expect(links).toEqual([
      ["https://example.com/tune", "_blank"],
      ["https://example.com/licence", "_blank"],
    ])
  })
})
