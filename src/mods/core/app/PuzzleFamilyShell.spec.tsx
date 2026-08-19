import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PuzzleFamilyShell } from "./PuzzleFamilyShell"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const renderShell = (solved: boolean, onSolved: () => void = () => {}) =>
  render(
    <PuzzleFamilyShell onSolved={onSolved} onCancel={() => {}} solved={solved} onReset={() => {}} hint="do this">
      {() => <button>cell</button>}
    </PuzzleFamilyShell>
  )

describe("PuzzleFamilyShell", () => {
  afterEach(cleanup)

  it("leaves the board playable while it is unsolved", () => {
    renderShell(false)
    expect(screen.getByText("cell").closest("[inert]")).toBeNull()
    expect(screen.getByText("ui.resetPuzzle")).toBeTruthy()
  })

  it("freezes the board the moment it is solved, not when the banner lands", () => {
    // The pause before the banner is long enough to tap a cell, and a tap there used to un-solve the
    // puzzle while the win was already scheduled.
    renderShell(true)
    expect(screen.getByText("cell").closest("[inert]")).not.toBeNull()
    expect(screen.queryByText("ui.resetPuzzle")).toBeNull()
    expect(screen.queryByText(/ui.hint/)).toBeNull()
  })

  /** The solved board is the reward: it stays on screen, behind a light dim, until the player is done with it. */
  it("waits for a tap to leave the solved board rather than a timer", () => {
    vi.useFakeTimers()
    try {
      const onSolved = vi.fn()
      renderShell(true, onSolved)
      act(() => vi.advanceTimersByTime(5000))
      expect(screen.getByText("ui.puzzleCompleted")).toBeTruthy()
      expect(onSolved).not.toHaveBeenCalled()
      // The clock stops at the solve, not at the banner, so the 800ms wait is not part of it.
      expect(screen.getByText("⏱ 0s")).toBeTruthy()

      fireEvent.click(screen.getByText("ui.tapToContinue"))
      expect(onSolved).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
