import { describe, expect, it } from "vitest"
import { allItems } from "@/mods/hieroglyph/game/symbolCatalogue"
import { WALLS, canRepair, legible, wallFor } from "./walls"

const held = (...ids: string[]) => new Set(ids.map(id => `hieroglyph:${id}`))

describe("a wall to be put right", () => {
  it("is cut from signs the player can actually collect", () => {
    const known = new Set(allItems.map(item => item.id))
    const unknown = Object.values(WALLS).flatMap(wall =>
      [...wall.cut, wall.answer].filter(id => id !== "" && !known.has(id))
    )

    expect(unknown).toEqual([])
  })

  it("puts the wrong sign inside its own line, and never the right one", () => {
    for (const wall of Object.values(WALLS)) {
      expect(wall.wrongAt).toBeGreaterThanOrEqual(0)
      expect(wall.wrongAt).toBeLessThan(wall.cut.length)
      expect(wall.cut[wall.wrongAt]).not.toBe(wall.answer)
    }
  })

  it("leaves a scoured slot empty, so there is nothing there to misread", () => {
    for (const wall of Object.values(WALLS).filter(w => w.missing)) expect(wall.cut[wall.wrongAt]).toBe("")
  })

  it("cannot be repaired with a sign the player has not learned", () => {
    const wall = wallFor("junior_treasure_tomb")!

    expect(canRepair(wall, held("art5", "a11"))).toBe(false)
    expect(canRepair(wall, held("a12"))).toBe(true)
  })

  it("reads back only the signs that have been learned", () => {
    const wall = wallFor("junior_treasure_tomb")!

    expect(legible(wall, held("art5", "a7"))).toEqual([true, false, true, false])
  })

  it("has nothing to say about a journey with no wall in it", () => {
    expect(wallFor("starter_2")).toBeUndefined()
  })
})

describe("the Sphinx", () => {
  const sphinx = wallFor("starter_1")!

  it("reads as a god's name until the reed leaf goes in", () => {
    expect(legible(sphinx, held("art5", "d3"))).toEqual([true, true, false])
    expect(canRepair(sphinx, held("art5", "d3"))).toBe(false)
    expect(canRepair(sphinx, held("s1"))).toBe(true)
  })

  it("plays the ending once it is put right", () => {
    expect(sphinx.after).toBe("reading.sphinx")
  })
})
