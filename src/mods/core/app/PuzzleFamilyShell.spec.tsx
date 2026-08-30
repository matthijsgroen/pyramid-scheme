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
    // The controls stay where they were — dropping them out of the flow jumped the page — but `inert`
    // takes them out of reach of a tap and the keyboard.
    expect(screen.getByText("ui.resetPuzzle").closest("[inert]")).not.toBeNull()
    expect(screen.getByText(/ui.hint/).closest("[inert]")).not.toBeNull()
  })

  /**
   * **Two slots under the board, and only ever two.** They were briefly five — undo, erase, notes, reset,
   * hint — and that read as a toolbar: equal-weight buttons, two of which silently re-aimed the keypad
   * above them. Notes and erase went back to the pads; reset went up with the way out.
   */
  it("puts undo and hint under the board, and reset up with the way back", () => {
    render(
      <PuzzleFamilyShell
        onSolved={() => {}}
        onCancel={() => {}}
        onReset={() => {}}
        hint="do this"
        undo={{ onPress: () => {}, enabled: true }}
      >
        {() => <button>cell</button>}
      </PuzzleFamilyShell>
    )
    const board = screen.getByText("cell")
    const under = (name: RegExp) => {
      const button = screen.getByRole("button", { name })
      return board.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
    }
    expect(under(/ui.undo/)).toBeTruthy()
    expect(under(/ui.hint/)).toBeTruthy()
    // Reset throws the whole board away, so it keeps company with the way out rather than with the
    // controls a thumb is working — and out of that thumb's reach.
    expect(under(/ui.resetPuzzle/)).toBeFalsy()
  })

  /**
   * Presence and reach are separate: a family that has undo has it for the whole board, so an empty
   * history dims the button where dropping it would reshuffle the row under a thumb.
   */
  it("dims a declared control that cannot be pressed rather than removing it", () => {
    render(
      <PuzzleFamilyShell onSolved={() => {}} onCancel={() => {}} undo={{ onPress: () => {}, enabled: false }}>
        {() => <button>cell</button>}
      </PuzzleFamilyShell>
    )
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /ui.undo/ }).disabled).toBe(true)
  })

  /**
   * **A board being undone is a board being played.** Canisters' undo skipped this, so the idle nudge
   * kept counting down through a run of them — wiring it in the shell is what makes it unforgettable.
   */
  it("counts a control press as input, so the idle nudge restarts", () => {
    vi.useFakeTimers()
    try {
      render(
        <PuzzleFamilyShell
          onSolved={() => {}}
          onCancel={() => {}}
          hint="do this"
          idleMs={1000}
          undo={{ onPress: () => {}, enabled: true }}
        >
          {() => <button>cell</button>}
        </PuzzleFamilyShell>
      )
      // The pulse is `motion-safe:`-prefixed, so it is a class name to read rather than a selector to match.
      const nudging = () => screen.getByRole("button", { name: /ui.hint/ }).className.includes("animate-pulse")
      act(() => vi.advanceTimersByTime(1000))
      expect(nudging()).toBe(true)
      fireEvent.click(screen.getByRole("button", { name: /ui.undo/ }))
      expect(nudging()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
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
