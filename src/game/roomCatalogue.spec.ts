import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parsePrefab } from "./prefabNotation"
import { catalogueRoom, findRoom, roomEntriesIn, soundRoom } from "./roomCatalogue"

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
  it("throws for a room that is not in the catalogue", () => {
    expect(findRoom("noSuchRoom")).toBeUndefined()
    expect(() => catalogueRoom("noSuchRoom")).toThrow(/no room noSuchRoom/)
  })

  it("refuses a room whose own check finds a fault and passes one that walks", () => {
    // A pillar on the only way from the door to the stop.
    const faulty = parsePrefab(
      "tier starter\nlayout\n# # # # # #\n# s p . . #\n# # # # # #\n# # d # # #\ns stop\np floor pillar\n",
      "faulty"
    )
    expect(() => soundRoom("faulty", faulty)).toThrow(/room faulty is not sound/)
    expect(soundRoom("fine", parsePrefab(room("starter"), "fine")).name).toBe("fine")
  })
})
