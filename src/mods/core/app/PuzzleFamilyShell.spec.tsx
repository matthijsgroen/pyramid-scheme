import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PuzzleFamilyShell } from "./PuzzleFamilyShell"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const renderShell = (solved: boolean) =>
  render(
    <PuzzleFamilyShell onSolved={() => {}} onCancel={() => {}} solved={solved} onReset={() => {}} hint="do this">
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
})
