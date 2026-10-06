// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import { CHAR_H, CHAR_W } from "./ExplorerDot"
import { cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"
import type { RidePose } from "./ridePoses"
import { ZiplineRider } from "./ZiplineRider"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})

const ride = (over: Partial<Ride> = {}): Ride => ({
  traversal: { kind: "zipline", from: [0, 0], to: [0, 6], dir: "e" },
  sprite: "e.png",
  mirrored: false,
  ms: 540,
  end: vi.fn(),
  ...over,
})

const POSES: Record<"e" | "n" | "s", RidePose> = {
  e: { from: { x: 7, y: -31 }, to: { x: -13, y: -17 }, scale: 1.25 },
  n: { from: { x: 1, y: -2 }, to: { x: 3, y: -4 }, scale: 0.5 },
  s: { from: { x: 5, y: -6 }, to: { x: 8, y: -9 }, scale: 0.75 },
}

const px = (v: string) => Number.parseFloat(v)
const riderOf = (c: HTMLElement) => c.querySelector("[data-zipline-rider]") as HTMLElement

describe("ZiplineRider", () => {
  it("starts at the launch centre plus the pose's from and ends at the landing centre plus its to", async () => {
    const { container } = render(<ZiplineRider ride={ride()} poses={POSES} />)
    const rider = riderOf(container)
    const a = cellCenter(0, 0)
    const b = cellCenter(0, 6)
    expect(px(rider.style.left)).toBe(a.cx + 7)
    expect(px(rider.style.top)).toBe(a.cy - 31)
    await act(async () => new Promise(requestAnimationFrame))
    expect(px(rider.style.left)).toBe(b.cx - 13)
    expect(px(rider.style.top)).toBe(b.cy - 17)
  })

  it("negates both x values riding west", async () => {
    const west = ride({ mirrored: true, traversal: { kind: "zipline", from: [0, 6], to: [0, 0], dir: "w" } })
    const { container } = render(<ZiplineRider ride={west} poses={POSES} />)
    const rider = riderOf(container)
    expect(px(rider.style.left)).toBe(cellCenter(0, 6).cx - 7)
    await act(async () => new Promise(requestAnimationFrame))
    expect(px(rider.style.left)).toBe(cellCenter(0, 0).cx + 13)
  })

  it("scales the sprite box and hangs its top at the handle", () => {
    const { container } = render(<ZiplineRider ride={ride()} poses={POSES} />)
    const box = container.querySelector("[data-zipline-sprite]") as HTMLElement
    expect(px(box.style.width)).toBe(CHAR_W * 1.25)
    expect(px(box.style.height)).toBe(CHAR_H * 1.25)
    expect(px(box.style.top)).toBe(0)
  })

  it("ends the ride when the slide ends", () => {
    const r = ride()
    const { container } = render(<ZiplineRider ride={r} />)
    fireEvent.transitionEnd(riderOf(container))
    expect(r.end).toHaveBeenCalledTimes(1)
  })

  it("ignores a transition that bubbles up from inside the rider", () => {
    const r = ride()
    const { container } = render(<ZiplineRider ride={r} />)
    fireEvent.transitionEnd(container.querySelector("img")!)
    expect(r.end).not.toHaveBeenCalled()
  })

  it("does not end the ride on StrictMode's simulated unmount", () => {
    const r = ride()
    render(
      <StrictMode>
        <ZiplineRider ride={r} />
      </StrictMode>
    )
    expect(r.end).not.toHaveBeenCalled()
  })

  it("mirrors the sprite, never the light, riding west", () => {
    const { container } = render(<ZiplineRider ride={ride({ mirrored: true })} />)
    expect((container.querySelector("[data-zipline-sprite]") as HTMLElement).style.transform).toContain("scaleX(-1)")
  })
})

describe("ZiplineRider on the map", () => {
  // A drop running down the page sorts after a rider still filed at the launch; the rider hangs from its
  // cable, so the art must come first in the DOM, which is the drawing order.
  it("draws the zipline art behind the rider, on a ride down the page", async () => {
    const { AXES, addressed, dropGrid } = await import("./floorFixtures.testing")
    const { oneWayRunCells } = await import("@/game/siteAssembler")
    const { SiteMapView } = await import("./SiteMapView")
    const axis = AXES.find(a => a.travel === "s")!
    const { grid, at, dropAt } = dropGrid(axis, "room", "room", "visible", "fromNode", oneWayRunCells("s"))
    const launch = at(dropAt.launch)
    const landing = at(dropAt.landing)
    const southRide = ride({ traversal: { kind: "zipline", from: launch, to: landing, dir: "s" } })
    const { container } = render(
      <SiteMapView
        grid={addressed({ ...grid, difficulty: "expert" })}
        explorerPos={launch}
        explorerHidden
        ride={southRide}
      />
    )
    const drop = container.querySelector('[data-node-sprite^="drop:"]')
    const rider = container.querySelector("[data-zipline-rider]")
    expect(drop).not.toBeNull()
    expect(rider).not.toBeNull()
    expect(drop!.compareDocumentPosition(rider!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
