import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"
import { lightbeamHintSteps } from "./lightbeamHint"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { generateLightbeamFor } from "./plugin"

// The real solve, counted. Deriving the hint steps IS the expensive thing, so the invariant below is about
// whether it is called at all rather than about how long a tap took.
vi.mock("./lightbeamHint", async importOriginal => {
  const actual = await importOriginal<typeof import("./lightbeamHint")>()
  return { ...actual, lightbeamHintSteps: vi.fn(actual.lightbeamHintSteps) }
})

const boardCells = () => screen.getAllByRole("button").filter(b => b.className.includes("aspect-square"))

// The shell scrolls the revealed hint into view, and jsdom does not implement that. Stubbed rather than guarded
// in the component: scrolling is real behaviour worth keeping, and this is the only place it is unavailable.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

describe("LightbeamPuzzle", () => {
  /**
   * **A tap must not cost a solve.**
   *
   * Found by playing, not by testing: rotating a mirror on a top-tier board was slow and stuttery. The hint was
   * derived eagerly as the board changed, and a hint is a full solve — tens of thousands of configurations on a
   * wizard board — so every tap paid for a string the player had not asked to read, and the idle nudge firing
   * paid for it again. Measured at the time: 185ms a tap eagerly against 19ms lazily.
   *
   * **Counted rather than timed.** This asserted a median tap under 80ms, which is a lottery on a shared CI
   * runner in jsdom — the same bound failed the eclipse family's copy of this test at 83ms. Whether the solve
   * ran at all is the actual invariant, and it is exact.
   */
  it("answers a tap without solving the board", { timeout: 300_000 }, () => {
    const solve = vi.mocked(lightbeamHintSteps)
    solve.mockClear()
    const puzzle = generateLightbeamFor("wizard", 1)
    render(<LightbeamPuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />)
    const cells = boardCells()
    expect(cells.length).toBeGreaterThan(0)

    for (let tap = 0; tap < 5; tap++) act(() => cells[tap % cells.length].click())
    expect(solve).not.toHaveBeenCalled()
  })

  /** And the hint still arrives when it is asked for, which is the thing laziness could have broken. */
  it("gives a hint when the button is pressed", { timeout: 300_000 }, () => {
    const solve = vi.mocked(lightbeamHintSteps)
    solve.mockClear()
    const puzzle = generateLightbeamFor("junior", 3)
    render(<LightbeamPuzzle puzzle={puzzle} difficulty="junior" onSolved={() => {}} onCancel={() => {}} />)
    // The shell's own hint control, as against anything on the board that mentions the word.
    const button = screen.getAllByRole("button").find(candidate => candidate.textContent?.includes("💡"))
    expect(button).toBeDefined()
    act(() => button!.click())
    // The hint text renders in its own panel below the board once revealed.
    const panel = document.querySelector("p.border-amber-800")
    expect(panel?.textContent?.length).toBeGreaterThan(0)
    // The other half of the invariant: asked for, the solve does run.
    expect(solve).toHaveBeenCalled()
  })
})
