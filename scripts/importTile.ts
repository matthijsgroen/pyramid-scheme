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
 *   --repeat=1.4     fit the art N times across the slot instead of once, for a megatile whose subject
 *                    came back too big. Fractional is the point — a whole number makes the repeat
 *                    visible. Run `make-seamless` on the SOURCE first, or the grid shows its own seams.
 *   --flatten=0.5    blend toward the material the slot is made of — the rank's slab for a floor, its wall
 *                    for a face — so a surface sits behind the props. Toward the palette, not toward grey.
 *   --no-trim        keep the frame as generated instead of re-seating the object on the floor line
 *   --flip           mirror horizontally. The renderer mirrors EAST into west, so a side view drawn
 *                    facing left has to come in facing right
 */

import { mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { ARCH_H, ARCH_W, WALL_H } from "../src/app/SiteMap/mapScale"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import type { Difficulty } from "../src/data/difficultyLevels"

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
  explorer: { w: 40, h: 70, seat: true },
} as const

type Slot = keyof typeof SLOTS

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/**
 * Everything close enough to the key colour becomes transparent, and everything that was PARTLY the key
 * colour gets it taken back out.
 *
 * The second half matters more than it sounds. A generated sprite's outline pixels are a blend of the art
 * and the background, so keying alone leaves a magenta halo tracing the whole silhouette — at 40px wide
 * that halo is a visible fraction of the character, and it reads as a purple rim light nobody asked for.
 *
 * So: inside the tolerance, transparent. Out to twice the tolerance, alpha falls off (that band is the
 * blend, and it belongs to the background as much as to the art). Then a despill on what is left: where
 * red and blue both run above green, the excess is magenta that soaked into the art, and it is pulled back
 * to green. Nothing in these tomb palettes is genuinely magenta, so there is nothing to protect.
 */
const keyOut = async (input: sharp.Sharp, key: string, tolerance: number): Promise<sharp.Sharp> => {
  const [kr, kg, kb] = hexToRgb(key)
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const keyIsMagenta = kr > 200 && kb > 200 && kg < 120
  for (let i = 0; i < data.length; i += info.channels) {
    const d = Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb)
    if (d <= tolerance) {
      data[i + 3] = 0
      continue
    }
    if (d < tolerance * 2) data[i + 3] = Math.round(data[i + 3] * ((d - tolerance) / tolerance))
    if (keyIsMagenta) {
      const spill = Math.min(data[i], data[i + 2]) - data[i + 1]
      if (spill > 0) {
        data[i] -= spill
        data[i + 2] -= spill
      }
    }
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
  const repeat = Number(arg("repeat", "1"))
  const tileW = Math.round(w / repeat)
  const tileH = Math.round(h / repeat)
  const resized = await img
    // `fill`: the slot's size is not negotiable, and the prompts ask for the slot's aspect, so any
    // squashing here is the generation's own aspect being wrong — better visible than silently cropped.
    .resize(tileW, tileH, { fit: "fill", kernel: smooth ? "lanczos3" : "nearest" })
    .png()
    .toBuffer()

  // One tile, or a grid of a smaller copy. A generator draws a floor's subject at whatever scale it likes
  // and cannot be talked down reliably; shrinking and repeating is the one lever that needs no re-roll.
  //
  // `repeat` is fractional on purpose. A whole number is what makes a repeat VISIBLE — at 2 the megatile
  // is four identical quarters and the eye finds them at once. At 1.4 the copies run off the edge and are
  // cropped, so no two are the same, and because the source is already seamless (run `make-seamless` on
  // it first) the crop still tiles.
  const across = Math.ceil(w / tileW)
  const down = Math.ceil(h / tileH)
  const tiles =
    repeat === 1
      ? sharp(resized)
      : sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(
          Array.from({ length: across * down }, (_, i) => ({
            input: resized,
            left: (i % across) * tileW,
            top: Math.floor(i / across) * tileH,
          }))
        )

  // Blends the art toward the material it is supposed to BE: a flat wash of that colour, laid over at
  // `flatten` opacity. A generator overshoots contrast far more often than it undershoots, and a surface is
  // background — it has to sit behind the props and the explorer rather than compete. 0 leaves it alone.
  //
  // Toward the palette, not toward the image's own mean. Flattening toward a mean is flattening toward grey
  // and the hue goes with it (measured: -4 warmth at a strength that only halved the spread). Toward the
  // palette, calming down and staying in the palette are the same move.
  //
  // Which colour depends on the slot, and getting this wrong is worse than not flattening: the map's depth
  // comes from a wall face being DARKER than the floor in front of it, so a wall washed toward the floor's
  // slab colour is a wall that stops being a wall.
  const flatten = Number(arg("flatten", "0"))
  const laid = await tiles.png().toBuffer()
  const palette = tierPalette[tier as Difficulty]
  const washColour = slot === "face" || slot === "wall" ? palette?.wall : palette?.slab
  const [wr, wg, wb] = hexToRgb(washColour ?? "#000000")
  const wash = {
    input: {
      create: { width: w, height: h, channels: 4 as const, background: { r: wr, g: wg, b: wb, alpha: flatten } },
    },
  }
  await sharp(laid)
    .composite(flatten > 0 ? [wash] : [])
    .png({ compressionLevel: 9 })
    .toFile(out)

  const meta = await sharp(out).metadata()
  console.log(`${out} — ${meta.width}x${meta.height}, ${slot} slot${key === "none" ? "" : `, keyed ${key}`}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
