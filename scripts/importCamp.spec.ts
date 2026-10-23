import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { existsSync, mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import sharp from "sharp"
import { importCamp } from "./importCamp"

let dir = ""
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "import-camp-"))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** A 400x400 magenta download with a 100x100 red square in the middle. */
const magentaWithRedSquare = async () => {
  const source = join(dir, "download.png")
  await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ff00ff" } })
    .composite([
      { input: { create: { width: 100, height: 100, channels: 3, background: "#ff0000" } }, left: 150, top: 150 },
    ])
    .png()
    .toFile(source)
  return source
}

const options = (file: string) => ({
  file,
  name: "chest",
  key: "#ff00ff",
  tolerance: 60,
  size: 768,
  shadowSize: 400,
  outRoot: join(dir, "assets"),
  masterRoot: join(dir, "masters"),
})

describe("importCamp", () => {
  it("keys the magenta out and keeps the canvas", async () => {
    const { out, master } = await importCamp(options(await magentaWithRedSquare()))

    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
    expect([info.width, info.height]).toEqual([400, 400])
    expect([alphaAt(0, 0), alphaAt(399, 0), alphaAt(0, 399), alphaAt(399, 399)]).toEqual([0, 0, 0, 0])
    expect(alphaAt(200, 200)).toBe(255)
    expect((await sharp(master).metadata()).width).toBe(400)
  })

  it("writes a blurred black band beside the piece, on its canvas", async () => {
    const { out, shadow } = await importCamp(options(await magentaWithRedSquare()))

    expect(shadow).toBe(join(dir, "assets", "chest-shadow.webp"))
    const piece = await sharp(out).metadata()
    const { data, info } = await sharp(shadow!).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([piece.width, piece.height])
    const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)]
    const [r, g, b, a] = at(200, 240)
    expect(Math.max(r, g, b)).toBeLessThan(8)
    expect(a).toBeGreaterThan(240)
    expect([at(0, 0)[3], at(399, 0)[3], at(0, 399)[3], at(399, 399)[3]]).toEqual([0, 0, 0, 0])
    expect(at(147, 240)[3]).toBeGreaterThan(0)
    expect(at(147, 240)[3]).toBeLessThan(255)
  })

  it("builds the shadow from the object's base, not its whole silhouette", async () => {
    const source = join(dir, "tall.png")
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ff00ff" } })
      .composite([
        { input: { create: { width: 100, height: 300, channels: 3, background: "#ff0000" } }, left: 150, top: 50 },
      ])
      .png()
      .toFile(source)
    const { shadow } = await importCamp(options(source))

    const { data, info } = await sharp(shadow!).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]
    expect(alphaAt(200, 340)).toBeGreaterThan(200)
    expect(alphaAt(200, 60)).toBe(0)
    expect(alphaAt(200, 200)).toBe(0)
  })

  it("writes the shadow at its own size, on the piece's aspect", async () => {
    const { shadow } = await importCamp({ ...options(await magentaWithRedSquare()), shadowSize: 128 })
    const { width, height } = await sharp(shadow!).metadata()
    expect([width, height]).toEqual([128, 128])
  })

  it("un-mixes the magenta out of a soft edge instead of leaving a pink rim", async () => {
    // An orange square whose outer ring of pixels is half magenta: what a soft flame edge looks like.
    const orange = { r: 255, g: 150, b: 40 }
    const half = { r: 255, g: 75, b: 148 }
    const purple = { r: 120, g: 20, b: 120 }
    const source = join(dir, "soft.png")
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ff00ff" } })
      .composite([
        { input: { create: { width: 120, height: 120, channels: 3, background: half } }, left: 140, top: 140 },
        { input: { create: { width: 112, height: 112, channels: 3, background: orange } }, left: 144, top: 144 },
        { input: { create: { width: 40, height: 40, channels: 3, background: purple } }, left: 180, top: 180 },
      ])
      .png()
      .toFile(source)
    const { out } = await importCamp(options(source))

    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)]
    const [r, g, b, a] = at(141, 200)
    expect(a).toBeGreaterThan(60)
    expect(a).toBeLessThan(200)
    expect(g).toBeGreaterThan(b)
    expect(r).toBeGreaterThan(200)
    // Deep inside the object a magenta-ish colour is paint, not background, and stays.
    expect(at(200, 200)[3]).toBe(255)
    expect(at(200, 200)[2]).toBeGreaterThan(80)
  })

  it("casts no shadow for scenery or an unkeyed import", async () => {
    const source = await magentaWithRedSquare()
    for (const name of ["sand", "dunes", "pyramid", "pyramidGold"])
      expect((await importCamp({ ...options(source), name })).shadow).toBeUndefined()
    expect((await importCamp({ ...options(source), key: "none" })).shadow).toBeUndefined()
    expect(existsSync(join(dir, "assets", "chest-shadow.webp"))).toBe(false)
  })
})
