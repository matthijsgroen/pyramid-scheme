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
 *   --size=768       the longest side of the shipped file; never enlarged
 *
 * A keyed piece also gets src/assets/camp/<name>-shadow.webp, its contact shadow: a black band along the
 * object's base, following its own base contour column by column, blurred once here so the scene never runs
 * a filter, on the same canvas so it lines up with the piece's frame. A whole silhouette laid flat cannot
 * follow the base of an object seen from 3/4 above; a band under that base can. Scenery is ground and sky,
 * not something standing on it, so it casts none.
 */
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import sharp from "sharp"
import { keyOut } from "./keyOut"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

export type CampImport = {
  file: string
  name: string
  /** A hex colour, or "none" to leave the background alone. */
  key: string
  tolerance: number
  size: number
  outRoot: string
  masterRoot: string
}

const SCENERY = new Set(["sand", "dunes", "pyramid", "pyramidGold"])

/** The blur's spread as a share of the piece's longest side, so a shadow looks the same at any import size. */
const SHADOW_BLUR = 0.008
/** How far the band reaches up from the object's lowest pixel in each column, as a share of the canvas height. */
const SHADOW_BAND = 0.06
/** The alpha from which a pixel counts as the object, not its keyed fringe. */
const OPAQUE = 128

/** Per column, a full band from the lowest opaque pixel upward. */
const baseBand = (alpha: Buffer, width: number, height: number) => {
  const band = Math.max(1, Math.round(height * SHADOW_BAND))
  const out = Buffer.alloc(width * height)
  for (let x = 0; x < width; x++) {
    let bottom = height - 1
    while (bottom >= 0 && alpha[bottom * width + x] < OPAQUE) bottom--
    for (let y = bottom; y >= 0 && y > bottom - band; y--) out[y * width + x] = 255
  }
  return out
}

const writeShadow = async (piece: Buffer, path: string) => {
  const { data: alpha, info } = await sharp(piece).extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const data = await sharp(baseBand(alpha, width, height), { raw: { width, height, channels: 1 } })
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

export const importCamp = async ({ file, name, key, tolerance, size, outRoot, masterRoot }: CampImport) => {
  mkdirSync(outRoot, { recursive: true })
  mkdirSync(masterRoot, { recursive: true })
  const master = join(masterRoot, `${name}.webp`)
  const out = join(outRoot, `${name}.webp`)
  await sharp(file).webp({ quality: 92 }).toFile(master)
  const source = sharp(file)
  const keyed = key === "none" ? source.ensureAlpha() : await keyOut(source, key, tolerance)
  const piece = await keyed.resize(size, size, { fit: "inside", withoutEnlargement: true }).png().toBuffer()
  await sharp(piece).webp({ quality: 90 }).toFile(out)
  if (key === "none" || SCENERY.has(name)) return { out, master }
  const shadow = join(outRoot, `${name}-shadow.webp`)
  await writeShadow(piece, shadow)
  return { out, master, shadow }
}

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const main = async () => {
  const file = process.argv[2]
  const name = arg("name")
  if (!file || file.startsWith("--") || !name) {
    console.error("usage: yarn import-camp <file> --name=<piece> [--key=#ff00ff|none] [--tolerance=60] [--size=768]")
    process.exit(1)
  }
  const { out, master, shadow } = await importCamp({
    file,
    name,
    key: arg("key", "#ff00ff")!,
    tolerance: Number(arg("tolerance", "60")),
    size: Number(arg("size", "768")),
    outRoot: join(ROOT, "src", "assets", "camp"),
    masterRoot: join(ROOT, "art", "masters", "camp"),
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
