#!/usr/bin/env node
/**
 * Makes an earlier camp step by cutting a free-standing object out of the next one.
 *
 *   yarn camp-cut clayOven --name=seatingStones --at=0.82,0.36
 *
 * A step that only removes an object that stands apart from the rest (the clay oven beside the fire pit)
 * needs no generation: the object is an island in the master, and cutting it out leaves every other pixel
 * exactly as it was — closer to the next step than any regenerated edit. The island under each `--at`
 * point (a share of width, height) is painted back to the key, with a small margin for its soft edge, and
 * written as the new step's master. Then `yarn import-camp art/masters/camp/<name>.webp --name=<name>`
 * lands it.
 *
 * An object that touches or overlaps the rest is not an island; that step is still an edit in Gemini.
 */
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import sharp from "sharp"
import { hexToRgb } from "./keyOut"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

/** The cut grows this share of the longest side past the island, so its soft edge goes with it. */
const MARGIN = 0.002

export type CampCut = {
  from: string
  name: string
  /** Points inside each island to cut, as shares of width and height. */
  at: [number, number][]
  masterRoot: string
  key: string
  tolerance: number
}

export const campCut = async ({ from, name, at, masterRoot, key, tolerance }: CampCut) => {
  const k = hexToRgb(key)
  const { data, info } = await sharp(join(masterRoot, `${from}.webp`))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const n = width * height
  const background = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const p = i * channels
    background[i] = Math.hypot(data[p] - k.r, data[p + 1] - k.g, data[p + 2] - k.b) <= tolerance ? 1 : 0
  }
  const cut = new Uint8Array(n)
  const queue = new Int32Array(n)
  let tail = 0
  for (const [fx, fy] of at) {
    const seed = Math.min(height - 1, Math.round(fy * height)) * width + Math.min(width - 1, Math.round(fx * width))
    if (background[seed]) throw new Error(`--at=${fx},${fy} lands on background, not on an object`)
    if (!cut[seed]) {
      cut[seed] = 1
      queue[tail++] = seed
    }
  }
  // The island: every non-background pixel connected to a seed, eight ways.
  for (let head = 0; head < tail; head++) {
    const i = queue[head]
    const x = i % width
    const y = (i - x) / width
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const j = ny * width + nx
        if (!cut[j] && !background[j]) {
          cut[j] = 1
          queue[tail++] = j
        }
      }
  }
  // Grow the cut a little so the island's soft fringe does not stay behind as a ghost outline.
  const margin = Math.max(1, Math.round(Math.max(width, height) * MARGIN))
  for (let step = 0; step < margin; step++) {
    const grown = cut.slice()
    for (let i = 0; i < n; i++) {
      if (cut[i]) continue
      const x = i % width
      if (
        (x > 0 && cut[i - 1]) ||
        (x < width - 1 && cut[i + 1]) ||
        (i >= width && cut[i - width]) ||
        (i < n - width && cut[i + width])
      )
        grown[i] = 1
    }
    cut.set(grown)
  }
  // Paint the cut with the picture's own background colour, not the exact key: a generator returns a
  // slightly different magenta, and a patch of pure key reads to it as a shape it then copies into edits.
  const fill = [0, 0, 0]
  let count = 0
  for (let i = 0; i < n; i++)
    if (background[i] && !cut[i]) {
      for (let c = 0; c < 3; c++) fill[c] += data[i * channels + c]
      count++
    }
  const colour = count > 0 ? fill.map(v => Math.round(v / count)) : [k.r, k.g, k.b]
  for (let i = 0; i < n; i++) if (cut[i]) for (let c = 0; c < 3; c++) data[i * channels + c] = colour[c]
  const out = join(masterRoot, `${name}.webp`)
  await sharp(data, { raw: { width, height, channels } }).webp({ quality: 92 }).toFile(out)
  return out
}

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback

const main = async () => {
  const from = process.argv[2]
  const name = arg("name")
  const at = process.argv
    .filter(a => a.startsWith("--at="))
    .map(a => a.slice(5).split(",").map(Number) as [number, number])
  if (!from || from.startsWith("--") || !name || at.length === 0) {
    console.error("usage: yarn camp-cut <from-piece> --name=<piece> --at=<x>,<y> [--at=…]   (x, y as shares, 0–1)")
    process.exit(1)
  }
  const out = await campCut({
    from,
    name,
    at,
    masterRoot: join(ROOT, "art", "masters", "camp"),
    key: arg("key", "#ff00ff")!,
    tolerance: Number(arg("tolerance", "60")),
  })
  console.log(`master ${out}\nnow: yarn import-camp ${out} --name=${name}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
