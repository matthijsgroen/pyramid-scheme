import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { skinFor } from "./skins"

describe("which place a sudoku room is", () => {
  it("draws a scribe's register for the scribe", () => {
    expect(skinFor("scribe", undefined).name).toBe("papyrus")
  })

  it("keeps the carved chamber where nothing was said about the place", () => {
    // `puzzle` is the tag every family carries, so it says nothing about which place a room is.
    expect(skinFor("puzzle", undefined).name).toBe("default")
    expect(skinFor(undefined, undefined).name).toBe("default")
  })

  it("takes the first role it has a face for out of a list", () => {
    // A list of roles is the union the allocator drew from, not a set of demands.
    expect(skinFor(["puzzle", "scribe"], undefined).name).toBe("papyrus")
  })

  it("lets a theme name a skin outright, which is what the lab does", () => {
    expect(skinFor(undefined, "papyrus").name).toBe("papyrus")
  })

  it("reads default and night as nothing said, so the hour never cancels the place", () => {
    // A scribe's sheet after dark is still a scribe's sheet: the ambience layers onto the identity
    // rather than replacing it (puzzle-screens.md §2).
    expect(skinFor("scribe", "night").name).toBe("papyrus")
    expect(skinFor("scribe", "default").name).toBe("papyrus")
  })

  it("falls back to the carved chamber for a name it has never heard, without complaining", () => {
    expect(skinFor("sandstorm", "carnival").name).toBe("default")
  })

  /**
   * **The token is the whole second face.** A value is a position in this family's rules and nothing
   * more, so what the board SHOWS is the skin's decision — figures on one board, signs on the other.
   */
  it("writes figures on stone and signs on papyrus, six of each and all six distinct", () => {
    const carved = skinFor(undefined, undefined)
    const register = skinFor("scribe", undefined)
    const values = [1, 2, 3, 4, 5, 6]
    expect(values.map(carved.token)).toEqual(["1", "2", "3", "4", "5", "6"])
    const signs = values.map(register.token)
    expect(new Set(signs).size).toBe(6)
    // Egyptian hieroglyphs, every one of them — a sentence about this board with a digit in it is a
    // sentence that has quietly lost its face.
    for (const sign of signs) expect(sign.codePointAt(0)).toBeGreaterThanOrEqual(0x13000)
  })

  it("draws its signs rather than typing them, so a device with no hieroglyph font still has a puzzle", () => {
    // Telling one sign from another IS this board's mechanic, and the Egyptian Hieroglyphs block ships
    // with no font at all on several platforms this game runs on. So the six squares are drawn, and the
    // characters above are only ever put in a sentence.
    const register = skinFor("scribe", undefined)
    const drawn = [1, 2, 3, 4, 5, 6].map(value => renderToStaticMarkup(createElement(register.Glyph, { value })))
    expect(drawn.every(markup => markup.startsWith("<svg"))).toBe(true)
    expect(new Set(drawn).size).toBe(6)
    // And the carved board writes the figure itself, with no drawing involved.
    expect(renderToStaticMarkup(createElement(skinFor(undefined, undefined).Glyph, { value: 4 }))).toBe("4")
  })

  it("inks the register's given signs in red, the way a scribe's rubric is set down", () => {
    const register = skinFor("scribe", undefined)
    // The sheet carries no message of its own — a sheet is written on, it does not become anything —
    // so the RED is what tells the puzzle's own signs from the player's.
    expect(register.givenInk).toContain("red")
    expect(register.ink).not.toContain("red")
  })

  it("draws each face's marks for its own ground, or an affordance survives on one skin only", () => {
    // The register is the light board, so its rings are ink; the carved chamber is dark, so its are
    // light. A ring picked for one of them disappears on the other.
    expect(skinFor(undefined, undefined).focus).toContain("sky-300")
    expect(skinFor("scribe", undefined).focus).toContain("sky-800")
  })
})
