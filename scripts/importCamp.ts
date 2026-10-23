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

export const importCamp = async ({ file, name, key, tolerance, size, outRoot, masterRoot }: CampImport) => {
  mkdirSync(outRoot, { recursive: true })
  mkdirSync(masterRoot, { recursive: true })
  const master = join(masterRoot, `${name}.webp`)
  const out = join(outRoot, `${name}.webp`)
  await sharp(file).webp({ quality: 92 }).toFile(master)
  const source = sharp(file)
  const keyed = key === "none" ? source.ensureAlpha() : await keyOut(source, key, tolerance)
  await keyed.resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toFile(out)
  return { out, master }
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
  const { out, master } = await importCamp({
    file,
    name,
    key: arg("key", "#ff00ff")!,
    tolerance: Number(arg("tolerance", "60")),
    size: Number(arg("size", "768")),
    outRoot: join(ROOT, "src", "assets", "camp"),
    masterRoot: join(ROOT, "art", "masters", "camp"),
  })
  const { width, height } = await sharp(out).metadata()
  console.log(`${out}  ${width}x${height}\nmaster ${master}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
