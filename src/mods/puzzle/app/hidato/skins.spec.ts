import { describe, expect, it } from "vitest"
import { skinFor } from "./skins"

describe("which place a hidato room is", () => {
  it.each(["water", "agriculture"])("draws a channel for %s", role => {
    expect(skinFor(role, undefined).name).toBe("channel")
  })

  it("draws a sheet for the scribe", () => {
    expect(skinFor("scribe", undefined).name).toBe("scribe")
  })

  it("keeps the hive where nothing was said about the place", () => {
    // `puzzle` is the tag every family carries, so it says nothing about which place a room is.
    expect(skinFor("puzzle", undefined).name).toBe("default")
    expect(skinFor(undefined, undefined).name).toBe("default")
  })

  it("takes the first role it has a face for out of a list", () => {
    // A list of roles is the union the allocator drew from, not a set of demands.
    expect(skinFor(["puzzle", "water"], undefined).name).toBe("channel")
  })

  it("lets a theme name a skin outright, which is what the lab does", () => {
    expect(skinFor(undefined, "channel").name).toBe("channel")
  })

  it("reads default and night as nothing said, so the hour never cancels the place", () => {
    // A channel after dark is still a channel: the ambience layers onto the identity (puzzle-screens.md §2).
    expect(skinFor("water", "night").name).toBe("channel")
    expect(skinFor("water", "default").name).toBe("channel")
  })

  it("falls back to the hive for a name it has never heard, without complaining", () => {
    expect(skinFor("sandstorm", "carnival").name).toBe("default")
  })

  it("writes the sheet in ink, and its givens in red", () => {
    const sheet = skinFor("scribe", undefined)
    // Papyrus does not change when the line reaches it: a sheet is written on, it does not become
    // anything. So the ground says nothing about the run, and the RED is what marks the puzzle's own
    // figures — a scribe's rubric, and the only thing telling the two apart here.
    const written = { filled: true, reached: true, lit: false }
    expect(sheet.cell({ ...written, given: true })).toBe(sheet.cell({ ...written, given: false }))
    expect(sheet.cell({ ...written, given: false })).toBe(
      sheet.cell({ given: false, filled: false, reached: false, lit: false })
    )
    expect(sheet.ink({ ...written, given: true })).toContain("red")
    expect(sheet.ink({ ...written, given: false })).not.toContain("red")
    // Ink, not honey and not water.
    expect(sheet.run).toContain("stone")
    expect(sheet.finish?.arrival).toBe("animate-flower-in")
  })

  it("gives the channel the things that make it one, and the hive none of them", () => {
    const channel = skinFor("water", undefined)
    const hive = skinFor(undefined, undefined)
    // Water rather than a route, ground that greens where it arrives, and something that grows at the end.
    expect(channel.run).toContain("sky")
    expect(channel.cell({ given: false, filled: true, reached: true, lit: false })).toContain("emerald")
    expect(channel.cell({ given: false, filled: true, reached: false, lit: false })).not.toContain("emerald")
    expect(channel.finish).toBeDefined()
    // A number the puzzle wrote in still reads as one after the water reaches it: the ground goes green
    // like any other field, and the rim it was marked with is what stays.
    const watered = { filled: true, reached: true, lit: false }
    expect(channel.cell({ ...watered, given: true })).not.toBe(channel.cell({ ...watered, given: false }))
    expect(channel.cell({ ...watered, given: true })).toContain("emerald-800")
    expect(channel.cell({ ...watered, given: true })).toContain("amber")
    expect(hive.finish).toBeUndefined()
    // The hive does not ask whether the line has arrived: what the player wrote is what it shows.
    const look = { given: false, filled: true, lit: false }
    expect(hive.cell({ ...look, reached: true })).toBe(hive.cell({ ...look, reached: false }))
  })
})
