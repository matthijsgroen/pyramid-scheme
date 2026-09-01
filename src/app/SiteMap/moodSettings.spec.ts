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
