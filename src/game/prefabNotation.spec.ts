import { describe, expect, it } from "vitest"
import { parsePrefab } from "./prefabNotation"
import { SINGLE_CELL } from "./siteTypes"
import type { DecorationKind, PropFootprint } from "./siteTypes"

// The registry has no 2x2 or ground kind yet, so the sizes are made up here.
const footprintOf = (kind: DecorationKind): PropFootprint =>
  kind === "basin" ? { cols: 2, rows: 2, tall: 0 } : kind === "mat" ? { ...SINGLE_CELL, ground: true } : SINGLE_CELL
const parse = (text: string) => parsePrefab(text, "test", footprintOf)

const HALL = `
// designed by: someone
room hall
tier junior
activity storage

layout
# # n d # #
# p . . . #
d . . B B d
d . s B B d
# # # d # #

p floor pillar | patron
B floor basin
n wallItem niche
s stop
`

const withLegend = (legend: string, grid = ["# # # #", "# s g #", "# . . #", "# # # #"]) =>
  `tier junior\nlayout\n${grid.join("\n")}\ns stop\n${legend}\n`

describe("parsePrefab", () => {
  it("parses a hall with pillars, a 2x2 piece, a wall item and a stop", () => {
    const hall = parse(HALL)
    expect(hall.layouts[0].cells.length).toBe(5)
    expect(hall.places.p.kinds).toEqual(["pillar", "patron"])
    expect(hall.places.B).toMatchObject({ cols: 2, rows: 2 })
    expect(hall.specials.s).toBe("stop")
    expect(hall.designedBy).toBe("someone")
    expect(hall.name).toBe("hall")
  })

  it("expands a named list on a place", () => {
    const { places } = parse(withLegend("gift = jarRack | basin\ng floor? gift 3 of 4").replace("basin", "shelf"))
    expect(places.g.kinds).toEqual(["jarRack", "shelf"])
    expect(places.g.optional).toBe(true)
    expect(places.g.group).toEqual({ take: 3, of: 4 })
  })

  it("keeps the named lists and the comments besides the designed-by line", () => {
    const room = parse(
      `// designed by: someone\n// a note\n${withLegend("gift = jarRack | shelf\ng floor gift // why")}`
    )
    expect(room.lists).toEqual({ gift: ["jarRack", "shelf"] })
    expect(room.notes).toEqual(["a note", "why"])
  })

  it("reads an empty designed-by line as no one", () => {
    expect(parse(`// designed by:\nroom hall\n${withLegend("g floor pillar")}`).designedBy).toBeUndefined()
  })

  it("reads a per-group", () => {
    const text = withLegend("q floor pillar\nr floor? rubblePile 1 of 3 per q", [
      "# # # # #",
      "# s q r #",
      "# . . . #",
      "# # # # #",
    ])
    expect(parse(text).places.r.group).toEqual({ take: 1, of: 3, per: "q" })
  })

  it("reads mirror and a second named layout", () => {
    const text = `${HALL.replace("activity storage", "mirror")}
layout turned
# # d #
# s . #
# # # #
`
    const room = parse(text)
    expect(room.mirror).toBe(true)
    expect(room.layouts.map(layout => layout.name)).toEqual(["", "turned"])
  })

  it("accepts a ground kind on a ground place", () => {
    expect(parse(withLegend("g ground mat")).places.g.layer).toBe("ground")
  })

  describe("refuses", () => {
    const refused = (text: string) => expect(() => parse(text)).toThrow(/line \d+: /)
    it("an unknown kind", () => refused(withLegend("g floor gryphon")))
    it("a door place inside the ring", () =>
      refused(withLegend("g floor pillar", ["# # # #", "# s d #", "# . . #", "# # # #"])))
    it("a wall place below the first inside row", () =>
      refused(withLegend("g wall shelf", ["# # # #", "# s . #", "# . g #", "# # # #"])))
    it("two stops", () => refused(withLegend("g floor pillar", ["# # # #", "# s s #", "# . g #", "# # # #"])))
    it("no stop", () => refused(withLegend("g floor pillar", ["# # # #", "# . g #", "# . . #", "# # # #"])))
    it("a kind whose footprint differs from the drawing", () => refused(withLegend("g floor basin")))
    it("a ground kind on a non-ground place", () => refused(withLegend("g floor mat")))
    it("a free-standing kind on a ground place", () => refused(withLegend("g ground pillar")))
    it("a letter used but never declared", () => refused(withLegend("x floor pillar")))
    it("a wallItem with a floor kind", () =>
      refused(withLegend("g wallItem pillar", ["# # g #", "# s . #", "# . . #", "# # # #"])))
    it("a wall item on the ring off its north wall, in any layout", () => {
      const refused = (text: string) => expect(() => parse(text)).toThrow(/line \d+: wall item "g" off the north wall/)
      refused(withLegend("g wallItem niche", ["# # # #", "g s . #", "# . . #", "# # # #"]))
      refused(withLegend("g wallItem niche", ["# # # #", "# s . #", "# . . #", "# # g #"]))
      refused(`${withLegend("g wallItem niche", ["# # g #", "# s . #", "# . . #", "# # # #"])}
layout turned
# # # #
# s . g
# # # #
`)
    })
    it("rows of unequal width", () => refused(withLegend("g floor pillar", ["# # # #", "# s g", "# . . #", "# # # #"])))
  })
})
