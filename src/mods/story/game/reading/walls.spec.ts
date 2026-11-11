import { describe, expect, it } from "vitest"
import { allItems } from "@/mods/hieroglyph/game/symbolCatalogue"
import { WALLS, canRepair, isRepaired, legible, wallFor, type Wall } from "./walls"

const held = (...ids: string[]) => new Set(ids.map(id => `hieroglyph:${id}`))
const everyWall = Object.entries(WALLS).flatMap(([journeyId, walls]) => walls.map(wall => ({ journeyId, wall })))

const madeUp: Wall = {
  at: { levelNr: 3, floor: 2 },
  cut: ["d1", "a1", "p1"],
  wrongAt: 1,
  answer: "a2",
  copy: "test.wall",
  after: "test.fixed",
  panel: { aspect: 1, signs: { x: 0, y: 0, width: 1, height: 1 }, flow: "row" },
}

describe("a wall to be put right", () => {
  it("is cut from signs the player can actually collect", () => {
    const known = new Set(allItems.map(item => item.id))
    const unknown = everyWall.flatMap(({ wall }) =>
      [...wall.cut, wall.answer].filter(id => id !== "" && !known.has(id))
    )

    expect(unknown).toEqual([])
  })

  it("puts the wrong sign inside its own line, and never the right one", () => {
    for (const { wall } of everyWall) {
      expect(wall.wrongAt).toBeGreaterThanOrEqual(0)
      expect(wall.wrongAt).toBeLessThan(wall.cut.length)
      expect(wall.cut[wall.wrongAt]).not.toBe(wall.answer)
    }
  })

  it("leaves a scoured slot empty, so there is nothing there to misread", () => {
    for (const { wall } of everyWall.filter(({ wall }) => wall.missing)) expect(wall.cut[wall.wrongAt]).toBe("")
  })

  it("cannot be repaired with a sign the player has not learned", () => {
    expect(canRepair(madeUp, held(...madeUp.cut))).toBe(false)
    expect(canRepair(madeUp, held(madeUp.answer))).toBe(true)
  })

  it("reads back only the signs that have been learned", () => {
    expect(legible(madeUp, held("d1", "p1"))).toEqual([true, false, true])
  })

  it("stands put right once the scene its repair plays has been heard, and not before", () => {
    expect(isRepaired(madeUp, {})).toBe(false)
    expect(isRepaired(madeUp, { "some.other": true })).toBe(false)
    expect(isRepaired(madeUp, { [madeUp.after]: true })).toBe(true)
  })
})

describe("where a wall stands", () => {
  it("is found on its own floor of its own site, and on no other", () => {
    for (const { journeyId, wall } of everyWall) {
      expect(wallFor(journeyId, wall.at.levelNr, wall.at.floor)).toBe(wall)
      expect(wallFor(journeyId, wall.at.levelNr, wall.at.floor + 100)).toBeUndefined()
      expect(wallFor(journeyId, wall.at.levelNr + 100, wall.at.floor)).toBeUndefined()
    }
  })

  it("is one wall per place, so a reading room never has two to choose from", () => {
    const places = everyWall.map(({ journeyId, wall }) => `${journeyId}@${wall.at.levelNr}/${wall.at.floor}`)

    expect(places.filter((place, i) => places.indexOf(place) !== i)).toEqual([])
  })

  it("has nothing to say about a journey with no wall in it", () => {
    expect(wallFor("no_such_journey", 1, 0)).toBeUndefined()
  })
})
