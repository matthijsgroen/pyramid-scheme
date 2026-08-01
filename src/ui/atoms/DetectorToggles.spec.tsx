import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"

// Identity i18n (the app's real i18n is never initialized in tests) — assertions target keys.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const { DetectorToggles } = await import("./DetectorToggles")

afterEach(cleanup)

const props = {
  activeDetector: null,
  compassLevel: 0,
  consumableDetectorLevel: 0,
  detectionLevel: 0,
  onSetDetector: () => {},
}

// These buttons sit inline among the other HUD widgets, so rendering nothing when there's nothing to
// show matters: an empty wrapper would still take space in that row.
describe("DetectorToggles visibility", () => {
  it("renders nothing until at least one detector is unlocked", () => {
    const { container } = render(<DetectorToggles {...props} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows only the unlocked detectors", () => {
    render(<DetectorToggles {...props} compassLevel={1} />)
    expect(screen.getByTitle("detector.compassTitle")).toBeTruthy()
    expect(screen.queryByTitle("detector.consumableTitle")).toBeNull()
    expect(screen.queryByTitle("detector.corridorTitle")).toBeNull()
  })

  it("shows all three when all are unlocked", () => {
    render(<DetectorToggles {...props} compassLevel={1} consumableDetectorLevel={2} detectionLevel={3} />)
    expect(screen.getByTitle("detector.compassTitle")).toBeTruthy()
    expect(screen.getByTitle("detector.consumableTitle")).toBeTruthy()
    expect(screen.getByTitle("detector.corridorTitle")).toBeTruthy()
  })
})

describe("DetectorToggles switching", () => {
  it("switches a mode on", () => {
    const onSetDetector = vi.fn()
    render(<DetectorToggles {...props} compassLevel={1} onSetDetector={onSetDetector} />)
    fireEvent.click(screen.getByTitle("detector.compassTitle"))
    expect(onSetDetector).toHaveBeenCalledWith("compass")
  })

  // Tapping the mode that's already on turns it off, rather than being a no-op.
  it("switches the active mode back off", () => {
    const onSetDetector = vi.fn()
    render(<DetectorToggles {...props} compassLevel={1} activeDetector="compass" onSetDetector={onSetDetector} />)
    fireEvent.click(screen.getByTitle("detector.compassTitle"))
    expect(onSetDetector).toHaveBeenCalledWith(null)
  })

  it("switches straight from one mode to another", () => {
    const onSetDetector = vi.fn()
    render(
      <DetectorToggles
        {...props}
        compassLevel={1}
        detectionLevel={1}
        activeDetector="compass"
        onSetDetector={onSetDetector}
      />
    )
    fireEvent.click(screen.getByTitle("detector.corridorTitle"))
    expect(onSetDetector).toHaveBeenCalledWith("hiddenPassageway")
  })
})
