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
 *   --headroom=0.25  (face) squeeze the art into the LOWER part of the slot and cap the rest. The
 *                    renderer draws the wall's top surface over the top of a face, so that much of the
 *                    art is never seen — and a frieze drawn to the top of the picture comes out with its
 *                    figures' heads cut off by it.
 *   --mask=render.png cut the art to another image's alpha. For the render-and-repaint pipeline: the
 *                    Blender render's alpha is the true silhouette, and a repaint that softened an edge
 *                    into the magenta leaves a keyed halo the despill cannot reach. Masking to the
 *                    render throws that away and guarantees the shape the geometry actually had.
 *   --brightness=0.8 scale everything darker (or lighter above 1). The failure an OBJECT actually has is
 *                    chalky highlights — a prop comes back lit for a gallery rather than for a cellar —
 *                    and no wording has reliably prevented it. Uses a brightness modulation rather than a
 *                    linear scale so the alpha channel, and with it the object's silhouette, is untouched.
 *   --contrast=1.25  push values away from mid-grey before anything else — the inverse of --flatten, for
 *                    a roll whose carving is too shallow to read. 1 leaves it alone; below 1 is not
 *                    allowed, as it would eat an object's transparency.
 *   --flatten=0.5    blend toward the material the slot is made of — the rank's slab for a floor, its wall
 *                    for a face — so a surface sits behind the props. Toward the palette, not toward grey.
 *   --no-trim        keep the frame as generated instead of re-seating the object on the floor line.
 *                    On an arch it skips the trim that discards everything around the timber.
 *   --flip           mirror horizontally. The renderer mirrors EAST into west, so a side view drawn
 *                    facing left has to come in facing right
 */

import { mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { ARCH_H, ARCH_W, CELL, WALL_H } from "../src/app/SiteMap/mapScale"
import { keyOut } from "./keyOut"
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
  // A sill fills the gap between two rows: a cell wide, a wall band deep. It was 56x12 here and in the
  // brief, a size the renderer never draws — the art came back a twelfth of a cell tall and was stretched
  // to fill a band nearly three times that.
  sill: { w: TILE, h: WALL_H, seat: false },
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
 * Fits an archway to the slot's own geometry: jamb, opening, jamb at exactly `SIDE_W` : `CELL` : `SIDE_W`.
 *
 * An arch is drawn as an OBJECT — two posts and a beam, magenta outside it and magenta through it — not as
 * a piece of wall with a hole. Asked for a doorway in a wall, a model draws a generous stretch of wall
 * around it and the way through comes out a third of the width instead of two thirds. Asked for the
 * gateway alone, the only thing in the picture is the thing the slot wants.
 *
 * Two things then have to be true, and neither can be asked for:
 *
 * - The bounding box must be the TIMBER. A single stray off-background pixel at the canvas edge defeats a
 *   naive trim, which is exactly what happened: one pixel in the last column kept the full 2000-wide
 *   canvas, the frame was squashed into the left six sevenths of the slot, and the arch sat off-centre
 *   with the wall showing through where its right post should have been. So a row or column counts as
 *   content only when a real share of it is opaque.
 * - The posts must land in the CORNER slots either side of the doorway, because that is where a jamb
 *   belongs and what keeps the way through a full cell wide. A model puts them wherever it likes, so the
 *   three vertical bands are measured and rescaled to the widths the slot defines.
 */
const fitToDoorway = async (img: sharp.Sharp, w: number, h: number, smooth: boolean): Promise<sharp.Sharp> => {
  const kernel = smooth ? "lanczos3" : "nearest"
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const opaque = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3] >= 128

  /** The range of rows or columns carrying a real share of the drawing, not one stray pixel. */
  const span = (count: number, across: number, at: (i: number, j: number) => boolean) => {
    const floor = Math.max(2, Math.round(across * 0.01))
    const filled: boolean[] = []
    for (let i = 0; i < count; i++) {
      let n = 0
      for (let j = 0; j < across; j++) if (at(i, j)) n++
      filled.push(n >= floor)
    }
    return [filled.indexOf(true), filled.lastIndexOf(true)] as const
  }

  const [left, right] = span(info.width, info.height, (x, y) => opaque(x, y))
  const [top, bottom] = span(info.height, info.width, (y, x) => opaque(x, y))
  if (right < 0 || bottom < 0) throw new Error("nothing to import: the whole frame keyed out")

  // The opening, measured on a row below the beam where only the two posts are left — scanning OUTWARD
  // from the middle, because a beam overhangs its posts and a scan inward from the edge finds the gap
  // under that overhang instead of the doorway.
  const probe = Math.round(bottom - (bottom - top) * 0.15)
  const middle = Math.round((left + right) / 2)
  let openFrom = middle
  while (openFrom > left && !opaque(openFrom - 1, probe)) openFrom--
  let openTo = middle
  while (openTo < right && !opaque(openTo + 1, probe)) openTo++

  const band = async (from: number, to: number, width: number) =>
    await img
      .clone()
      .extract({ left: from, top, width: to - from + 1, height: bottom - top + 1 })
      .resize(width, h, { fit: "fill", kernel })
      .png()
      .toBuffer()

  // The POSTS, not "everything either side of the opening": a beam overhangs its posts, and carrying that
  // overhang into the corner slot leaves the post too narrow to fill it — so the wall shows through beside
  // the doorway. The overhang is discarded and the beam ends flush with the posts, which is what the slot
  // is: the doorway plus exactly one corner each side.
  let postFrom = openFrom - 1
  while (postFrom > left && opaque(postFrom - 1, probe)) postFrom--
  let postTo = openTo + 1
  while (postTo < right && opaque(postTo + 1, probe)) postTo++

  const jamb = (w - CELL) / 2
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: await band(postFrom, openFrom - 1, jamb), left: 0, top: 0 },
    { input: await band(openFrom, openTo, CELL), left: jamb, top: 0 },
    { input: await band(openTo + 1, postTo, jamb), left: w - jamb, top: 0 },
  ])
}

/**
 * Squeezes a face into the lower part of its slot, capping the space above it with the wall's own top
 * colour.
 *
 * The renderer paints the wall's top surface over the top of every face — a quarter of it — so a quarter
 * of the art is never seen. A wall of plain brick does not care. A wall with a PROCESSION on it does: the
 * nobleman's figures were drawn to the top of the picture and came out with their heads cut off by the
 * band. This gives the art the headroom the renderer takes.
 */
const withHeadroom = async (
  laid: Buffer,
  w: number,
  h: number,
  headroom: number,
  palette: { wallTop: string; wall: string } | undefined
): Promise<Buffer> => {
  const capH = Math.round(h * headroom)
  const [r, g, b] = hexToRgb(palette?.wallTop ?? "#000000")
  const squeezed = await sharp(laid)
    .resize(w, h - capH, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer()
  return sharp({ create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([{ input: squeezed, left: 0, top: capH }])
    .png()
    .toBuffer()
}

/** Re-seats a trimmed object on the bottom edge of its slot's aspect: what makes a prop stand on the floor
 * line rather than float in the middle of its cell. The object keeps its own proportions. */
/**
 * Replaces the art's alpha with another image's.
 *
 * The render-and-repaint pipeline has one thing the generator can never give: a true silhouette, from
 * the mesh the geometry was built from. A repaint that feathered a shadow out into the magenta leaves a
 * violet halo once keyed — the despill pulls red and blue down toward green, which cannot rescue a soft
 * edge spread over a hundred pixels. Cutting to the render's own alpha removes it by construction, and
 * pins the shape against any drift the repaint introduced.
 */
const cutToMask = async (img: sharp.Sharp, maskPath: string): Promise<sharp.Sharp> => {
  const art = await img.ensureAlpha().png().toBuffer({ resolveWithObject: true })
  const { width, height } = art.info
  // `dest-in` keeps the art only where the mask is opaque, which is the same idiom make-seamless uses.
  // `joinChannel` looks like the direct way to do it and does not work here: the joined band never
  // becomes alpha and every pixel comes out opaque.
  const mask = await sharp(maskPath).ensureAlpha().resize(width, height, { fit: "fill" }).png().toBuffer()
  // Rendered out before it goes back into the pipeline. sharp resizes BEFORE it composites, so a lazy
  // composite handed downstream is applied at the wrong size — the same trap make-seamless documents.
  const cut = await sharp(art.data)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()
  return sharp(cut)
}

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
  // After the key: an arch is an object with magenta on both sides, so one pass finds its timber and
  // seats its posts in the corner slots. It is already at the slot size when it comes back.
  const archFitted = slot === "arch" && !process.argv.includes("--no-trim")
  if (archFitted) img = await fitToDoorway(img, w, h, smooth)
  const maskPath = arg("mask")
  if (maskPath) img = await cutToMask(img, maskPath)
  if (seat && !process.argv.includes("--no-trim")) img = await seatOnFloorLine(img, w / h)

  const dir = join(OUT_ROOT, tier)
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `${name}.png`)
  const repeat = Number(arg("repeat", "1"))
  const tileW = Math.round(w / repeat)
  // A face repeats HORIZONTALLY only, the same axis `make-seamless --axis=x` works on: its bands are
  // registered top to bottom and stacking a second copy under them would draw two walls. It is also the
  // one slot whose art is not shown at the shape it is stored in — the renderer draws a 448x56 face into
  // a 448x28 band — so a face drawn at 8:1 arrives on screen at 16:1 and reads stretched. `--repeat=2`
  // on a face is the correction: half as wide per copy, which is the aspect it is SEEN at.
  const tileH = slot === "face" ? h : Math.round(h / repeat)
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
  const palette = tierPalette[tier as Difficulty]
  const flatten = Number(arg("flatten", "0"))
  const headroom = Number(arg("headroom", "0"))
  // Contrast first, so it acts on the ART: the headroom cap is a flat band of the wall's own top colour
  // and must stay exactly that, and the flatten wash is a correction in the other direction.
  const contrast = Number(arg("contrast", "1"))
  if (contrast < 1) throw new Error("--contrast below 1 would eat the alpha channel; use --flatten instead")
  const brightness = Number(arg("brightness", "1"))
  const lit =
    brightness === 1
      ? await tiles.png().toBuffer()
      : await sharp(await tiles.png().toBuffer())
          .modulate({ brightness })
          .png()
          .toBuffer()
  const stretched =
    contrast === 1
      ? lit
      : await sharp(lit)
          .linear(contrast, 128 * (1 - contrast))
          .png()
          .toBuffer()
  const laid = headroom > 0 ? await withHeadroom(stretched, w, h, headroom, palette) : stretched
  const washColour = ["face", "wall", "arch"].includes(slot) ? palette?.wall : palette?.slab
  const [wr, wg, wb] = hexToRgb(washColour ?? "#000000")
  const wash = {
    input: {
      create: { width: w, height: h, channels: 4 as const, background: { r: wr, g: wg, b: wb, alpha: flatten } },
    },
  }
  await sharp(laid)
    // `atop` keeps the destination's alpha, so the wash lands on the art and NOT on the hole through it.
    // An arch is the first slot with real transparency, and a plain overlay filled its doorway with stone.
    .composite(flatten > 0 ? [{ ...wash, blend: "atop" as const }] : [])
    .png({ compressionLevel: 9 })
    .toFile(out)

  const meta = await sharp(out).metadata()
  console.log(`${out} — ${meta.width}x${meta.height}, ${slot} slot${key === "none" ? "" : `, keyed ${key}`}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
