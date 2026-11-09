// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { CompassSheet, type CompassSheetProps } from "./CompassSheet"

const props = (overrides: Partial<CompassSheetProps> = {}): CompassSheetProps => ({
  parts: { held: 1, total: 3 },
  partsLabel: "parts",
  pickHeading: "pick",
  onlyIncomplete: "only",
  glyphs: [
    { id: "owl", symbol: "O", progress: "1/3" },
    { id: "eye", symbol: "E", progress: "0/2" },
  ],
  picked: "owl",
  onPick: vi.fn(),
  whereHeading: "where",
  pickFirst: "pick first",
  nothingToFind: "nothing",
  noneInReach: "none in reach",
  rows: [
    { key: "a", label: "Thoth L1", access: "open" },
    { key: "b", label: "Karnak L2", access: "locked" },
  ],
  accessLabels: { open: "open", locked: "locked", hidden: "hidden", unknown: "unknown" },
  followLabel: "follow",
  followingLabel: "following",
  following: false,
  onFollow: vi.fn(),
  ...overrides,
})

describe("CompassSheet", () => {
  it("picks a sign by tapping it", () => {
    const onPick = vi.fn()
    render(<CompassSheet {...props({ onPick })} />)
    fireEvent.click(screen.getByRole("button", { name: /E/ }))
    expect(onPick).toHaveBeenCalledWith("eye")
  })

  it("lists where the picked sign lies, marking only what stands in the way", () => {
    render(<CompassSheet {...props()} />)
    expect(screen.getByText("Thoth L1")).toBeTruthy()
    expect(screen.getByLabelText("locked")).toBeTruthy()
    expect(screen.queryByLabelText("open")).toBeNull()
  })

  it("follows the picked sign, and says so once it does", () => {
    const onFollow = vi.fn()
    const { rerender } = render(<CompassSheet {...props({ onFollow })} />)
    fireEvent.click(screen.getByRole("button", { name: "follow" }))
    expect(onFollow).toHaveBeenCalled()
    rerender(<CompassSheet {...props({ following: true })} />)
    expect((screen.getByRole("button", { name: "following" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("asks for a sign before listing anything", () => {
    render(<CompassSheet {...props({ picked: null })} />)
    expect(screen.getByText("pick first")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "follow" })).toBeNull()
  })

  it("says when nothing is left to find", () => {
    render(<CompassSheet {...props({ glyphs: [] })} />)
    expect(screen.getByText("nothing")).toBeTruthy()
  })
})
