import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parsePrefab } from "./prefabNotation"
import { prefabFaults } from "./prefabChecks"
import { catalogueRoom, findRoom, newRoomText, roomCatalogueIn, roomEntriesIn } from "./roomCatalogue"

const room = (tier: string, rows = ["# # # # #", "# . s . #", "# . . . #", "# # d # #"]) =>
  `tier ${tier}\nlayout\n${rows.join("\n")}\ns stop\n`

const root = () => {
  const folder = mkdtempSync(join(tmpdir(), "rooms-"))
  for (const dir of ["starter", "junior"]) mkdirSync(join(folder, dir))
  return folder
}

describe("the room catalogue's file reader", () => {
  it("reads every .room file by name with its tier folder and leaves a -blocked one out", () => {
    const folder = root()
    writeFileSync(join(folder, "starter/a.room"), room("starter"))
    writeFileSync(join(folder, "junior/b.room"), room("junior"))
    writeFileSync(join(folder, "junior/b-blocked.room"), room("junior"))
    writeFileSync(join(folder, "junior/notes.txt"), "not a room")
    expect(
      roomEntriesIn(folder)
        .map(e => [e.name, e.tier])
        .sort()
    ).toEqual([
      ["a", "starter"],
      ["b", "junior"],
    ])
  })

  it("refuses one bare name in two folders", () => {
    const folder = root()
    writeFileSync(join(folder, "starter/a.room"), room("starter"))
    writeFileSync(join(folder, "junior/a.room"), room("junior"))
    expect(() => roomEntriesIn(folder)).toThrow(/two rooms are called a/)
  })

  it("refuses a tier header that disagrees with its folder", () => {
    const folder = root()
    writeFileSync(join(folder, "starter/a.room"), room("junior"))
    expect(() => roomEntriesIn(folder)).toThrow(/says tier junior but lies in the starter folder/)
  })

  it("refuses a room outside a tier folder", () => {
    const folder = root()
    writeFileSync(join(folder, "a.room"), room("starter"))
    expect(() => roomEntriesIn(folder)).toThrow(/not in a tier folder/)
  })
})

describe("catalogueRoom", () => {
  const walled = (middle: string) =>
    `tier starter\nlayout\n# # # # # # #\n# s . ${middle} . . #\n# # # # d # #\ns stop\n${
      middle === "p" ? "p floor pillar\n" : ""
    }`

  it("throws for a room that is not in the catalogue", () => {
    expect(findRoom("noSuchRoom")).toBeUndefined()
    expect(() => catalogueRoom("noSuchRoom")).toThrow(/no room noSuchRoom/)
  })

  it("refuses a room only the pillar cuts off and hands out the same room without it", () => {
    const folder = root()
    writeFileSync(join(folder, "starter/blocked.room"), walled("p"))
    writeFileSync(join(folder, "starter/open.room"), walled("."))
    const catalogue = roomCatalogueIn(folder)
    expect(() => catalogueRoom("blocked", catalogue)).toThrow(/room blocked is not sound/)
    expect(catalogueRoom("open", catalogue).name).toBe("open")
  })
})

describe("a new room file", () => {
  it("parses and passes its own check", () => {
    const prefab = parsePrefab(newRoomText("junior", "fresh"), "fresh")
    expect(prefab.name).toBe("fresh")
    expect(prefab.tier).toBe("junior")
    expect(prefabFaults(prefab)).toEqual([])
  })
})
