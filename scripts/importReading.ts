#!/usr/bin/env node
/**
 * Turns a painted wall panel into the backdrop the reading screen writes a wall's signs onto.
 *
 *   yarn import-reading art/masters/props/junior/namePanel.webp --name=henutNamePanel
 *
 * Writes `src/assets/reading/<name>.webp`, the magenta keyed out, trimmed to the panel and scaled to
 * 1024 wide: the whole width of a phone at 2x and more, where the map's own tile of the same master is
 * 112 wide. The trim matters to `Wall.panel`: its sign rectangle is a share of THIS image, so a master
 * repainted with a wider magenta margin still lands its signs inside the cartouche.
 */
import sharp from "sharp"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { keyOut } from "./keyOut"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const READING_WIDTH = 1024

export const readingPath = (name: string) => join("src", "assets", "reading", `${name}.webp`)

/** Keyed, trimmed to what is left, and scaled to the reading width. */
export const importReading = async (file: string, out: string) => {
  const keyed = await (await keyOut(sharp(file), "#ff00ff", 60)).png().toBuffer()
  const trimmed = await sharp(keyed).trim({ background: "#00000000", threshold: 10 }).png().toBuffer()
  const info = await sharp(trimmed).resize({ width: READING_WIDTH }).webp({ quality: 90 }).toFile(out)
  return { width: info.width, height: info.height }
}

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const name = process.argv.find(a => a.startsWith("--name="))?.slice("--name=".length)
  if (!file || file.startsWith("--") || !name) {
    console.error("usage: yarn import-reading <master> --name=<name>")
    process.exit(1)
  }
  const out = join(__dirname, "..", readingPath(name))
  const { width, height } = await importReading(file, out)
  console.log(`${out}  ${width}x${height}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
