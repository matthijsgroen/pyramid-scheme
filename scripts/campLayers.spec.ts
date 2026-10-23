import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import sharp from "sharp"
import type { CampCatalogue, CampPiece, CampStep } from "../src/ui/atoms/campScene/campTypes"
import { campLayers, cutLayer, layerJobs } from "./campLayers"

let dir = ""
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "camp-layers-"))
  mkdirSync(join(dir, "camp"))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

type Square = { colour: string; left: number; top: number; size: number }

/** A transparent 200x200 frame with the given squares painted on it. */
const picture = async (name: string, squares: Square[]) => {
  const file = join(dir, "camp", `${name}.webp`)
  await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(
      squares.map(({ colour, left, top, size }) => ({
        input: { create: { width: size, height: size, channels: 3, background: colour } },
        left,
        top,
      }))
    )
    .webp({ lossless: true })
    .toFile(file)
  return file
}

const alphaOf = async (image: Buffer | string) => {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return (x: number, y: number) => data[(y * info.width + x) * 4 + 3]
}

const RED = { colour: "#ff0000", left: 20, top: 20, size: 40 }
const BLUE = { colour: "#0000ff", left: 110, top: 110, size: 50 }
const SPECK = { colour: "#00ff00", left: 40, top: 150, size: 5 }

const piece = (id: string): CampPiece => ({ id, dx: 0, dy: 0, width: 1, height: 1 })
const step = (id: string, layer?: CampStep["layer"]): CampStep => ({
  chapter: "starter",
  pieces: [piece(id)],
  ...(layer && { layer }),
})
const catalogue: CampCatalogue = {
  spots: [
    {
      id: "water",
      x: 0,
      y: 0,
      frame: 1,
      footprint: 1,
      steps: [step("plain"), step("cup", {}), step("lid", { on: "cup" }), step("ghost", {})],
    },
  ],
  fixed: [],
}

describe("cutLayer", () => {
  it("keeps only the object the newer picture adds, dropping specks of regeneration noise", async () => {
    const without = await picture("before", [RED])
    const withObject = await picture("after", [RED, BLUE, SPECK])
    const alpha = await alphaOf(await cutLayer(withObject, without))

    expect(alpha(135, 135)).toBe(255)
    expect(alpha(40, 40)).toBe(0)
    expect(alpha(42, 152)).toBe(0)
    expect(alpha(5, 5)).toBe(0)
  })

  it("keeps the whole picture when there is nothing to cut it against", async () => {
    const alpha = await alphaOf(await cutLayer(await picture("first", [RED])))
    expect(alpha(40, 40)).toBe(255)
  })
})

describe("layerJobs", () => {
  it("cuts each layer step against the step before it, unless a source names other pictures", () => {
    expect(layerJobs(catalogue, { lid: { with: "cupLid", without: "plain" } })).toEqual([
      { id: "cup", with: "cup", without: "plain" },
      { id: "lid", with: "cupLid", without: "plain" },
      { id: "ghost", with: "ghost", without: "lid" },
    ])
  })
})

describe("campLayers", () => {
  it("writes each painted layer with its shadow and skips the ones not painted yet", async () => {
    await picture("plain", [RED])
    await picture("cup", [RED, BLUE])
    await picture("cupLid", [RED, BLUE, { colour: "#ffff00", left: 110, top: 80, size: 30 }])

    const { written, skipped } = await campLayers({
      catalogue,
      sources: { lid: { with: "cupLid", without: "plain" } },
      assetsRoot: join(dir, "camp"),
      shadowSize: 100,
    })

    const layers = join(dir, "camp", "layers")
    expect(written).toEqual([join(layers, "cup.webp"), join(layers, "lid.webp")])
    expect(existsSync(join(layers, "cup-shadow.webp"))).toBe(true)
    expect(skipped).toEqual([{ id: "ghost", missing: ["ghost", "lid"] }])
    const lid = await alphaOf(join(layers, "lid.webp"))
    expect([lid(125, 95), lid(135, 135), lid(40, 40)]).toEqual([255, 255, 0])
  })
})
