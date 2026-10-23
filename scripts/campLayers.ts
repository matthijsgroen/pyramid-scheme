#!/usr/bin/env node
/**
 * Cuts every layer step of the camp catalogue out of its spot's pictures, for `CampScene`.
 *
 *   yarn camp-layers
 *
 * A layer step's picture is the step before it plus one object, so the object is the pixels where the two
 * differ and the newer one is opaque. Regeneration leaves faint differences all over; two majority passes
 * and dropping small islands take those out, and a slight blur softens the cut's edge. Each layer lands in
 * src/assets/camp/layers/<piece>.webp with its contact shadow beside it, on the spot's frame.
 *
 * A layer source (LAYER_SOURCES) swaps either picture: an extra edit made only to be cut from, or an
 * earlier step to cut against when the previous one hides part of the object. A step whose pictures are
 * not painted yet is skipped with a note.
 */
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import sharp from "sharp"
import { CAMP_CATALOGUE } from "../src/ui/atoms/campScene/campCatalogue"
import type { CampCatalogue } from "../src/ui/atoms/campScene/campTypes"
import { writeShadow } from "./importCamp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

/** `with` is the picture holding the object, `without` the one it is cut against; both are piece ids. */
export type LayerSource = { with?: string; without?: string }

export const LAYER_SOURCES: Record<string, LayerSource> = {
  // The star cloth was painted under the compass, so its own edit (no compass) gives it whole, on the bare table.
  starMap: { with: "starMap-cloth", without: "table" },
  // The tent's canvas is the windbreak's colour, so against the windbreak it would come out full of holes.
  tent: { without: "blanket" },
  // Each growth stage of the first palm is the whole plant, so each is cut against the bare bed.
  // The ibis pond adds to the fixed oasis pool, so its first step is cut against the bare pool.
  edgeStones: { without: "oasis" },
  seed: { without: "bed" },
  sprout: { without: "bed" },
  palm: { without: "bed" },
  secondPalm: { without: "palm" },
  dates: { without: "secondPalm" },
  lotusPlanter: { without: "dates" },
  figTree: { without: "lotusPlanter" },
}

/** Summed |ΔRGBA| above which a pixel belongs to the object. */
const DIFFERENCE = 45
/** Alpha in the newer picture from which a pixel counts as painted. */
const PAINTED = 20
/** Islands smaller than this share of the frame are regeneration noise, not part of the object. */
const ISLAND = 0.0008
const EDGE_BLUR = 0.8

type Raw = { data: Buffer; width: number; height: number }

const readRaw = async (file: string, size?: { width: number; height: number }): Promise<Raw> => {
  const image = sharp(file).ensureAlpha()
  const { data, info } = await (size ? image.resize(size.width, size.height) : image)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/** Keeps a pixel set when at least five of its 3×3 neighbourhood are set. */
const majority = (mask: Uint8Array, width: number, height: number) => {
  const source = mask.slice()
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      let set = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set += source[(y + dy) * width + x + dx] ? 1 : 0
      mask[y * width + x] = set >= 5 ? 255 : 0
    }
}

/** Clears every eight-connected island of set pixels smaller than `min`. */
const dropIslands = (mask: Uint8Array, width: number, height: number, min: number) => {
  const seen = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    let tail = 0
    queue[tail++] = start
    seen[start] = 1
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
          if (mask[j] && !seen[j]) {
            seen[j] = 1
            queue[tail++] = j
          }
        }
    }
    if (tail < min) for (let k = 0; k < tail; k++) mask[queue[k]] = 0
  }
}

/** The object `withFile` adds to `withoutFile`, as a PNG on `withFile`'s frame; all of it without a `withoutFile`. */
export const cutLayer = async (withFile: string, withoutFile?: string) => {
  const a = await readRaw(withFile)
  const { width, height } = a
  const b = withoutFile ? await readRaw(withoutFile, { width, height }) : undefined
  const n = width * height
  const mask = new Uint8Array(n)
  for (let p = 0; p < n; p++) {
    const i = p * 4
    if (a.data[i + 3] <= PAINTED) continue
    if (!b) {
      mask[p] = 255
      continue
    }
    let d = 0
    for (let c = 0; c < 4; c++) d += Math.abs(a.data[i + c] - b.data[i + c])
    if (d > DIFFERENCE) mask[p] = 255
  }
  if (b) {
    majority(mask, width, height)
    majority(mask, width, height)
    dropIslands(mask, width, height, Math.max(1, Math.round(n * ISLAND)))
  }
  const soft = await sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } })
    .blur(EDGE_BLUR)
    // sharp writes a one-channel input back out as sRGB; keep the one channel the alpha needs.
    .extractChannel(0)
    .raw()
    .toBuffer()
  const out = Buffer.from(a.data)
  for (let p = 0; p < n; p++) out[p * 4 + 3] = Math.min(out[p * 4 + 3], soft[p])
  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
}

/** Per layer step, the picture holding the object and the one it is cut against. */
export const layerJobs = (catalogue: CampCatalogue, sources: Record<string, LayerSource>) =>
  catalogue.spots.flatMap(spot =>
    spot.steps.flatMap((step, i) =>
      step.layer
        ? step.pieces.map(piece => ({
            id: piece.id,
            with: sources[piece.id]?.with ?? piece.id,
            without: sources[piece.id]?.without ?? spot.steps[i - 1]?.pieces[0].id,
          }))
        : []
    )
  )

export type CampLayers = {
  catalogue: CampCatalogue
  sources: Record<string, LayerSource>
  /** src/assets/camp: the steps' pictures, and `layers/` for the cuts. */
  assetsRoot: string
  shadowSize: number
}

export const campLayers = async ({ catalogue, sources, assetsRoot, shadowSize }: CampLayers) => {
  const outRoot = join(assetsRoot, "layers")
  mkdirSync(outRoot, { recursive: true })
  const written: string[] = []
  const skipped: { id: string; missing: string[] }[] = []
  for (const job of layerJobs(catalogue, sources)) {
    const file = (id: string) => join(assetsRoot, `${id}.webp`)
    const missing = [job.with, job.without].filter((id): id is string => !!id && !existsSync(file(id)))
    if (missing.length > 0) {
      skipped.push({ id: job.id, missing })
      continue
    }
    const layer = await cutLayer(file(job.with), job.without && file(job.without))
    const out = join(outRoot, `${job.id}.webp`)
    await sharp(layer).webp({ quality: 90 }).toFile(out)
    await writeShadow(layer, join(outRoot, `${job.id}-shadow.webp`), shadowSize)
    written.push(out)
  }
  return { written, skipped }
}

const main = async () => {
  const { written, skipped } = await campLayers({
    catalogue: CAMP_CATALOGUE,
    sources: LAYER_SOURCES,
    assetsRoot: join(ROOT, "src", "assets", "camp"),
    shadowSize: 256,
  })
  for (const out of written) console.log(out)
  for (const { id, missing } of skipped) console.log(`skipped ${id}: not painted yet (${missing.join(", ")})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
