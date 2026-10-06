// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"
import { ZiplineRider } from "./ZiplineRider"

const ride = (over: Partial<Ride> = {}): Ride => ({
  traversal: { kind: "zipline", from: [0, 0], to: [0, 6], dir: "e" },
  sprite: "e.png",
  mirrored: false,
  ms: 540,
  end: vi.fn(),
  ...over,
})

describe("ZiplineRider", () => {
  it("starts at the launch and slides to the landing", async () => {
    const { container } = render(<ZiplineRider ride={ride()} />)
    const rider = container.querySelector("[data-zipline-rider]") as HTMLElement
    expect(rider.style.left).toBe(`${cellCenter(0, 0).cx}px`)
    await act(async () => new Promise(requestAnimationFrame))
    expect(rider.style.left).toBe(`${cellCenter(0, 6).cx}px`)
  })

  it("ends the ride when the slide ends", () => {
    const r = ride()
    const { container } = render(<ZiplineRider ride={r} />)
    fireEvent.transitionEnd(container.querySelector("[data-zipline-rider]")!)
    expect(r.end).toHaveBeenCalledTimes(1)
  })

  it("ends the ride if it is taken off the map mid-slide", () => {
    const r = ride()
    render(<ZiplineRider ride={r} />).unmount()
    expect(r.end).toHaveBeenCalled()
  })

  it("mirrors the sprite, never the light, riding west", () => {
    const { container } = render(<ZiplineRider ride={ride({ mirrored: true })} />)
    expect((container.querySelector("img")!.parentElement as HTMLElement).style.transform).toContain("scaleX(-1)")
  })
})
