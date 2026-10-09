import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { lockTextsIn } from "./lockCatalogue"

describe("the catalogue's file reader", () => {
  it("reads every .lock file by name and leaves a -blocked one out", () => {
    const folder = mkdtempSync(join(tmpdir(), "locks-"))
    writeFileSync(join(folder, "made.lock"), "in -- out\n")
    writeFileSync(join(folder, "made-blocked.lock"), "in -- out\n")
    writeFileSync(join(folder, "notes.txt"), "not a lock\n")

    expect(lockTextsIn(folder)).toEqual({ made: "in -- out\n" })
  })
})
