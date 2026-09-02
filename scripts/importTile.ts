#!/usr/bin/env node
/**
 * Turns a generated image into a tile the renderer can use.
 *
 *   yarn import-tile <file> --tier=starter --name=jarRack --slot=prop
 *
 * An image model gives you a big square with an opaque background; the map wants an exact size, alpha
 * where the background was, and a prop standing on the bottom edge of its frame. Every one of those is
 * mechanical, and doing it by hand 29 times per rank is how a set ends up inconsistent.
 *
 * Steps, in order: key the background colour out to alpha → (props) trim to the object and re-seat it on
 * the floor line → resize to the slot's exact size → write to src/assets/tiles/<tier>/<name>.png.
 *
 * Flags:
 *   --key=#ff00ff    background colour to make transparent (default magenta). --key=none to skip.
 *   --tolerance=60   how far from that colour still counts as background (0-441, default 60)
 *   --filter=nearest keep hard pixel edges. --filter=smooth for painted art (default: nearest)
 *   --no-trim        keep the frame as generated instead of re-seating the object on the floor line
 *   --flip           mirror horizontally. The renderer mirrors EAST into west, so a side view drawn
 *                    facing left has to come in facing right
 */

import { mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { ARCH_H, ARCH_W, WALL_H } from "../src/app/SiteMap/mapScale"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, "..", "src", "assets", "tiles")

const TILE = 56
const MEGA = TILE * 8

// The slots, in map units — the same numbers docs/game-design/tile-art-brief.md hands to the artist. A
// prop is a cell PLUS a face band tall, and bottom-anchored, which is why it is the only one that gets
// re-seated.
const SLOTS = {
  floor: { w: MEGA, h: MEGA, seat: false },
  face: { w: MEGA, h: TILE, seat: false },
  sill: { w: TILE, h: 12, seat: false },
  arch: { w: ARCH_W, h: ARCH_H, seat: false },
  prop: { w: TILE, h: TILE + WALL_H, seat: true },
  wall: { w: TILE, h: WALL_H, seat: false },
  explorer: { w: 40, h: 48, seat: true },
} as const

type Slot = keyof typeof SLOTS

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Everything close enough to the key colour becomes transparent. A flat generated background keys clean;
 * a gradient one does not, which is why the prompts ask for flat. */
const keyOut = async (input: sharp.Sharp, key: string, tolerance: number): Promise<sharp.Sharp> => {
  const [kr, kg, kb] = hexToRgb(key)
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += info.channels) {
    const d = Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb)
    if (d <= tolerance) data[i + 3] = 0
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
}

/** Re-seats a trimmed object on the bottom edge of its slot's aspect: what makes a prop stand on the floor
 * line rather than float in the middle of its cell. The object keeps its own proportions. */
const seatOnFloorLine = async (img: sharp.Sharp, aspect: number): Promise<sharp.Sharp> => {
  // Encoded, not raw: `composite` needs an image it can parse, and a sharp instance built from a raw
  // buffer has no format of its own to fall back on.
  const trimmed = await img.trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true })
  const { width, height } = trimmed.info
  // A frame of the slot's shape, at least as big as the object, with the object centred on its bottom edge.
  const frameH = Math.max(height, Math.round(width / aspect))
  const frameW = Math.max(width, Math.round(frameH * aspect))
  // Rendered out before it goes back into the pipeline, because sharp resizes BEFORE it composites: left
  // lazy, the frame would be shrunk to the slot first and then asked to take a full-size object onto it.
  const seated = await sharp({
    create: { width: frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed.data, left: Math.round((frameW - width) / 2), top: frameH - height }])
    .png()
    .toBuffer()
  return sharp(seated)
}

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const tier = arg("tier")
  const name = arg("name")
  const slot = arg("slot") as Slot | undefined
  if (!file || file.startsWith("--") || !tier || !name || !slot || !(slot in SLOTS)) {
    console.error(`usage: yarn import-tile <file> --tier=starter --name=jarRack --slot=${Object.keys(SLOTS).join("|")}`)
    process.exit(1)
  }
  const { w, h, seat } = SLOTS[slot]
  const key = arg("key", "#ff00ff")!
  const tolerance = Number(arg("tolerance", "60"))
  const smooth = arg("filter", "nearest") === "smooth"

  let img = sharp(file)
  if (process.argv.includes("--flip")) img = sharp(await img.flop().png().toBuffer())
  if (key !== "none") img = await keyOut(img, key, tolerance)
  if (seat && !process.argv.includes("--no-trim")) img = await seatOnFloorLine(img, w / h)

  const dir = join(OUT_ROOT, tier)
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `${name}.png`)
  await img
    // `fill`: the slot's size is not negotiable, and the prompts ask for the slot's aspect, so any
    // squashing here is the generation's own aspect being wrong — better visible than silently cropped.
    .resize(w, h, { fit: "fill", kernel: smooth ? "lanczos3" : "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(out)

  const meta = await sharp(out).metadata()
  console.log(`${out} — ${meta.width}x${meta.height}, ${slot} slot${key === "none" ? "" : `, keyed ${key}`}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
