#!/usr/bin/env node
/**
 * Measures every mechanism piece against every tileset's floor, through the renderer's own night.
 *
 *   yarn tsx scripts/mechanismColour.ts
 *
 * The method is rankColour's: the floor takes the night once, a standing piece takes it again at
 * `SEATING_PASS`, and both are read as L*. Mechanism art is shared (`tiles/default/`), so only the floor and
 * the night change per row. `share` is how much of the piece's own paint stands MIN_STEP off the floor: a
 * mean can pass on a piece whose thin parts vanish, and fail on one whose highlights still read.
 * The pipe hole sits in the wall band, so it is held against the wall face rather than the floor.
 */

import sharp from "sharp"
import { existsSync } from "fs"
import { difficulties } from "../src/data/difficultyLevels"
import type { Tileset } from "../src/game/siteTypes"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import { SEATING_PASS } from "../src/app/SiteMap/lighting"
import { hexToRgb, parseRgba, toLch, wash, type Rgb } from "../src/support/colour"
import { artMean, MIN_STEP } from "./rankColour"

const TILESETS: Tileset[] = [...difficulties, "cave", "sphinx"]

/** Each piece's look and the shared tiles it is drawn with; a lever is its three sprites stacked. */
const PIECES: Record<string, { tiles: string[]; on?: "wall" }> = {
  lever: { tiles: ["leverBaseBack", "leverArm", "leverBaseFront"] },
  "torch unlit": { tiles: ["torchUnlit"] },
  "torch lit": { tiles: ["torchLit"] },
  plate: { tiles: ["plate"] },
  "plate+stone": { tiles: ["plateStone"] },
  "pipe hole": { tiles: ["pipeHole"], on: "wall" },
  "hole+stone": { tiles: ["pipeHoleStone"], on: "wall" },
  "seq tile": { tiles: ["sequenceTile"] },
  "gate side": { tiles: ["gate-side"] },
  "gate face": { tiles: ["gate"] },
  narrow: { tiles: ["narrowAlong"] },
  drop: { tiles: ["dropEast"] },
}

const opaquePixels = async (name: string): Promise<Rgb[]> => {
  const { data, info } = await sharp(`src/assets/tiles/default/${name}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out: Rgb[] = []
  for (let p = 0; p < data.length; p += info.channels)
    if (data[p + 3] >= 128) out.push([data[p], data[p + 1], data[p + 2]])
  return out
}

/** A tileset's unpainted floor or face is drawn in its palette's flat colour. */
const surface = async (tier: Tileset, name: "floor" | "wall-face", flat: string): Promise<Rgb> =>
  existsSync(`src/assets/tiles/${tier}/${name}.png`) ? artMean(tier, name) : hexToRgb(flat)

const main = async () => {
  const pixels = Object.fromEntries(
    await Promise.all(
      Object.entries(PIECES).map(async ([piece, { tiles }]) => [
        piece,
        (await Promise.all(tiles.map(opaquePixels))).flat(),
      ])
    )
  ) as Record<string, Rgb[]>
  const steps: Record<string, Record<string, string>> = {}
  const shares: Record<string, Record<string, string>> = {}
  const fails: string[] = []
  for (const tier of TILESETS) {
    const palette = tierPalette[tier]
    const { rgb: night, alpha } = parseRgba(palette.shade)
    const floorL = toLch(wash(await surface(tier, "floor", palette.slab), night, alpha)).L
    const face = wash(await surface(tier, "wall-face", palette.wall), night, alpha)
    const faceL = toLch(wash(face, night, palette.faceNight)).L
    const seatedL = (c: Rgb) => toLch(wash(wash(c, night, alpha), night, alpha * SEATING_PASS)).L
    steps[tier] = { "floor L*": floorL.toFixed(1), "face L*": faceL.toFixed(1) }
    shares[tier] = {}
    for (const [piece, px] of Object.entries(pixels)) {
      const ground = PIECES[piece].on === "wall" ? faceL : floorL
      const ls = px.map(seatedL)
      const mean = ls.reduce((a, b) => a + b, 0) / ls.length
      const step = mean - ground
      const share = ls.filter(l => Math.abs(l - ground) >= MIN_STEP).length / ls.length
      const low = Math.abs(step) < MIN_STEP
      if (low) fails.push(`${tier} / ${piece}: ${step.toFixed(1)} (${Math.round(share * 100)}% of paint reads)`)
      steps[tier][piece] = `${step >= 0 ? "+" : ""}${step.toFixed(0)}${low ? " LOW" : ""}`
      shares[tier][piece] = `${Math.round(share * 100)}%`
    }
  }
  console.log(`Mean L* step, seated piece minus its ground (floor; wall face for the pipe hole). LOW < ${MIN_STEP}.`)
  console.table(steps)
  console.log(`Share of each piece's paint standing at least ${MIN_STEP} L* off its ground.`)
  console.table(shares)
  console.log(`${fails.length} below ${MIN_STEP}:\n  ${fails.join("\n  ")}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
