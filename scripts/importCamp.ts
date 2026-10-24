#!/usr/bin/env node
/**
 * Turns a generated image into a camp piece for `CampScene`.
 *
 *   yarn import-camp <file> --name=fireBowl
 *
 * Steps: keep the download as the master -> key the background out -> fit inside size x size ->
 * write to src/assets/camp/<name>.webp.
 *
 * There is NO trim. Every step of a spot is a whole-spot image and the scene swaps one for the next, so
 * all of them have to share one frame; trimming each to its own ink would shift the spot between steps.
 *
 * Flags:
 *   --key=#ff00ff    background colour to make transparent. --key=none to skip (the sand tile)
 *   --tolerance=60   how far from that colour still counts as background (0-441)
 *   --size=512       the longest side of the shipped file; never enlarged
 *   --shadow-size=256  the longest side of the contact shadow, which is blurred and needs few pixels
 *
 * Keying un-mixes the edge. A soft edge — a flame's wisps, a painted fringe — is part magenta, and a hard
 * cut leaves it as a pink rim. Within a few pixels of the background, a pixel's distance from the key sets
 * its alpha over a wide band, and the key's share is taken back out of its colour, so a flame ends in
 * orange going transparent rather than in pink. Deeper inside nothing is touched: a purple cushion is
 * paint, not background, which is also why this does not use `keyOut`'s magenta despill.
 *
 * A keyed piece also gets src/assets/camp/<name>-shadow.webp, its contact shadow: a black band along the
 * object's base, following its own base contour column by column, blurred once here so the scene never runs
 * a filter, on the same canvas so it lines up with the piece's frame. A whole silhouette laid flat cannot
 * follow the base of an object seen from 3/4 above; a band under that base can. Scenery is ground and sky,
 * not something standing on it, so it casts none.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import sharp from "sharp"
import { hexToRgb } from "./keyOut"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

export type CampImport = {
  file: string
  name: string
  /** A hex colour, or "none" to leave the background alone. */
  key: string
  tolerance: number
  size: number
  shadowSize: number
  outRoot: string
  masterRoot: string
  /** A shipped piece painted in behind this one, in the same frame: the spot's first step standing in every later one. */
  behind?: string
}

// Pieces that cast no contact shadow: the scenery, and the oasis, which lies flat in the ground.
const SCENERY = new Set(["sand", "dunes", "pyramid", "pyramidGold", "oasis"])

/** The donkey's stake is its own picture, so no edit has to keep it: every later step stands in front of it. */
export const BEHIND: Record<string, string> = Object.fromEntries(
  ["donkey", "saddlebags", "cart", "secondDonkey", "paintedCart"].map(step => [step, "halter"])
)

/** The blur's spread as a share of the piece's longest side, so a shadow looks the same at any import size. */
const SHADOW_BLUR = 0.008
/** How far the band reaches up from the object's lowest pixel in each column, as a share of the canvas height. */
const SHADOW_BAND = 0.06
/**
 * The outermost ring of the object, as a share of the download's longest side. A dark outline mixed with
 * magenta is too far from the key to count as near it, so in this ring the key's share is also read from the
 * colour's magenta cast (blue and red above green) — deep enough to take a painted edge line, too shallow to
 * thin a purple cushion.
 */
const RIM = 0.006

/** A soft edge reaches this many tolerances away from the key; alpha ramps from the tolerance up to it. */
const EDGE_RAMP = 3

/**
 * Background to alpha 0; the object's soft edge un-mixed from the key; its inside untouched.
 *
 * The edge is found by growing out of the background through every pixel still near the key, so a flame's
 * wide wisp is followed all the way in, while real paint — even purple — is too far from the key to cross.
 */
const keyUnmix = (data: Buffer, width: number, height: number, key: string, tolerance: number) => {
  const k = hexToRgb(key)
  const n = width * height
  const reach = tolerance * EDGE_RAMP
  const distance = new Float32Array(n)
  const near = new Uint8Array(n)
  const queue = new Int32Array(n)
  let tail = 0
  for (let i = 0; i < n; i++) {
    distance[i] = Math.hypot(data[i * 4] - k.r, data[i * 4 + 1] - k.g, data[i * 4 + 2] - k.b)
    if (distance[i] <= tolerance) {
      near[i] = 1
      queue[tail++] = i
    }
  }
  for (let head = 0; head < tail; head++) {
    const i = queue[head]
    const x = i % width
    const visit = (j: number) => {
      if (!near[j] && distance[j] < reach) {
        near[j] = 1
        queue[tail++] = j
      }
    }
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (i >= width) visit(i - width)
    if (i < n - width) visit(i + width)
  }
  // The rim: every pixel within a few steps of the background.
  const rimDepth = Math.max(2, Math.round(Math.max(width, height) * RIM))
  const depth = new Uint8Array(n).fill(255)
  const ring = new Int32Array(n)
  let ringTail = 0
  for (let i = 0; i < n; i++)
    if (distance[i] <= tolerance) {
      depth[i] = 0
      ring[ringTail++] = i
    }
  for (let head = 0; head < ringTail; head++) {
    const i = ring[head]
    if (depth[i] >= rimDepth) continue
    const x = i % width
    const step = (j: number) => {
      if (depth[j] === 255) {
        depth[j] = depth[i] + 1
        ring[ringTail++] = j
      }
    }
    if (x > 0) step(i - 1)
    if (x < width - 1) step(i + 1)
    if (i >= width) step(i - width)
    if (i < n - width) step(i + width)
  }
  const magentaKey = k.r > 200 && k.b > 200 && k.g < 120
  for (let i = 0; i < n; i++) {
    const p = i * 4
    if (distance[i] <= tolerance) {
      data[p + 3] = 0
      continue
    }
    const inRim = depth[i] <= rimDepth
    if (!near[i] && !inRim) continue
    let a = near[i] ? Math.min(1, (distance[i] - tolerance) / (tolerance * (EDGE_RAMP - 1))) : 1
    if (inRim && magentaKey) {
      const cast = Math.max(0, Math.min(1, (Math.min(data[p], data[p + 2]) - data[p + 1]) / 255))
      a = Math.min(a, 1 - cast)
    }
    if (a >= 1) continue
    if (a < 0.05) {
      data[p + 3] = 0
      continue
    }
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    data[p] = clamp((data[p] - (1 - a) * k.r) / a)
    data[p + 1] = clamp((data[p + 1] - (1 - a) * k.g) / a)
    data[p + 2] = clamp((data[p + 2] - (1 - a) * k.b) / a)
    data[p + 3] = Math.round(a * data[p + 3])
  }
}

/** The alpha from which a pixel counts as the object, not its keyed fringe. */
const OPAQUE = 128

/**
 * Per column, a full band from the lowest opaque pixel upward; with `ground` (the whole spot the piece is
 * part of), only where nothing of the spot lies anywhere below that foot: a roof on a tower, or a pennant waving
 * over it, is held up by the rest and casts none.
 */
const baseBand = (alpha: Buffer, width: number, height: number, ground?: Buffer) => {
  const band = Math.max(1, Math.round(height * SHADOW_BAND))
  const out = Buffer.alloc(width * height)
  for (let x = 0; x < width; x++) {
    let bottom = height - 1
    while (bottom >= 0 && alpha[bottom * width + x] < OPAQUE) bottom--
    if (bottom < 0) continue
    let rests = false
    for (let y = bottom + 2; ground && y < height; y++) rests ||= ground[y * width + x] >= OPAQUE
    if (rests) continue
    for (let y = bottom; y >= 0 && y > bottom - band; y--) out[y * width + x] = 255
  }
  return out
}

const alphaAt = async (image: Buffer | string, size: number) => {
  const small = await sharp(image).resize(size, size, { fit: "inside", withoutEnlargement: true }).png().toBuffer()
  return sharp(small).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
}

export const writeShadow = async (piece: Buffer, path: string, size: number, ground?: Buffer | string) => {
  const { data: alpha, info } = await alphaAt(piece, size)
  const { width, height } = info
  const under = ground && (await alphaAt(ground, size)).data
  const data = await sharp(baseBand(alpha, width, height, under), { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, Math.max(width, height) * SHADOW_BLUR))
    // sharp writes a one-channel input back out as sRGB; keep the one channel the alpha needs.
    .extractChannel(0)
    .raw()
    .toBuffer()
  await sharp({ create: { width, height, channels: 3, background: "#000000" } })
    .joinChannel(data, { raw: { width, height, channels: 1 } })
    .webp({ quality: 90, alphaQuality: 90 })
    .toFile(path)
}

/** The lowest opaque row of a picture, as a share of its height: where its object stands on the sand. */
export const measureFoot = async (image: Buffer | string) => {
  const { data, info } = await sharp(image).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  for (let y = info.height - 1; y >= 0; y--)
    for (let x = 0; x < info.width; x++) if (data[y * info.width + x] >= OPAQUE) return (y + 1) / info.height
  return 1
}

/** Each piece's foot, read by the scene to shear a cast shadow about the line its object stands on. */
export const recordFoot = async (outRoot: string, name: string, image: Buffer | string) => {
  const path = join(outRoot, "feet.json")
  const feet: Record<string, number> = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}
  feet[name] = Math.round((await measureFoot(image)) * 1000) / 1000
  const sorted = Object.fromEntries(Object.entries(feet).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`)
}

export const importCamp = async ({
  file,
  name,
  key,
  tolerance,
  size,
  shadowSize,
  outRoot,
  masterRoot,
  behind,
}: CampImport) => {
  mkdirSync(outRoot, { recursive: true })
  mkdirSync(masterRoot, { recursive: true })
  const master = join(masterRoot, `${name}.webp`)
  const out = join(outRoot, `${name}.webp`)
  // A re-import from the master itself (a new size, a better keyer) keeps it: re-encoding would lose detail.
  if (resolve(file) !== resolve(master)) await sharp(file).webp({ quality: 92 }).toFile(master)
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (key !== "none") keyUnmix(data, info.width, info.height, key, tolerance)
  const keyed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(size, size, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
  const under = behind && join(outRoot, `${behind}.webp`)
  if (under && !existsSync(under)) console.warn(`${behind} is not imported yet; ${name} lands without it`)
  const piece =
    under && existsSync(under)
      ? await sharp(under)
          .resize((await sharp(keyed).metadata()).width)
          .composite([{ input: keyed }])
          .png()
          .toBuffer()
      : keyed
  await sharp(piece).webp({ quality: 90 }).toFile(out)
  if (key === "none" || SCENERY.has(name)) return { out, master }
  await recordFoot(outRoot, name, piece)
  const shadow = join(outRoot, `${name}-shadow.webp`)
  await writeShadow(piece, shadow, shadowSize)
  return { out, master, shadow }
}

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const main = async () => {
  const file = process.argv[2]
  const name = arg("name")
  if (!file || file.startsWith("--") || !name) {
    console.error(
      "usage: yarn import-camp <file> --name=<piece> [--key=#ff00ff|none] [--tolerance=60] [--size=512] [--shadow-size=256]"
    )
    process.exit(1)
  }
  const { out, master, shadow } = await importCamp({
    file,
    name,
    key: arg("key", "#ff00ff")!,
    tolerance: Number(arg("tolerance", "60")),
    size: Number(arg("size", "512")),
    shadowSize: Number(arg("shadow-size", "256")),
    outRoot: join(ROOT, "src", "assets", "camp"),
    masterRoot: join(ROOT, "art", "masters", "camp"),
    behind: BEHIND[name],
  })
  const { width, height } = await sharp(out).metadata()
  console.log(`${out}  ${width}x${height}\nmaster ${master}${shadow ? `\nshadow ${shadow}` : ""}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
