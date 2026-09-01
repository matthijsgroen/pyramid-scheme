#!/usr/bin/env node
/**
 * Makes a tile tileable, for art that was not drawn to tile — anything an image generator hands back.
 *
 *   yarn make-seamless src/assets/tiles/junior/floor.png
 *   yarn make-seamless --axis=x src/assets/tiles/junior/wall-face.png
 *
 * The method: shift the image by half its size, wrapping (which is a diagonal quadrant swap). The
 * outer edges are then seamless BY CONSTRUCTION — they used to be the middle — and every seam has
 * collapsed into a cross through the centre. Then lay the untouched original back on top through a
 * soft mask: its centre is clean, so it covers the cross with matching content.
 *
 * --axis matters. A floor tile repeats in both directions and wants the full treatment. A wall FACE
 * repeats only horizontally: its top is the cap catching light and its bottom the dark base, so
 * shifting it vertically would destroy the very registration that makes every wall read alike. Use
 * `--axis=x` for it, and the patch becomes a vertical band rather than a disc.
 */

import { basename } from "path"
import sharp from "sharp"

type Axis = "both" | "x" | "y"

const swapHalves = async (file: string, axis: Axis): Promise<Buffer> => {
  const image = sharp(file)
  const { width, height } = await image.metadata()
  if (!width || !height) throw new Error(`${file}: no dimensions`)
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)

  // Each piece is (source rect → destination position). A wrap-around shift is exactly this: the
  // piece that was at the far side arrives at the near one.
  const pieces =
    axis === "x"
      ? [
          { left: halfW, top: 0, width: width - halfW, height, toLeft: 0, toTop: 0 },
          { left: 0, top: 0, width: halfW, height, toLeft: width - halfW, toTop: 0 },
        ]
      : axis === "y"
        ? [
            { left: 0, top: halfH, width, height: height - halfH, toLeft: 0, toTop: 0 },
            { left: 0, top: 0, width, height: halfH, toLeft: 0, toTop: height - halfH },
          ]
        : [
            { left: halfW, top: halfH, width: width - halfW, height: height - halfH, toLeft: 0, toTop: 0 },
            { left: 0, top: halfH, width: halfW, height: height - halfH, toLeft: width - halfW, toTop: 0 },
            { left: halfW, top: 0, width: width - halfW, height: halfH, toLeft: 0, toTop: height - halfH },
            { left: 0, top: 0, width: halfW, height: halfH, toLeft: width - halfW, toTop: height - halfH },
          ]

  const cut = await Promise.all(
    pieces.map(async p => ({
      input: await sharp(file).extract({ left: p.left, top: p.top, width: p.width, height: p.height }).toBuffer(),
      left: p.toLeft,
      top: p.toTop,
    }))
  )

  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cut)
    .png()
    .toBuffer()
}

// The mask that hides the cross: opaque where the shifted image is damaged (the middle), falling to
// nothing before the edges, which must stay exactly as the shift left them.
const maskFor = (width: number, height: number, axis: Axis): Buffer => {
  const stops = `<stop offset="0" stop-color="#fff" stop-opacity="1"/>
     <stop offset="0.45" stop-color="#fff" stop-opacity="1"/>
     <stop offset="0.85" stop-color="#fff" stop-opacity="0"/>`
  const gradient =
    axis === "x"
      ? `<linearGradient id="m" x1="0.5" y1="0" x2="0" y2="0" spreadMethod="reflect">${stops}</linearGradient>`
      : axis === "y"
        ? `<linearGradient id="m" x1="0" y1="0.5" x2="0" y2="0" spreadMethod="reflect">${stops}</linearGradient>`
        : `<radialGradient id="m" cx="0.5" cy="0.5" r="0.5">${stops}</radialGradient>`

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <defs>${gradient}</defs>
       <rect width="${width}" height="${height}" fill="url(#m)"/>
     </svg>`
  )
}

const makeSeamless = async (file: string, axis: Axis): Promise<string> => {
  const { width, height } = await sharp(file).metadata()
  if (!width || !height) throw new Error(`${file}: no dimensions`)

  const shifted = await swapHalves(file, axis)
  // The original, seen through the mask: clean in the middle, nothing at the edges.
  const patch = await sharp(file)
    .ensureAlpha()
    .composite([{ input: maskFor(width, height, axis), blend: "dest-in" }])
    .png()
    .toBuffer()

  await sharp(shifted)
    .composite([{ input: patch, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(file)
  return `${basename(file)} ${width}x${height} axis=${axis}`
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const axisArg = args.find(a => a.startsWith("--axis="))
  const axis = (axisArg?.split("=")[1] ?? "both") as Axis
  const files = args.filter(a => !a.startsWith("--"))
  if (files.length === 0) {
    console.error("usage: yarn make-seamless [--axis=both|x|y] <file.png> [...]")
    process.exit(1)
  }
  if (!["both", "x", "y"].includes(axis)) throw new Error(`unknown --axis=${axis}`)

  for (const file of files) console.log(`seamless: ${await makeSeamless(file, axis)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
