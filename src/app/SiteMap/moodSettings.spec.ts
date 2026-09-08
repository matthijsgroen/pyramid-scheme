import { describe, expect, it } from "vitest"
import { moodFor } from "./moodSettings"

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
  it("puts growth in three places, fewest where the sprites are biggest", () => {
    const g = moodFor("expert", undefined, { kind: "overgrown", amount: 1 }).growth
    expect(g).toEqual({ count: 9, wallCount: 5, plantCount: 2, kind: "overgrown" })
  })

  it("scales all three with the amount, so a journey can build toward its overdrive pyramid", () => {
    const at = (amount: number) => moodFor("expert", undefined, { kind: "overgrown", amount }).growth
    expect(at(0.2)).toMatchObject({ count: 2, plantCount: 0 })
    expect(at(0.65)).toMatchObject({ count: 6, plantCount: 1 })
    expect(at(1)).toMatchObject({ count: 9, plantCount: 2 })
  })

  it("keeps at least one WALL root at any amount above zero", () => {
    // The roots are the part that says a building is losing, so they must not be the first thing to
    // round away: 0.1 of five is 0.5, and rounding that gives none.
    expect(moodFor("expert", undefined, { kind: "overgrown", amount: 0.1 }).growth?.wallCount).toBe(1)
  })

  it("grows nothing at all at amount zero", () => {
    expect(moodFor("expert", undefined, { kind: "overgrown", amount: 0 }).growth).toBeUndefined()
  })

  it("gives a flooded site a tide line but no plants — water grows no shrub in a chamber", () => {
    const g = moodFor("expert", undefined, { kind: "flooded", amount: 1 }).growth
    expect(g?.wallCount).toBeGreaterThan(0)
    expect(g?.plantCount).toBe(0)
  })
})
