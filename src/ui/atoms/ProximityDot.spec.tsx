import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { ProximityDot } from "./ProximityDot"
import { PULSE_SECONDS } from "@/app/SiteMap/detectorProximity"

afterEach(cleanup)

describe("ProximityDot", () => {
  it("draws nothing when there is nothing to report", () => {
    const { container } = render(<ProximityDot band="none" label="nothing" />)
    expect(container.firstChild).toBeNull()
  })

  // Pulse rate is the reading, so the rates must actually differ and get faster as it closes —
  // otherwise the dot carries no information at all.
  it("pulses faster the closer the reading is", () => {
    expect(PULSE_SECONDS.pyramid).toBeGreaterThan(PULSE_SECONDS.floor)
    expect(PULSE_SECONDS.floor).toBeGreaterThan(PULSE_SECONDS.near)
  })

  // Size backs up the rate: a fast tiny dot and a fast big one should not read the same.
  it("grows as the reading closes in", () => {
    const size = (band: "pyramid" | "floor" | "near") => {
      const { container } = render(<ProximityDot band={band} label={band} />)
      const cls = (container.firstChild as HTMLElement).className
      return Number(cls.match(/size-(\d+)/)?.[1])
    }
    expect(size("pyramid")).toBeLessThan(size("floor"))
    expect(size("floor")).toBeLessThan(size("near"))
  })

  it("sets its own pulse duration from the band", () => {
    const { container } = render(<ProximityDot band="floor" label="on this floor" />)
    const pulse = container.querySelector<HTMLElement>(".animate-pulse")
    expect(pulse?.style.animationDuration).toBe(`${PULSE_SECONDS.floor}s`)
  })

  // A pulse rate is useless to a screen reader, and hard to judge for anyone who cannot compare a
  // 0.5s cycle against a 1.2s one — so the reading is named too.
  it("names the reading rather than relying on the rate alone", () => {
    render(<ProximityDot band="near" label="close by" />)
    expect(screen.getByLabelText("close by")).toBeTruthy()
  })
})
