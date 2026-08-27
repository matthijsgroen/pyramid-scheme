import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { skinFor } from "./skins"

describe("which place a sudoku room is", () => {
  it("draws a scribe's register for the scribe", () => {
    expect(skinFor("scribe", undefined).name).toBe("papyrus")
  })

  it("draws the carved wall for the tomb, which is the wall it was already drawing", () => {
    // Not a dress: the default face IS signs cut into a chamber wall, so the claim this family makes
    // about `funerary` is that it reads as the place already (docs/game-design/journeys.md §9).
    expect(skinFor("funerary", undefined).name).toBe("default")
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

  it("writes one shape everywhere: the square shows the character its sentences name", () => {
    // Telling one sign from another IS this board's mechanic, which is why the game subsets and ships
    // the face that draws them (`scripts/generateFont.ts`) instead of gambling on the device having
    // one. That guarantee is what lets a square, a pad key and a hint sentence all be the SAME
    // character — a board drawing its own signs while its sentences typed them would be a hint pointing
    // at something not quite there.
    const register = skinFor("scribe", undefined)
    const shown = [1, 2, 3, 4, 5, 6].map(value => renderToStaticMarkup(createElement(register.Glyph, { value })))
    expect(shown).toEqual([1, 2, 3, 4, 5, 6].map(register.token))
    // And the carved board writes the figure itself.
    expect(renderToStaticMarkup(createElement(skinFor(undefined, undefined).Glyph, { value: 4 }))).toBe("4")
  })

  it("sets the register larger than the carved board, since a sign fills its box and a figure half of one", () => {
    // A property of the CHARACTERS rather than of the places they stand in, so it travels with the face
    // to all three: the square, the pencilled option and the pad's key.
    const carved = skinFor(undefined, undefined)
    const register = skinFor("scribe", undefined)
    const bigger = (a: string, b: string) => parseFloat(a) > parseFloat(b)
    expect(bigger(register.size.value, carved.size.value)).toBe(true)
    expect(bigger(register.size.note, carved.size.note)).toBe(true)
    expect(bigger(register.size.key, carved.size.key)).toBe(true)
    // The note has a ceiling the others do not: six of them share a square three across, so one much
    // wider than a third of it climbs over its neighbours.
    expect(parseFloat(register.size.note)).toBeLessThanOrEqual(29)
  })

  it("inks the register's given signs in red, the way a scribe's rubric is set down", () => {
    const register = skinFor("scribe", undefined)
    // The sheet carries no message of its own — a sheet is written on, it does not become anything —
    // so the RED is what tells the puzzle's own signs from the player's.
    expect(register.givenInk).toContain("red")
    expect(register.ink).not.toContain("red")
  })

  it("gives the register a scroll to roll up and the carved wall none, because stone does not roll", () => {
    // What a FINISHED board does is the face's too (design doc §9.1): a sheet is rolled up and put away,
    // a wall catches the light. Carrying the scroll here is what picks the run, so this is the switch —
    // a face with one counts its chambers, a face without counts its values.
    expect(skinFor("scribe", undefined).scroll).toBeDefined()
    expect(skinFor(undefined, undefined).scroll).toBeUndefined()
  })

  it("draws each face's marks for its own ground, or an affordance survives on one skin only", () => {
    // The register is the light board, so its rings are ink; the carved chamber is dark, so its are
    // light. A ring picked for one of them disappears on the other.
    expect(skinFor(undefined, undefined).focus).toContain("sky-300")
    expect(skinFor("scribe", undefined).focus).toContain("sky-800")
  })
})
