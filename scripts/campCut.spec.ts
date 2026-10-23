import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import sharp from "sharp"
import { campCut } from "./campCut"

let dir = ""
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "camp-cut-"))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** A magenta canvas with a red square on the left and a green one on the right, apart. */
const twoIslands = async () => {
  const masters = join(dir, "masters")
  const { mkdirSync } = await import("fs")
  mkdirSync(masters, { recursive: true })
  await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ff00ff" } })
    .composite([
      { input: { create: { width: 80, height: 80, channels: 3, background: "#ff0000" } }, left: 60, top: 160 },
      { input: { create: { width: 80, height: 80, channels: 3, background: "#00a000" } }, left: 260, top: 160 },
    ])
    .webp({ lossless: true })
    .toFile(join(masters, "full.webp"))
  return masters
}

const pixel = async (file: string, x: number, y: number) => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}

describe("campCut", () => {
  it("cuts the island under a point back to background and keeps the rest as it was", async () => {
    const masterRoot = await twoIslands()
    const out = await campCut({
      from: "full",
      name: "cut",
      at: [[0.75, 0.5]],
      masterRoot,
      key: "#ff00ff",
      tolerance: 60,
    })

    expect(out).toBe(join(masterRoot, "cut.webp"))
    // The master is lossy webp, so "the same" is within a few levels.
    const near = (got: number[], want: number[]) => got.every((v, i) => Math.abs(v - want[i]) <= 4)
    expect(near(await pixel(out, 300, 200), [255, 0, 255])).toBe(true)
    expect(near(await pixel(out, 100, 200), [255, 0, 0])).toBe(true)
  })

  it("refuses a point that lands on background, so a wrong coordinate cuts nothing silently", async () => {
    const masterRoot = await twoIslands()
    await expect(
      campCut({ from: "full", name: "cut", at: [[0.5, 0.1]], masterRoot, key: "#ff00ff", tolerance: 60 })
    ).rejects.toThrow(/background/)
  })
})
