import { afterEach, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import sharp from "sharp"
import { importCamp } from "./importCamp"

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })))

describe("importCamp", () => {
  it("keys the magenta out and keeps the canvas", async () => {
    const dir = mkdtempSync(join(tmpdir(), "import-camp-"))
    dirs.push(dir)
    const source = join(dir, "download.png")
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ff00ff" } })
      .composite([
        { input: { create: { width: 100, height: 100, channels: 3, background: "#ff0000" } }, left: 150, top: 150 },
      ])
      .png()
      .toFile(source)

    const { out, master } = await importCamp({
      file: source,
      name: "chest",
      key: "#ff00ff",
      tolerance: 60,
      size: 768,
      outRoot: join(dir, "assets"),
      masterRoot: join(dir, "masters"),
    })

    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
    expect([info.width, info.height]).toEqual([400, 400])
    expect([alphaAt(0, 0), alphaAt(399, 0), alphaAt(0, 399), alphaAt(399, 399)]).toEqual([0, 0, 0, 0])
    expect(alphaAt(200, 200)).toBe(255)
    expect((await sharp(master).metadata()).width).toBe(400)
  })
})
