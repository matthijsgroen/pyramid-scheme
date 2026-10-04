import { execFileSync } from "child_process"
import { mkdtempSync, readdirSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { describe, expect, it } from "vitest"
import { buildSheet, framesOf } from "./buildSheet"

const TILES = "src/assets/tiles/default"

describe("buildSheet", () => {
  it("reads a row's frames in frame order", () => {
    expect(framesOf(TILES, "explorer-n").map(f => f.slice(TILES.length + 1))).toEqual([
      "explorer-n-1.png",
      "explorer-n-2.png",
      "explorer-n-3.png",
      "explorer-n-4.png",
    ])
  })

  it("lays the explorer out so cut-sheet finds every frame again, row by row", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sheet-"))
    const rows = ["explorer-s", "explorer-n", "explorer-e"].map(prefix => framesOf(TILES, prefix))
    writeFileSync(join(dir, "sheet.png"), await buildSheet(rows, 4))
    execFileSync("yarn", ["cut-sheet", join(dir, "sheet.png"), `--out=${join(dir, "cut")}`, "--rows=front,back,side"])
    const cut = readdirSync(join(dir, "cut"))
    expect(["front", "back", "side"].map(row => cut.filter(f => f.startsWith(`${row}-`)).length)).toEqual(
      rows.map(row => row.length)
    )
  }, 30_000)
})
