import { describe, expect, it } from "vitest"
import { meanOpaque, measureRank, solveFaceNight, verdict, type RankInput } from "./rankColour"

const input: RankInput = {
  floorArt: [150, 130, 110],
  faceArt: [140, 120, 100],
  night: [20, 15, 10],
  nightAlpha: 0.2,
  faceNight: 0,
  seatingPass: 0.45,
  accent: [200, 60, 40],
  prop: [190, 100, 50],
  markerFill: [255, 215, 102],
  markerOutline: [22, 16, 9],
}

describe("measureRank", () => {
  it("darkens the floor as the night thickens", () => {
    expect(measureRank({ ...input, nightAlpha: 0.6 }).floor.L).toBeLessThan(measureRank(input).floor.L)
  })

  it("takes the better of the marker's fill and ring", () => {
    const pale = measureRank({ ...input, floorArt: [240, 235, 225] })
    const dark = measureRank({ ...input, floorArt: [30, 28, 25] })
    expect(pale.marker).toBeGreaterThan(3)
    expect(dark.marker).toBeGreaterThan(3)
  })

  it("solves the face night to the requested step", () => {
    const faceNight = solveFaceNight(input, 7.5)
    expect(measureRank({ ...input, faceNight }).faceStep).toBeCloseTo(7.5, 0)
  })

  it("asks for no face night when the art already steps far enough", () => {
    expect(solveFaceNight({ ...input, faceArt: [60, 50, 40] }, 7.5)).toBe(0)
  })
})

describe("verdict", () => {
  it("passes a rank measured against itself on the bar's own checks", () => {
    const report = measureRank(input)
    const v = verdict(report, report)
    expect(v.metalChroma).toBe(true)
    expect(v.groundToMetal).toBe(true)
  })

  it("fails a rank whose metal is greyer than the bar's", () => {
    const bar = measureRank(input)
    const grey = measureRank({ ...input, accent: [120, 115, 110] })
    expect(verdict(grey, bar).metalChroma).toBe(false)
  })
})

describe("meanOpaque", () => {
  it("ignores transparent pixels", () => {
    const raw = new Uint8Array([200, 100, 50, 255, 0, 0, 0, 0])
    expect(meanOpaque(raw, 4)).toEqual([200, 100, 50])
  })
})
