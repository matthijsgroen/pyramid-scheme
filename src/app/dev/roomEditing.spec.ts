import { describe, expect, it } from "vitest"
import { parsePrefab } from "@/game/prefabNotation"
import { printPrefab } from "@/game/prefabPrint"
import { SINGLE_CELL } from "@/game/siteTypes"
import type { DecorationKind, PropFootprint } from "@/game/siteTypes"
import { addLayout, copyPlace, dropKind, editPlace, paintCell, removePlace, setSpecial } from "./roomEditing"

// The registry has no 2x2 kind, so the basin is made 2x2 here.
const footprintOf = (kind: DecorationKind): PropFootprint =>
  kind === "basin" ? { cols: 2, rows: 2, tall: 0 } : SINGLE_CELL

// A made-up empty hall: a door south and one north, the stop in the middle.
const EMPTY = parsePrefab(
  `tier junior
layout
# # # d # # #
# . . . . . #
# . . . . . #
# . . s . . #
# . . . . . #
# # # d # # #
s stop
`,
  "hall",
  footprintOf
)

const rows = (prefab: typeof EMPTY, layout = 0) => prefab.layouts[layout].cells

describe("drawing a room", () => {
  it("drops a 2x2 kind as four cells of one new letter", () => {
    const room = dropKind(EMPTY, 0, 1, 1, "basin", { footprintOf })
    expect(rows(room).slice(1, 3)).toEqual(["#aa...#", "#aa...#"])
    expect(room.places.a).toMatchObject({ layer: "floor", kinds: ["basin"], cols: 2, rows: 2 })
  })

  it("never names a place d, the door place's sign", () => {
    const three = [1, 3, 5].reduce((room, c) => dropKind(room, 0, 1, c, "pillar", { footprintOf }), EMPTY)
    expect(Object.keys(dropKind(three, 0, 4, 1, "pillar", { footprintOf }).places)).toEqual(["a", "b", "c", "e"])
  })

  it("refuses a drop over a door, the ring, another place or off the room", () => {
    const withPillar = dropKind(EMPTY, 0, 2, 2, "pillar", { footprintOf })
    expect(dropKind(EMPTY, 0, 0, 3, "basin", { footprintOf })).toBe(EMPTY)
    expect(dropKind(EMPTY, 0, 4, 1, "basin", { footprintOf })).toBe(EMPTY)
    expect(dropKind(withPillar, 0, 1, 1, "basin", { footprintOf })).toBe(withPillar)
    expect(dropKind(EMPTY, 0, 1, 5, "basin", { footprintOf })).toBe(EMPTY)
  })

  it("stands a wall place only on the first inside row and a wall item only on the north wall", () => {
    expect(dropKind(EMPTY, 0, 2, 1, "shelf", { layer: "wall", footprintOf })).toBe(EMPTY)
    expect(dropKind(EMPTY, 0, 1, 1, "shelf", { layer: "wall", footprintOf }).places.a.layer).toBe("wall")
    expect(dropKind(EMPTY, 0, 5, 1, "niche", { footprintOf })).toBe(EMPTY)
    expect(rows(dropKind(EMPTY, 0, 0, 1, "niche", { footprintOf }))[0]).toBe("#a#d###")
  })

  it("keeps one stop when the stop is set elsewhere", () => {
    const room = setSpecial(EMPTY, 0, 1, 1, "stop", footprintOf)
    expect(rows(room).join("").split("s").length - 1).toBe(1)
    expect(rows(room)[1][1]).toBe("s")
  })

  it("adds an actor as a special place of its own", () => {
    const room = setSpecial(EMPTY, 0, 1, 1, "actor", footprintOf)
    expect(room.specials).toEqual({ s: "stop", a: "actor" })
  })

  it("writes a count group into the text", () => {
    const four = [1, 3, 5].reduce(
      (room, c) => copyPlace(room, 0, 1, c, "a", footprintOf),
      dropKind(EMPTY, 0, 4, 1, "pillar", { footprintOf })
    )
    const counted = editPlace(four, "a", { optional: true, group: { take: 3, of: 4 } }, footprintOf)
    expect(printPrefab(counted)).toContain("a floor? pillar 3 of 4")
  })

  it("refuses a count that takes more than it has", () => {
    const room = dropKind(EMPTY, 0, 1, 1, "pillar", { footprintOf })
    expect(editPlace(room, "a", { group: { take: 3, of: 2 } }, footprintOf)).toBe(room)
  })

  it("takes out an object and its legend line, but never the stop", () => {
    const room = dropKind(EMPTY, 0, 1, 1, "basin", { footprintOf })
    const removed = removePlace(room, 0, 2, 2, footprintOf)
    expect(rows(removed)).toEqual(rows(EMPTY))
    expect(removed.places).toEqual({})
    expect(removePlace(EMPTY, 0, 3, 3, footprintOf)).toBe(EMPTY)
  })

  it("paints walls and doors, never floor on the ring nor a door inside", () => {
    const room = paintCell(paintCell(EMPTY, 0, 2, 0, "d", footprintOf), 0, 1, 1, "#", footprintOf)
    expect(rows(room).slice(1, 3)).toEqual(["##....#", "d.....#"])
    expect(paintCell(EMPTY, 0, 0, 1, ".", footprintOf)).toBe(EMPTY)
    expect(paintCell(EMPTY, 0, 1, 1, "d", footprintOf)).toBe(EMPTY)
  })

  it("paints over an object by taking all of it out", () => {
    const room = paintCell(dropKind(EMPTY, 0, 1, 1, "basin", { footprintOf }), 0, 1, 1, "#", footprintOf)
    expect(rows(room).slice(1, 3)).toEqual(["##....#", "#.....#"])
    expect(room.places).toEqual({})
  })

  it("copies a layout under a new name", () => {
    const room = addLayout(EMPTY, 0, "turned", footprintOf)
    expect(room.layouts.map(layout => layout.name)).toEqual(["", "turned"])
    expect(rows(room, 1)).toEqual(rows(EMPTY))
    expect(addLayout(room, 0, "turned", footprintOf)).toBe(room)
  })
})
