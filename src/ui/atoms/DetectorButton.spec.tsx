import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { DetectorButton } from "./DetectorButton"

afterEach(cleanup)

describe("DetectorButton", () => {
  it("shows a plain lens while the readout is closed", () => {
    render(<DetectorButton activeDetector={null} title="Detector" onToggle={vi.fn()} />)
    expect(screen.getByRole("button").textContent).toBe("🔍")
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false")
  })

  // The point of folding three buttons into one: the row must still say which detector is reading,
  // otherwise compacting the HUD costs the player the information those buttons carried.
  it("wears the running mode's own icon while open", () => {
    render(<DetectorButton activeDetector="hiddenPassageway" title="Detector" onToggle={vi.fn()} />)
    expect(screen.getByRole("button").textContent).toBe("👁")
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true")

    cleanup()
    render(<DetectorButton activeDetector="compass" title="Detector" onToggle={vi.fn()} />)
    expect(screen.getByRole("button").textContent).toBe("🧭")
  })

  it("reports a tap so the screen can open or close the readout", () => {
    const onToggle = vi.fn()
    render(<DetectorButton activeDetector={null} title="Detector" onToggle={onToggle} />)
    fireEvent.click(screen.getByRole("button"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
