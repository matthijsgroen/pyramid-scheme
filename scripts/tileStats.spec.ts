import { describe, expect, it } from "vitest"
import type { TierPalette } from "../src/app/SiteMap/tileMaterials"
import { detailStep, isLightFloor, lightestOf, objectStep } from "./tileStats"
import { MIN_STEP } from "./rankColour"

const pale: TierPalette = {
  bed: "#c0b090",
  slab: "#d0c0a0",
  slabHi: "#e0d0b0",
  slabLo: "#c4b494",
  joint: "#807050",
  accent: "#a04030",
  wall: "#b09070",
  wallTop: "#e8dcc0",
  wallBase: "#403020",
  shade: "rgba(20,16,12,0.3)",
  faceNight: 0.5,
  lamp: 0.3,
  prop: "#a09080",
  propDark: "#605040",
  outline: "#141010",
}

const dusk: TierPalette = { ...pale, slab: "#605850", slabHi: "#686058", wallTop: "#5c564c", prop: "#d8b060" }

describe("isLightFloor", () => {
  it("reads a pale slab under a light night as a light floor", () => {
    expect(isLightFloor(pale)).toBe(true)
  })

  it("reads a dark slab as a dark floor", () => {
    expect(isLightFloor(dusk)).toBe(false)
  })

  it("reads a pale slab under a heavy night as a dark floor", () => {
    expect(isLightFloor({ ...pale, shade: "rgba(20,16,12,0.7)" })).toBe(false)
  })
})

describe("objectStep", () => {
  it("passes a deep terracotta object on a light floor", () => {
    expect(objectStep(pale, [110, 70, 50])).toBeGreaterThanOrEqual(MIN_STEP)
  })

  it("fails a whitewashed object on a light floor", () => {
    expect(objectStep(pale, [170, 160, 150])).toBeLessThan(MIN_STEP)
  })

  it("goes negative for an object lighter than the floor", () => {
    expect(objectStep(pale, [250, 245, 235])).toBeLessThan(0)
  })
})

describe("detailStep", () => {
  it("is zero for a flat floor and grows as the joints darken", () => {
    expect(detailStep(pale, 190, 190)).toBe(0)
    expect(detailStep(pale, 190, 60)).toBeGreaterThan(detailStep(pale, 190, 120))
  })
})

describe("lightestOf", () => {
  it("is a light rank's pale stone, not its darker props", () => {
    expect(lightestOf(pale)).toBeGreaterThan(200)
  })

  it("is a dark rank's props", () => {
    expect(lightestOf(dusk)).toBe(Math.round(0.2126 * 0xd8 + 0.7152 * 0xb0 + 0.0722 * 0x60))
  })
})
