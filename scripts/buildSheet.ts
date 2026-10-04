#!/usr/bin/env node
/**
 * Lays frames out as a sprite sheet, one row per prefix: the sheet `cut-sheet` takes apart again.
 *
 *   yarn build-sheet /tmp/explorer.png explorer-s explorer-n explorer-e --from=art/masters/explorer
 *
 * A row is every `<prefix>-<n>.png|webp` in --from, in frame order. Every frame gets the same cell,
 * bottom-centred, so the character keeps one size and one floor line; gutters and the margin are flat
 * magenta, which is what `cut-sheet` finds sprites by and what a generator is asked to keep.
 *
 * The sheet is something to hand an image model to EDIT ("the same sheet, now carrying a stone"), which
 * holds the character far better than asking for him again from references.
 *
 * Flags:
 *   --from=DIR    where the frames are (default: src/assets/tiles/default)
 *   --scale=1     enlarge every frame; the 40x70 imports want 8 or so, the large masters 1
 */

import { readdirSync } from "fs"
import { join } from "path"
import { pathToFileURL } from "url"
import sharp from "sharp"

const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 }

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

/** `<prefix>-<n>` files in a directory, by n; a bare `<prefix>` file is a one-frame row. */
export const framesOf = (dir: string, prefix: string): string[] => {
  const pattern = new RegExp(`^${prefix}(?:-(\\d+))?\\.(png|webp)$`)
  return readdirSync(dir)
    .map(file => ({ file, m: file.match(pattern) }))
    .filter(({ m }) => m)
    .sort((a, b) => Number(a.m![1] ?? 0) - Number(b.m![1] ?? 0))
    .map(({ file }) => join(dir, file))
}

export const buildSheet = async (rows: readonly (readonly string[])[], scale = 1): Promise<Buffer> => {
  const frames = await Promise.all(
    rows.map(row =>
      Promise.all(
        row.map(async file => {
          const { width = 0, height = 0 } = await sharp(file).metadata()
          const w = Math.round(width * scale)
          const h = Math.round(height * scale)
          return { input: await sharp(file).resize(w, h, { kernel: "lanczos3" }).png().toBuffer(), w, h }
        })
      )
    )
  )
  const all = frames.flat()
  const cellW = Math.max(...all.map(f => f.w))
  const cellH = Math.max(...all.map(f => f.h))
  // Gutters a third of a cell wide: wide enough that no generator closes them up, which cut-sheet needs.
  const gap = Math.round(cellW / 3)
  const margin = cellW
  const columns = Math.max(...frames.map(row => row.length))
  const composites = frames.flatMap((row, r) =>
    row.map((f, c) => ({
      input: f.input,
      left: margin + c * (cellW + gap) + Math.round((cellW - f.w) / 2),
      top: margin + r * (cellH + gap) + cellH - f.h,
    }))
  )
  return sharp({
    create: {
      width: margin * 2 + columns * cellW + (columns - 1) * gap,
      height: margin * 2 + rows.length * cellH + (rows.length - 1) * gap,
      channels: 4,
      background: MAGENTA,
    },
  })
    .composite(composites)
    .flatten({ background: MAGENTA })
    .png()
    .toBuffer()
}

const main = async (): Promise<void> => {
  const [out, ...prefixes] = process.argv.slice(2).filter(a => !a.startsWith("--"))
  if (!out || prefixes.length === 0) {
    console.error("usage: yarn build-sheet <out.png> <prefix> [<prefix> ...] [--from=DIR] [--scale=1]")
    process.exit(1)
  }
  const dir = arg("from", "src/assets/tiles/default")!
  const rows = prefixes.map(prefix => framesOf(dir, prefix))
  rows.forEach((row, i) => {
    if (row.length === 0) throw new Error(`no ${prefixes[i]} frames in ${dir}`)
    console.log(`  ${prefixes[i]}: ${row.length} frames`)
  })
  await sharp(await buildSheet(rows, Number(arg("scale", "1")))).toFile(out)
  console.log(`sheet → ${out}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
