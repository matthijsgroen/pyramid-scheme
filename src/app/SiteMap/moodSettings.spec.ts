import { describe, expect, it } from "vitest"
import { GROWTH_POOLS, growthTile, moodFor } from "./moodSettings"

describe("the air a floor is drawn in", () => {
  it("gives every rank its own ambience, with nothing authored", () => {
    // The ranks differ from each other by the doc's own mood table: a merchant's cellar has dust and
    // vermin in it, the pharaoh's vault has neither and is nearly black.
    const merchant = moodFor("starter")
    expect(merchant.life).toBeGreaterThan(0)
    expect(merchant.drift?.count).toBeGreaterThan(0)

    const pharaoh = moodFor("master")
    expect(pharaoh.life).toBeUndefined()
    expect(pharaoh.tint!.opacity).toBeGreaterThan(merchant.tint!.opacity)
  })

  it("lets the hour replace only what it names", () => {
    // Night is a light, not a different room: the cellar keeps its dust and its scarabs.
    const night = moodFor("starter", "night")
    expect(night.tint).not.toEqual(moodFor("starter").tint)
    expect(night.drift).toEqual(moodFor("starter").drift)
    expect(night.life).toBe(moodFor("starter").life)
  })

  it("tells sand from fog by how the air carries it, not by a second mechanism", () => {
    // Both are drift. Sand is many small ones moving quickly; fog is a few huge ones barely moving.
    const sand = moodFor("starter", "sand").drift!
    const fog = moodFor("starter", "fog").drift!
    expect(sand.count).toBeGreaterThan(fog.count)
    expect(sand.size).toBeLessThan(fog.size)
    expect(sand.seconds).toBeLessThan(fog.seconds)
  })

  it("leaves the rank's own air alone for a theme it has no weather for", () => {
    // `theme` is a skin name a puzzle family may recognise; most of them mean nothing to the map, and a
    // floor wearing one is not therefore airless.
    expect(moodFor("expert", "constellation")).toEqual(moodFor("expert"))
  })
})

describe("what a condition grows, and where", () => {
  it("is a DENSITY per cell, and overgrown at full strength means every one of them", () => {
    // The number a floor turns into a count. 1 is one sprite per available cell — every joint, every
    // band, every chamber floor — which is what the word is supposed to mean.
    const g = moodFor("expert", undefined, { kind: "overgrown", amount: 1 }).growth
    expect(g).toEqual({ floor: 1, wall: 1, chamber: 1, kind: "overgrown" })
  })

  it("is a straight fraction of that, so an authored amount means what it says", () => {
    const at = (amount: number) => moodFor("expert", undefined, { kind: "overgrown", amount }).growth
    expect(at(0.2)).toMatchObject({ floor: 0.2, wall: 0.2, chamber: 0.2 })
    expect(at(0.65)).toMatchObject({ floor: 0.65, wall: 0.65, chamber: 0.65 })
  })

  it("grows nothing at all at amount zero", () => {
    expect(moodFor("expert", undefined, { kind: "overgrown", amount: 0 }).growth).toBeUndefined()
  })

  it("gives a flooded site a tide line but no plants — water grows no shrub in a chamber", () => {
    const g = moodFor("expert", undefined, { kind: "flooded", amount: 1 }).growth
    expect(g?.wall).toBeGreaterThan(0)
    expect(g?.chamber).toBe(0)
  })

  it("floods less thickly than it grows over, and most where the water marks the wall", () => {
    const g = moodFor("expert", undefined, { kind: "flooded", amount: 1 }).growth
    expect(g!.wall).toBeGreaterThan(g!.floor)
  })
})

describe("the light a condition brings with it", () => {
  const overgrown = (amount: number) => moodFor("expert", undefined, { kind: "overgrown", amount })

  it("lights a floor in proportion to what grows on it — the plant and the light are one number", () => {
    // Nothing grows in the dark, so a floor thick with greenery is a floor whose roof let the sun in.
    expect(overgrown(1).daylight).toBe(1)
    expect(overgrown(0.4).daylight).toBe(0.4)
  })

  it("makes a roof likelier to have given way the further the place has gone", () => {
    const sealed = moodFor("expert").beam!
    expect(overgrown(0.4).beam!).toBeGreaterThan(sealed)
    expect(overgrown(1).beam!).toBeGreaterThan(overgrown(0.4).beam!)
  })

  it("gives a flooded floor no daylight — a cellar fills through the ground, not through the roof", () => {
    const flooded = moodFor("expert", undefined, { kind: "flooded", amount: 1 })
    expect(flooded.daylight).toBe(0)
    expect(flooded.beam).toBe(moodFor("expert").beam)
  })

  it("is not overgrown at all at amount zero: no growth, and not a scrap of extra light", () => {
    expect(overgrown(0)).toEqual(moodFor("expert"))
  })
})

describe("what may grow in a slot", () => {
  it("offers each slot more than one plant, so a floor is a garden and not one weed repeated", () => {
    for (const members of Object.values(GROWTH_POOLS)) expect(members.length).toBeGreaterThan(1)
  })

  it("names its members after the condition, and puts the slot's own drawing first as the fallback", () => {
    // Every member nobody has painted resolves to the first (`MapGrowth`), which is what lets the
    // renderer ship before the art.
    expect(growthTile("overgrown", GROWTH_POOLS.floor[0])).toBe("overgrown")
    expect(growthTile("overgrown", GROWTH_POOLS.wall[0])).toBe("overgrown-wall")
    expect(growthTile("overgrown", GROWTH_POOLS.chamber[0])).toBe("overgrown-plant")
    expect(growthTile("overgrown", "flowers")).toBe("overgrown-flowers")
  })
})
