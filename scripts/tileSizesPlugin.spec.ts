import { describe, expect, it } from "vitest"
import { mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import sharp from "sharp"
import { tileSizes } from "./tileSizesPlugin"

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .png()
    .toBuffer()

describe("tileSizes", () => {
  it("reads every PNG's size by folder and name, nested folders included", async () => {
    const root = mkdtempSync(join(tmpdir(), "tile-sizes-"))
    mkdirSync(join(root, "rank"))
    mkdirSync(join(root, "mechanism", "light"), { recursive: true })
    writeFileSync(join(root, "rank", "plaque.png"), await png(112, 96))
    writeFileSync(join(root, "mechanism", "light", "lever.png"), await png(40, 70))
    writeFileSync(join(root, "rank", "notes.txt"), "not a tile")
    expect(tileSizes(root)).toEqual({ "rank/plaque": [112, 96], "mechanism/light/lever": [40, 70] })
  })
})
