import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { DetectorButton } from "./DetectorButton"

afterEach(cleanup)

const base = { title: "Detector", onToggle: vi.fn() }

describe("DetectorButton", () => {
  it("shows a plain lens while no detector is running", () => {
    render(<DetectorButton {...base} activeDetector={null} readoutOpen={false} />)
    expect(screen.getByRole("button").textContent).toBe("🔍")
  })

  // The point of folding three buttons into one: the row must still say which detector is reading,
  // otherwise compacting the HUD costs the player the information those buttons carried.
  it("wears the running detector's own icon", () => {
    render(<DetectorButton {...base} activeDetector="hiddenPassageway" readoutOpen={false} />)
    expect(screen.getByRole("button").textContent).toBe("👁")

    cleanup()
    render(<DetectorButton {...base} activeDetector="compass" readoutOpen={false} />)
    expect(screen.getByRole("button").textContent).toBe("🧭")
  })

  // The readout being open is what the button reports — a detector keeps running once shut, so
  // aria-expanded tracks the panel and not the detector.
  it("reports whether the readout is open, not whether a detector runs", () => {
    const { rerender } = render(<DetectorButton {...base} activeDetector="compass" readoutOpen={false} />)
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false")

    rerender(<DetectorButton {...base} activeDetector="compass" readoutOpen />)
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true")
  })

  it("shows the reading beside it, named for anyone who cannot time a pulse", () => {
    render(
      <DetectorButton
        {...base}
        activeDetector="hiddenPassageway"
        readoutOpen={false}
        band="near"
        bandLabel="close by"
      />
    )
    expect(screen.getByLabelText("close by")).toBeTruthy()
  })

  it("shows no dot when the running detector has nothing to report", () => {
    render(<DetectorButton {...base} activeDetector="compass" readoutOpen={false} band="none" bandLabel="nothing" />)
    expect(screen.queryByLabelText("nothing")).toBeNull()
  })

  it("reports a tap so the screen can open or close the readout", () => {
    const onToggle = vi.fn()
    render(<DetectorButton {...base} onToggle={onToggle} activeDetector={null} readoutOpen={false} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
