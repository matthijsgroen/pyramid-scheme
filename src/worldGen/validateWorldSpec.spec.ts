import { describe, it, expect } from "vitest"
import { validateWorldSpec } from "./validateWorldSpec"
import { journey, rules, tomb } from "./dsl"
import type { PyramidConstraint } from "./dsl"
import { parsePrefab } from "../game/prefabNotation"

describe("validateWorldSpec", () => {
  it("current worldSpec has no errors", () => {
    expect(validateWorldSpec()).toEqual([])
  })

  it("refuses a tomb whose authored floors differ from its floorCount", () => {
    const spec = rules([tomb("t", { floors: [{}, {}] })])
    const errors = validateWorldSpec(spec, [{ id: "t", tier: "starter", floorCount: 3, levelCount: 1 }])
    expect(errors[0].message).toContain("floorCount is 3")
  })
})

describe("validateWorldSpec — designed rooms", () => {
  const text = (tier: string) => `tier ${tier}\nlayout\n# # # # #\n# . . . #\n# . s . #\n# . . . #\n# # d # #\ns stop`
  const catalogue = { hall: parsePrefab(text("junior"), "hall") }
  const check = (constraint: PyramidConstraint) =>
    validateWorldSpec(
      rules([journey("j", constraint)]),
      [],
      [{ id: "j", tier: "junior", pathPuzzles: 2, levelCount: 1 }],
      catalogue
    ).map(e => e.message)

  it("accepts a room of the floor's difficulty", () => {
    expect(check({ difficulty: "junior", rooms: [{ room: "hall", min: 1, max: 2, central: 1 }] })).toEqual([])
  })

  it("names an unknown room", () => {
    expect(check({ difficulty: "junior", rooms: [{ room: "ghost" }] })).toEqual([expect.stringContaining("ghost")])
  })

  it("names a room whose tier is not the floor's difficulty, on a pinned node as on a count", () => {
    expect(check({ difficulty: "expert", rooms: [{ room: "hall" }] })[0]).toMatch(/hall is tier junior.*expert/)
    expect(check({ floors: [{ difficulty: "expert", nodes: [{ where: 1, room: "hall" }] }] })[0]).toMatch(
      /hall is tier junior.*expert/
    )
  })

  it("names min above max and central outside 0 to 1", () => {
    expect(check({ difficulty: "junior", rooms: [{ room: "hall", min: 3, max: 2 }] })[0]).toMatch(/min 3 above max 2/)
    expect(check({ difficulty: "junior", rooms: [{ room: "hall", central: 1.5 }] })[0]).toMatch(/central 1.5/)
  })
})
