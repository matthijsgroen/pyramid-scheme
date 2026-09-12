#!/usr/bin/env node
/**
 * Cuts a generated sprite sheet into one file per sprite.
 *
 *   yarn cut-sheet ~/Downloads/sheet.png --out=/tmp/frames --rows=front,back,side
 *
 * **How many frames the model gives you stops mattering.** Ask for a walk cycle and you get six columns
 * whether you wanted four or three; ask for four and you get six anyway. So the frame count is not
 * negotiated with the model — the sheet is cut here, and whatever you need is picked out of it.
 *
 * It finds the sprites by their GUTTERS, not by an even grid: the rows and columns a model lays out are
 * never on an exact pitch, and slicing a 6-wide sheet into six equal columns cuts a torch off one sprite
 * and staples it to the next. A run of background pixels spanning the full height of a band is a gutter;
 * everything between two gutters is a sprite.
 *
 * Flags:
 *   --out=DIR        where to write (default: alongside the sheet, in <name>-frames/)
 *   --rows=a,b,c     names for the bands, top to bottom. Extra bands get numbers
 *   --key=#ff00ff    background colour. Default: whatever the top-left pixel is, which is what a
 *                    generated sheet's background always is
 *   --tolerance=60   how far from that colour still counts as background
 *   --min=0.6        drop a sprite narrower than this fraction of its band's widest — that is how the
 *                    one clipped by the canvas edge gets left out instead of imported half-width
 *   --ragged         keep each frame at its own bounding box. Off by default: see below
 */

import { mkdirSync } from "fs"
import { basename, dirname, join } from "path"
import sharp from "sharp"

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Runs of `true` in a boolean strip, as [start, end] pairs — the sprites between the gutters. */
const runs = (occupied: boolean[]): Array<[number, number]> => {
  const out: Array<[number, number]> = []
  let start: number | null = null
  for (let i = 0; i <= occupied.length; i++) {
    if (i < occupied.length && occupied[i]) start ??= i
    else if (start !== null) {
      out.push([start, i - 1])
      start = null
    }
  }
  return out
}

/**
 * Every frame comes out the same size, bottom-centred, unless --ragged.
 *
 * A generated sheet's frames are not the same size — on the one this was built for, the side views stood
 * 465px tall against the front's 382, because the brim and the flame reach further. Imported each to its
 * own tight box, every facing then fills the slot on its own terms and the CHARACTER CHANGES SIZE when it
 * turns around. Padding to one box across the whole sheet gives all of them a single scale and a single
 * floor line, which is what a sprite sheet is supposed to guarantee and this kind never does.
 */
const main = async (): Promise<void> => {
  const file = process.argv[2]
  if (!file || file.startsWith("--")) {
    console.error("usage: yarn cut-sheet <sheet.png> [--out=DIR] [--rows=front,back,side] [--key=#ff00ff]")
    process.exit(1)
  }
  const outDir = arg("out") ?? join(dirname(file), `${basename(file).replace(/\.[^.]+$/, "")}-frames`)
  const rowNames = (arg("rows") ?? "").split(",").filter(Boolean)
  const tolerance = Number(arg("tolerance", "60"))
  const minFraction = Number(arg("min", "0.6"))

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const at = (x: number, y: number): number => (y * info.width + x) * info.channels
  const keyArg = arg("key")
  const [kr, kg, kb] = keyArg ? hexToRgb(keyArg) : [data[0], data[1], data[2]]
  const isBg = (x: number, y: number): boolean => {
    const i = at(x, y)
    return data[i + 3] < 24 || Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb) <= tolerance
  }

  // Bands first (rows of sprites), then sprites within each band. Same rule both ways.
  const rowOccupied: boolean[] = []
  for (let y = 0; y < info.height; y++) {
    let any = false
    for (let x = 0; x < info.width && !any; x++) if (!isBg(x, y)) any = true
    rowOccupied.push(any)
  }
  const bands = runs(rowOccupied)
  console.log(`background #${[kr, kg, kb].map(c => c.toString(16).padStart(2, "0")).join("")}, ${bands.length} bands`)

  mkdirSync(outDir, { recursive: true })
  let written = 0
  // Pass one measures every frame; pass two writes them into a common box.
  type Frame = { name: string; left: number; top: number; width: number; height: number }
  const frames: Frame[] = []
  for (const [bi, [y0, y1]] of bands.entries()) {
    const colOccupied: boolean[] = []
    for (let x = 0; x < info.width; x++) {
      let any = false
      for (let y = y0; y <= y1 && !any; y++) if (!isBg(x, y)) any = true
      colOccupied.push(any)
    }
    const sprites = runs(colOccupied)
    const widest = Math.max(...sprites.map(([a, b]) => b - a + 1))
    const name = rowNames[bi] ?? `row${bi + 1}`
    const kept: string[] = []
    for (const [si, [x0, x1]] of sprites.entries()) {
      const w = x1 - x0 + 1
      // A sprite the canvas edge cut in half is not a frame. Reported, not silently dropped: it is the
      // most common thing wrong with a generated sheet, and worth seeing rather than wondering about.
      if (w < widest * minFraction) {
        console.log(`  ${name} ${si + 1}: ${w}px wide against ${widest} — CLIPPED, skipped`)
        continue
      }
      // Tight to the sprite's own content vertically too, so each frame is its own bounding box.
      let top = y1
      let bottom = y0
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          if (!isBg(x, y)) {
            if (y < top) top = y
            if (y > bottom) bottom = y
            break
          }
      frames.push({ name: `${name}-${si + 1}`, left: x0, top, width: w, height: bottom - top + 1 })
      kept.push(`${name}-${si + 1} ${w}x${bottom - top + 1}`)
    }
    console.log(`  ${name}: ${kept.join(" | ")}`)
  }

  const ragged = process.argv.includes("--ragged")
  const boxW = Math.max(...frames.map(f => f.width))
  const boxH = Math.max(...frames.map(f => f.height))
  if (!ragged) console.log(`one box for all of them: ${boxW}x${boxH}, bottom-centred`)
  for (const f of frames) {
    const cut = await sharp(file).extract(f).png().toBuffer()
    const out = join(outDir, `${f.name}.png`)
    if (ragged) await sharp(cut).toFile(out)
    else
      await sharp({
        create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([{ input: cut, left: Math.round((boxW - f.width) / 2), top: boxH - f.height }])
        .png()
        .toFile(out)
    written++
  }
  console.log(`${written} frames → ${outDir}`)
  console.log("next: yarn import-tile <frame> --tier=default --name=explorer-s --slot=explorer")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
