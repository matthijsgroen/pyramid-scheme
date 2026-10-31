import { describe, expect, it } from "vitest"
import { parsePrefab } from "./prefabNotation"
import { printPrefab } from "./prefabPrint"
import { SINGLE_CELL } from "./siteTypes"
import type { DecorationKind, PropFootprint } from "./siteTypes"

const footprintOf = (kind: DecorationKind): PropFootprint =>
  kind === "basin" ? { cols: 2, rows: 2, tall: 0 } : SINGLE_CELL
const parse = (text: string) => parsePrefab(text, "test", footprintOf)

// A made-up hall with a named list, a count group, a per group, a 2x2 piece, a wall item and a second layout.
const HALL = `// designed by: someone
// two pillars flank the basin
room hall
tier junior
activity storage
mirror
gift = jarRack | shelf

layout
# # n d # #
# p . . q #
d . . B B d
d g s B B d
# # # d # #

layout turned
# # d # #
# p s q #
# g . . #
# # # # #

p floor pillar | patron   // either may stand
q floor? pillar 1 of 2
g floor? gift | brazier 1 of 2 per p
B floor basin
n wallItem niche
s stop
`

describe("printPrefab", () => {
  it("prints a room that parses back to the same room", () => {
    const hall = parse(HALL)
    expect(parse(printPrefab(hall))).toEqual(hall)
  })

  it("writes a named list by its name", () => {
    expect(printPrefab(parse(HALL))).toContain("g floor? gift | brazier 1 of 2 per p")
  })

  it("keeps the designed-by line and the comments", () => {
    const printed = printPrefab(parse(HALL))
    expect(printed.startsWith("// designed by: someone\n// two pillars flank the basin\n// either may stand\n")).toBe(
      true
    )
  })

  it("prints an empty designed-by line for a room no one signed", () => {
    const room = parse("tier junior\nlayout\n# # #\n# s #\n# # #\ns stop\n")
    expect(printPrefab(room).split("\n")[0]).toBe("// designed by:")
    expect(parse(printPrefab(room)).designedBy).toBeUndefined()
  })

  it("prints the parsed text again, changing only spacing", () => {
    const canonical = printPrefab(parse(HALL))
    expect(printPrefab(parse(canonical))).toBe(canonical)
  })
})

describe("printPrefab's room line", () => {
  const unnamed = "tier junior\nlayout\n# # #\n# s #\n# # #\ns stop\n"

  it("is left out when the room is named as the text is read", () => {
    const room = parsePrefab(unnamed, "nook")
    const printed = printPrefab(room, { readAs: "nook" })
    expect(printed).not.toMatch(/^room /m)
    expect(parsePrefab(printed, "nook")).toEqual(room)
  })

  it("is written when the room's own name differs", () => {
    expect(printPrefab(parsePrefab(`room hall\n${unnamed}`, "nook"), { readAs: "nook" })).toMatch(/^room hall$/m)
  })
})
