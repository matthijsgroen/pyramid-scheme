import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { RevealPlaceholder } from "./RevealPlaceholder"
import { revealMaskStyle } from "./revealMask"

const placeholder = (progress: { found: number; required: number }, clipPath?: string) =>
  render(<RevealPlaceholder progress={progress} clipPath={clipPath} />).container.querySelector(
    "[data-reveal-placeholder]"
  ) as HTMLElement | null

// The mask is asserted through revealMaskStyle rather than a rendered element: jsdom's CSS parser
// doesn't understand conic-gradient and drops the declaration, so it never reaches the DOM.
describe("revealMaskStyle", () => {
  it("keeps the collected fraction of a turn and masks the rest", () => {
    expect(revealMaskStyle({ found: 1, required: 4 })?.maskImage).toContain("#000 0 0.25turn")
    expect(revealMaskStyle({ found: 3, required: 4 })?.maskImage).toContain("#000 0 0.75turn")
    expect(revealMaskStyle({ found: 2, required: 3 })?.maskImage).toContain(`#000 0 ${2 / 3}turn`)
  })

  it("masks everything away when nothing is collected yet", () => {
    expect(revealMaskStyle({ found: 0, required: 3 })?.maskImage).toContain("#000 0 0turn")
  })

  it("hands the mask to webkit too, so the same sweep applies there", () => {
    const style = revealMaskStyle({ found: 1, required: 2 })
    expect(style?.WebkitMaskImage).toBe(style?.maskImage)
  })

  it("masks nothing once the collectible is whole", () => {
    expect(revealMaskStyle({ found: 3, required: 3 })).toBeUndefined()
    // Over-collected (a spare piece) counts as whole too
    expect(revealMaskStyle({ found: 4, required: 3 })).toBeUndefined()
    expect(revealMaskStyle({ found: 0, required: 0 })).toBeUndefined()
  })

  it("leaves no gap between the kept part and the masked part", () => {
    expect(revealMaskStyle({ found: 1, required: 2 })?.maskImage).toBe(
      "conic-gradient(from 0deg, #000 0 0.5turn, transparent 0.5turn 1turn)"
    )
  })
})

describe("RevealPlaceholder", () => {
  it("renders nothing once the collectible is complete", () => {
    expect(placeholder({ found: 3, required: 3 })).toBeNull()
    expect(placeholder({ found: 4, required: 3 })).toBeNull()
  })

  it("renders nothing for a collectible that requires nothing", () => {
    expect(placeholder({ found: 0, required: 0 })).toBeNull()
  })

  it("shows a dashed ring for a host with no silhouette of its own", () => {
    const ring = placeholder({ found: 1, required: 3 })
    expect(ring?.className).toContain("border-dashed")
    expect(ring?.style.clipPath).toBe("")
  })

  it("takes the host's silhouette when given one, as a faint fill rather than a ring", () => {
    const clip = "polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)"
    const ghost = placeholder({ found: 1, required: 3 }, clip)
    expect(ghost?.style.clipPath).toBe(clip)
    expect(ghost?.className).toContain("bg-current")
    expect(ghost?.className).not.toContain("border-dashed")
  })

  it("never swallows taps meant for the host", () => {
    expect(placeholder({ found: 1, required: 3 })?.className).toContain("pointer-events-none")
  })
})
