import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { RevealMask } from "./RevealMask"
import { revealSweep } from "./revealSweep"

const mask = (progress: { found: number; required: number }, clipPath?: string) =>
  render(<RevealMask progress={progress} clipPath={clipPath} />).container.querySelector(
    "[data-reveal-mask]"
  ) as HTMLElement | null

// The gradient is asserted through revealSweep rather than the rendered style: jsdom's CSS parser
// doesn't understand conic-gradient and drops the declaration, so the DOM shows no background at all.
describe("revealSweep", () => {
  it("reveals the found fraction of a full turn", () => {
    expect(revealSweep({ found: 1, required: 4 })).toContain("transparent 0 0.25turn")
    expect(revealSweep({ found: 3, required: 4 })).toContain("transparent 0 0.75turn")
    expect(revealSweep({ found: 2, required: 3 })).toContain(`transparent 0 ${2 / 3}turn`)
  })

  it("masks the whole circle when nothing is found yet", () => {
    expect(revealSweep({ found: 0, required: 3 })).toContain("transparent 0 0turn")
  })

  it("masks from the same angle the reveal ends at, leaving no gap", () => {
    expect(revealSweep({ found: 1, required: 2 })).toBe(
      "conic-gradient(from 0deg, transparent 0 0.5turn, rgba(0,0,0,0.72) 0.5turn 1turn)"
    )
  })
})

describe("RevealMask", () => {
  it("renders nothing once the collectible is complete", () => {
    expect(mask({ found: 3, required: 3 })).toBeNull()
    // Over-collected (a spare piece) counts as complete too
    expect(mask({ found: 4, required: 3 })).toBeNull()
  })

  it("renders nothing for a collectible that requires nothing", () => {
    expect(mask({ found: 0, required: 0 })).toBeNull()
  })

  it("renders a mask while pieces are still missing", () => {
    expect(mask({ found: 1, required: 3 })).not.toBeNull()
  })

  it("follows the host's silhouette when given a clip-path", () => {
    const clip = "polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)"
    expect(mask({ found: 1, required: 3 }, clip)?.style.clipPath).toBe(clip)
  })

  it("never swallows taps meant for the host", () => {
    expect(mask({ found: 1, required: 3 })?.className).toContain("pointer-events-none")
  })
})
