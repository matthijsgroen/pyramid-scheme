import { beforeAll, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"
import { LightbeamPuzzle } from "./LightbeamPuzzle"
import { generateLightbeamFor } from "./plugin"

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
   * paid for it again.
   *
   * Measured at the time: 185ms a tap eagerly against 19ms lazily. The bound here is generous because this runs
   * in jsdom on whatever machine CI gives us; what it guards is the order of magnitude, which is the difference
   * between a board that answers a tap and one that thinks about it.
   */
  it("answers a tap without solving the board", { timeout: 300_000 }, () => {
    const puzzle = generateLightbeamFor("wizard", 1)
    render(<LightbeamPuzzle puzzle={puzzle} difficulty="wizard" onSolved={() => {}} onCancel={() => {}} />)
    const cells = boardCells()
    expect(cells.length).toBeGreaterThan(0)

    const taps: number[] = []
    for (let tap = 0; tap < 5; tap++) {
      const started = performance.now()
      act(() => cells[tap % cells.length].click())
      taps.push(performance.now() - started)
    }
    const median = [...taps].sort((a, b) => a - b)[2]
    expect(median).toBeLessThan(80)
  })

  /** And the hint still arrives when it is asked for, which is the thing laziness could have broken. */
  it("gives a hint when the button is pressed", { timeout: 300_000 }, () => {
    const puzzle = generateLightbeamFor("junior", 3)
    render(<LightbeamPuzzle puzzle={puzzle} difficulty="junior" onSolved={() => {}} onCancel={() => {}} />)
    // The shell's own hint control, as against anything on the board that mentions the word.
    const button = screen.getAllByRole("button").find(candidate => candidate.textContent?.includes("💡"))
    expect(button).toBeDefined()
    act(() => button!.click())
    // The hint text renders in its own panel below the board once revealed.
    const panel = document.querySelector("p.border-amber-800")
    expect(panel?.textContent?.length).toBeGreaterThan(0)
  })
})
