import { describe, expect, it } from "vitest"
import { skinFor } from "./skins"

/** The one place each narrow role is, and every place each wide one may be. */
const ROLES = [
  ["water", ["default"]],
  ["agriculture", ["grain", "default"]],
  ["light", ["oil"]],
  ["scribe", ["ink"]],
  ["trade", ["wine", "oil", "grain"]],
  ["funerary", ["natron", "oil"]],
] as const

describe("which place a canisters room is", () => {
  it.each(ROLES)("draws %s as one of %s", (role, faces) => {
    // Whatever the room, the face it lands on is one its role actually serves.
    for (let board = 0; board < 12; board++) expect(faces).toContain(skinFor(role, undefined, board).name)
  })

  it("gives a wide role every one of its places across enough rooms", () => {
    // A market that was always a wine cellar is narrower than the word it was authored with.
    const seen = new Set(Array.from({ length: 30 }, (_u, board) => skinFor("trade", undefined, board).name))
    expect([...seen].sort()).toEqual(["grain", "oil", "wine"])
  })

  it("gives the same room the same place every time it is opened", () => {
    // The pick comes from the board's own shape, so nothing has to be stored to keep it steady.
    expect(skinFor("trade", undefined, 41).name).toBe(skinFor("trade", undefined, 41).name)
    expect(skinFor("funerary", undefined, 8).name).toBe(skinFor("funerary", undefined, 8).name)
  })

  it("makes agriculture the wider word rather than the opposite one", () => {
    // Constellation, hidato and star battle answer both with one face. Here a farm is a granary AND the
    // water that goes on the fields, while `water` on its own is only ever the river.
    const farm = new Set(Array.from({ length: 24 }, (_u, board) => skinFor("agriculture", undefined, board).name))
    expect([...farm].sort()).toEqual(["default", "grain"])
    const river = new Set(Array.from({ length: 24 }, (_u, board) => skinFor("water", undefined, board).name))
    expect([...river]).toEqual(["default"])
  })

  it("gives every face its own vessel or its own behaviour, never just a repaint", () => {
    const faces = ["default", "grain", "oil", "wine", "natron", "ink"].map(face => skinFor(undefined, face))
    for (const face of faces) {
      const twins = faces.filter(
        other => other.shape === face.shape && other.settles === face.settles && other.board === face.board
      )
      expect(twins, `${face.name} is indistinguishable from another face`).toHaveLength(1)
    }
  })

  it("heaps what does not pour, and levels what does", () => {
    // The one flag a face sets about its contents, and two things follow from it: whether the surface is
    // drawn flat, and whether it holds level while the vessel is tipped.
    expect(skinFor("agriculture", undefined).settles).toBe(false)
    expect(skinFor("funerary", undefined).settles).toBe(false)
    for (const role of ["water", "light", "trade", "scribe"]) expect(skinFor(role, undefined).settles).toBe(true)
  })

  it("keeps the ink legible by turning the ground over", () => {
    // Black ink on the dark board every other place uses is not a colour, it is an absence — so this is
    // the one face drawn light, and its outline and numbers go dark with it.
    const ink = skinFor("scribe", undefined)
    expect(ink.board).toContain("amber-100")
    expect(ink.outline).toContain("stone-700")
    expect(ink.label).toContain("stone-800")
  })

  it("keeps the river where nothing was said about the place", () => {
    expect(skinFor("puzzle", undefined).name).toBe("default")
    expect(skinFor(undefined, undefined).name).toBe("default")
  })

  it("takes the first role it has a face for out of a list", () => {
    expect(["natron", "oil"]).toContain(skinFor(["puzzle", "funerary"], undefined, 3).name)
  })

  it("lets a theme name a face outright, which is what the lab does", () => {
    expect(skinFor(undefined, "wine").name).toBe("wine")
  })

  it("reads default and night as nothing said, so the hour never cancels the place", () => {
    expect(skinFor("trade", "night").name).toBe("wine")
    expect(skinFor("trade", "default").name).toBe("wine")
  })

  it("falls back to the river for a name it has never heard, without complaining", () => {
    expect(skinFor("sandstorm", "carnival").name).toBe("default")
  })
})
