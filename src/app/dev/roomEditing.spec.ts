import { describe, expect, it } from "vitest"
import { parsePrefab } from "@/game/prefabNotation"
import { printPrefab } from "@/game/prefabPrint"
import type { Prefab } from "@/game/prefabTypes"
import { SINGLE_CELL } from "@/game/siteTypes"
import type { DecorationKind, PropFootprint } from "@/game/siteTypes"
import * as editing from "./roomEditing"
import type { Edited } from "./roomEditing"

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

const rows = (prefab: Prefab, layout = 0) => prefab.layouts[layout].cells
/** The edit's prefab; a refusal fails the test. */
const ok = (edited: Edited): Prefab => {
  if (editing.isRefusal(edited)) throw new Error(`refused: ${edited.refused} ${edited.message ?? ""}`)
  return edited
}
const drop = (prefab: Prefab, r: number, c: number, kind: string, layer?: "wall") =>
  editing.dropKind(prefab, 0, r, c, kind as DecorationKind, { layer, footprintOf })
const paint = (prefab: Prefab, r: number, c: number, sign: "#" | "." | "d") =>
  editing.paintCell(prefab, 0, r, c, sign, footprintOf)

describe("drawing a room", () => {
  it("drops a 2x2 kind as four cells of one new letter", () => {
    const room = ok(drop(EMPTY, 1, 1, "basin"))
    expect(rows(room).slice(1, 3)).toEqual(["#aa...#", "#aa...#"])
    expect(room.places.a).toMatchObject({ layer: "floor", kinds: ["basin"], cols: 2, rows: 2 })
  })

  it("never names a place d, the door place's sign", () => {
    const three = [1, 3, 5].reduce((room, c) => ok(drop(room, 1, c, "pillar")), EMPTY)
    expect(Object.keys(ok(drop(three, 4, 1, "pillar")).places)).toEqual(["a", "b", "c", "e"])
  })

  it("refuses a drop over a door, the ring, another place or off the room, saying so", () => {
    const withPillar = ok(drop(EMPTY, 2, 2, "pillar"))
    expect(drop(EMPTY, 0, 3, "basin")).toEqual({ refused: "notFree" })
    expect(drop(EMPTY, 4, 1, "basin")).toEqual({ refused: "notFree" })
    expect(drop(withPillar, 1, 1, "basin")).toEqual({ refused: "notFree" })
    expect(drop(EMPTY, 1, 5, "basin")).toEqual({ refused: "notFree" })
  })

  it("stands a wall place only on the first inside row and a wall item only on the north wall", () => {
    expect(drop(EMPTY, 2, 1, "shelf", "wall")).toEqual({ refused: "wallRow" })
    expect(ok(drop(EMPTY, 1, 1, "shelf", "wall")).places.a.layer).toBe("wall")
    expect(drop(EMPTY, 5, 1, "niche")).toEqual({ refused: "northWall" })
    expect(rows(ok(drop(EMPTY, 0, 1, "niche")))[0]).toBe("#a#d###")
  })

  it("passes on the notation's own reason when it refuses", () => {
    const pillar = ok(drop(EMPTY, 2, 2, "pillar"))
    const refused = editing.copyPlace(pillar, 0, 2, 3, "a", footprintOf)
    expect(refused).toMatchObject({ refused: "notation", message: expect.stringMatching(/^line \d+: /) })
  })

  it("keeps one stop when the stop is set elsewhere", () => {
    const room = ok(editing.setSpecial(EMPTY, 0, 1, 1, "stop", footprintOf))
    expect(rows(room).join("").split("s").length - 1).toBe(1)
    expect(rows(room)[1][1]).toBe("s")
  })

  it("adds a chest as a special place of its own", () => {
    expect(ok(editing.setSpecial(EMPTY, 0, 1, 1, "chest", footprintOf)).specials).toEqual({ s: "stop", a: "chest" })
  })

  it("writes a count group into the text", () => {
    const four = [1, 3, 5].reduce(
      (room, c) => ok(editing.copyPlace(room, 0, 1, c, "a", footprintOf)),
      ok(drop(EMPTY, 4, 1, "pillar"))
    )
    const counted = ok(editing.editPlace(four, "a", { optional: true, group: { take: 3, of: 4 } }, footprintOf))
    expect(printPrefab(counted)).toContain("a floor? pillar 3 of 4")
  })

  it("refuses a count that takes more than it has", () => {
    const room = ok(drop(EMPTY, 1, 1, "pillar"))
    expect(editing.editPlace(room, "a", { group: { take: 3, of: 2 } }, footprintOf)).toMatchObject({
      refused: "notation",
    })
  })

  it("takes out an object and its legend line, but never the stop", () => {
    const room = ok(drop(EMPTY, 1, 1, "basin"))
    const removed = ok(editing.removePlace(room, 0, 2, 2, footprintOf))
    expect(rows(removed)).toEqual(rows(EMPTY))
    expect(removed.places).toEqual({})
    expect(editing.removePlace(EMPTY, 0, 3, 3, footprintOf)).toEqual({ refused: "keepStop" })
    expect(paint(EMPTY, 3, 3, "#")).toEqual({ refused: "keepStop" })
  })

  it("paints walls and doors, never floor on the ring nor a door inside", () => {
    const room = ok(paint(ok(paint(EMPTY, 2, 0, "d")), 1, 1, "#"))
    expect(rows(room).slice(1, 3)).toEqual(["##....#", "d.....#"])
    expect(paint(EMPTY, 0, 1, ".")).toEqual({ refused: "floorOnRing" })
    expect(paint(EMPTY, 1, 1, "d")).toEqual({ refused: "doorInside" })
  })

  it("paints over an object by taking all of it out", () => {
    const room = ok(paint(ok(drop(EMPTY, 1, 1, "basin")), 1, 1, "#"))
    expect(rows(room).slice(1, 3)).toEqual(["##....#", "#.....#"])
    expect(room.places).toEqual({})
  })

  it("copies a layout under a new name, never under one in use", () => {
    const room = ok(editing.addLayout(EMPTY, 0, "turned", footprintOf))
    expect(room.layouts.map(layout => layout.name)).toEqual(["", "turned"])
    expect(rows(room, 1)).toEqual(rows(EMPTY))
    expect(editing.addLayout(room, 0, "turned", footprintOf)).toEqual({ refused: "layoutName" })
  })

  it("returns the same prefab for an edit that changes nothing", () => {
    expect(paint(EMPTY, 0, 0, "#")).toBe(EMPTY)
    expect(editing.setSpecial(EMPTY, 0, 3, 3, "stop", footprintOf)).toBe(EMPTY)
  })
})
