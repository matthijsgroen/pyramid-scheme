import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { lockEntriesIn, lockTextsIn } from "./lockCatalogue"

describe("the catalogue's file reader", () => {
  it("reads every .lock file by name and leaves a -blocked one out", () => {
    const folder = mkdtempSync(join(tmpdir(), "locks-"))
    writeFileSync(join(folder, "made.lock"), "in -- out\n")
    writeFileSync(join(folder, "made-blocked.lock"), "in -- out\n")
    writeFileSync(join(folder, "notes.txt"), "not a lock\n")

    expect(lockTextsIn(folder)).toEqual({ made: "in -- out\n" })
  })
})

describe("the tier folders", () => {
  const root = () => {
    const folder = mkdtempSync(join(tmpdir(), "tiers-"))
    for (const dir of ["junior/lessons", "expert"]) mkdirSync(join(folder, dir), { recursive: true })
    return folder
  }

  it("finds a lock by bare name whatever its tier or lessons folder", () => {
    const folder = root()
    writeFileSync(join(folder, "junior/lessons/a.lock"), "in -- out\n")
    writeFileSync(join(folder, "expert/b.lock"), "in -- out\n")
    expect(
      lockEntriesIn(folder)
        .map(e => [e.name, e.tier, e.lesson])
        .sort()
    ).toEqual([
      ["a", "junior", true],
      ["b", "expert", false],
    ])
  })

  it("refuses one bare name in two folders", () => {
    const folder = root()
    writeFileSync(join(folder, "junior/same.lock"), "in -- out\n")
    writeFileSync(join(folder, "expert/same.lock"), "in -- out\n")
    expect(() => lockEntriesIn(folder)).toThrow("two locks are called same")
  })
})
