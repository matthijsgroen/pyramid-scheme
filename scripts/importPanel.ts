#!/usr/bin/env node
/**
 * Turns a painted whole-wall panel into the wall a rank's tableau and encounters are set against.
 *
 *   yarn import-panel art/masters/tombWall/starter.webp --tier=starter
 *
 * Writes `src/assets/tombWall/<tier>.webp` at 1200x1200, webp quality 92 — what the five shipped panels
 * measure. The panel is laid with `cover` (src/ui/atoms/tombImageMap.ts), never tiled, so nothing here
 * makes it seamless. A return that is not square is cut to its centre square, and says so.
 */
import sharp from "sharp"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { difficulties } from "../src/data/difficultyLevels"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const PANEL = 1200

/** The centre square of an image: the whole of a square one, the middle of anything else. */
export const squareCut = ({ width, height }: { width: number; height: number }) => {
  const size = Math.min(width, height)
  return { left: Math.floor((width - size) / 2), top: Math.floor((height - size) / 2), width: size, height: size }
}

/** A rank's wall, or a tileset that is no rank (the cave). */
const PANEL_TIERS: string[] = [...difficulties, "cave"]

export const panelPath = (tier: string) => join("src", "assets", "tombWall", `${tier}.webp`)

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const tier = process.argv.find(a => a.startsWith("--tier="))?.slice("--tier=".length)
  if (!file || file.startsWith("--") || !tier || !PANEL_TIERS.includes(tier)) {
    console.error(`usage: yarn import-panel <master> --tier=<${PANEL_TIERS.join("|")}>`)
    process.exit(1)
  }
  const { width = 0, height = 0 } = await sharp(file).metadata()
  const cut = squareCut({ width, height })
  if (cut.width !== width || cut.height !== height)
    console.log(`${width}x${height} is not square: kept the centre ${cut.width}x${cut.height}`)
  const out = join(__dirname, "..", panelPath(tier))
  await sharp(file).extract(cut).resize(PANEL, PANEL).webp({ quality: 92 }).toFile(out)
  console.log(`${out}  ${PANEL}x${PANEL} from ${width}x${height}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
