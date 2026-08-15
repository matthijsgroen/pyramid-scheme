import { describe, expect, it } from "vitest"
import { bandFromHits, corridorBand } from "./detectorProximity"

const hit = (onThisFloor: boolean, nearby: boolean) => ({ onThisFloor, nearby })

describe("bandFromHits — precision the level actually grants", () => {
  it("reports nothing when the detector is not owned, whatever the hits say", () => {
    expect(bandFromHits(0, [hit(true, true)])).toBe("none")
  })

  it("reports nothing when there are no hits", () => {
    expect(bandFromHits(3, [])).toBe("none")
  })

  // The whole point of the ladder (§7.2): at L1 the compass knows only WHICH PYRAMID holds a hit, so
  // a hit two steps away must still read "pyramid". Feeding raw distance to the dot would hand the
  // player L3 precision at L1.
  it("caps at pyramid on L1 even when the hit is underfoot", () => {
    expect(bandFromHits(1, [hit(true, true)])).toBe("pyramid")
  })

  it("adds the floor at L2, but still not the cell", () => {
    expect(bandFromHits(2, [hit(true, true)])).toBe("floor")
    expect(bandFromHits(2, [hit(false, false)])).toBe("pyramid")
  })

  it("adds close-by at L3", () => {
    expect(bandFromHits(3, [hit(true, true)])).toBe("near")
    expect(bandFromHits(3, [hit(true, false)])).toBe("floor")
    expect(bandFromHits(3, [hit(false, false)])).toBe("pyramid")
  })

  it("takes the closest hit when several are in play", () => {
    expect(bandFromHits(3, [hit(false, false), hit(true, true), hit(true, false)])).toBe("near")
    expect(bandFromHits(3, [hit(false, false), hit(true, false)])).toBe("floor")
  })

  it("honours a detector whose levels reveal floors and cells at other steps", () => {
    // A detector that only ever learns the floor, never the cell.
    expect(bandFromHits(9, [hit(true, true)], { cellsAt: Infinity })).toBe("floor")
  })
})

describe("corridorBand", () => {
  it("reports nothing when the detector is not owned", () => {
    expect(corridorBand(0, { nearby: true, onThisFloor: true, onOtherFloor: true })).toBe("none")
  })

  // Proximity is what L1 buys, so it reads at L1 — unlike the compass, whose L1 is pyramid-wide.
  it("reads close-by from L1", () => {
    expect(corridorBand(1, { nearby: true, onThisFloor: true, onOtherFloor: false })).toBe("near")
  })

  it("keeps this floor to L2 and up", () => {
    expect(corridorBand(1, { nearby: false, onThisFloor: true, onOtherFloor: false })).toBe("none")
    expect(corridorBand(2, { nearby: false, onThisFloor: true, onOtherFloor: false })).toBe("floor")
  })

  it("keeps other floors to L3 and up", () => {
    expect(corridorBand(2, { nearby: false, onThisFloor: false, onOtherFloor: true })).toBe("none")
    expect(corridorBand(3, { nearby: false, onThisFloor: false, onOtherFloor: true })).toBe("pyramid")
  })

  it("reports nothing when every scope it can see is clear", () => {
    expect(corridorBand(4, { nearby: false, onThisFloor: false, onOtherFloor: false })).toBe("none")
  })
})
