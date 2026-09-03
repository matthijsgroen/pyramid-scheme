#!/usr/bin/env node
/**
 * Builds a rank's archway out of its own wall, instead of asking a generator to draw one.
 *
 *   yarn make-arch --tier=junior
 *   yarn make-arch --tier=pharaoh --ornament=~/Downloads/winged-disc.png
 *   yarn make-arch --tier=junior --force        # replace an arch that is already there
 *   yarn make-arch --tier=priest --lift=0.8     # harder separation between the top face and the fronts
 *
 * An arch is the one slot whose geometry is fully determined — `SIDE_W : CELL : SIDE_W` across, a lintel
 * over an opening, a top face on the lintel and nothing else — and it is the slot a generator fought
 * hardest. The merchant's took eight rolls; the nobleman's was still drawing boxes in perspective at
 * three. Every failure was the same two: a third plane (ends receding, jambs showing an inner side) and a
 * top face too small to see. Both are decided here by construction, identically for every rank.
 *
 * What a script cannot invent is MATERIAL, and it does not have to: the rank's own `wall-face.png` is its
 * plaster or its brick, already painted, already in palette, already lit from the same side. So the frame
 * is cut out of the wall it pierces — which is also what the doc has always asked for, an arch belonging
 * to the wall rather than imported into it.
 *
 * The escape hatch is `--ornament`: an image on a magenta background, centred over the lintel. A pharaoh's
 * winged disc is a real drawing and no band-sampler will produce it — but a disc alone on magenta is a far
 * easier generation than a whole gateway in a projection the model has never met.
 */

import { existsSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { ARCH_H, ARCH_W, CELL, WALL_H } from "../src/app/SiteMap/mapScale"
import { keyOut } from "./keyOut"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import type { Difficulty } from "../src/data/difficultyLevels"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TILES = join(__dirname, "..", "src", "assets", "tiles")

const arg = (name: string): string | undefined => process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1]

/**
 * The lintel takes the top two fifths and its TOP FACE the upper third of that — the proportions the
 * merchant's working arch landed on, which is the only version of this that read at 49 units tall. Earlier
 * attempts gave the crown a fifth and its top face a share of that: five pixels, drawn and invisible.
 */
const LINTEL_H = Math.round(ARCH_H * 0.4)
const LINTEL_TOP_H = Math.round(LINTEL_H / 3)
/** The dark under the lintel where it overhangs the way through: what makes an opening read as a hole. */
const SOFFIT_H = 3

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
})

/**
 * A band that fades from dark at the top to nothing — the lintel's shadow falling down the fronts beneath
 * it. On the FRONTS only: the top face is the surface catching the light, and shading it would undo the
 * one thing that gives the gateway depth.
 */
const castDown = async (w: number, h: number, hex: string, alpha: number) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
         <defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="${hex}" stop-opacity="${alpha}"/>
           <stop offset="1" stop-color="${hex}" stop-opacity="0"/>
         </linearGradient></defs>
         <rect width="${w}" height="${h}" fill="url(#d)"/>
       </svg>`
    )
  )
    .png()
    .toBuffer()

const fill = async (w: number, h: number, hex: string, alpha = 1) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { ...hexToRgb(hex), alpha } } })
    .png()
    .toBuffer()

/**
 * The band of the rank's wall that is most nearly its BARE STONE — what the arch should be cut from.
 *
 * Two wrong answers came first, and both are instructive. Scoring bands by how much their row MEANS differ
 * found the procession frieze "plain", because a row of figures averages out the same as the row above it;
 * the jambs came out with a procession up them. Scoring by variation ALONG a row then found the dado — a
 * solid painted stripe is the most uniform thing on a wall — and the jambs came out red.
 *
 * Uniform was never the question. The question is which band is this rank's stone, so the score is
 * distance from the palette's own `wall` colour, with within-row variation only breaking ties: a painted
 * band fails on colour, a frieze fails on variation, and plaster wins both ways. Variation is weighted
 * the heavier of the two: a frieze painted in ochre ON plaster averages out close to plaster, so colour
 * alone still picked the procession.
 */
const stoneBandTop = (
  data: Buffer,
  width: number,
  height: number,
  stride: number,
  band: number,
  wall: { r: number; g: number; b: number }
) => {
  const rows = Array.from({ length: height }, (_, y) => {
    let r = 0
    let g = 0
    let b = 0
    let sum = 0
    let sumSq = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * stride
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      sum += lum
      sumSq += lum * lum
    }
    return {
      away: Math.hypot(r / width - wall.r, g / width - wall.g, b / width - wall.b),
      busy: Math.sqrt(Math.max(0, sumSq / width - (sum / width) ** 2)),
    }
  })

  let best = Math.round(height * 0.3)
  let lowest = Infinity
  // Skip the cap and the base, but only just: they are a few rows each, and excluding a sixth at each end
  // put the nobleman's one clean strip of plaster (rows 44-51 of 56) outside the search entirely.
  const edge = Math.max(2, Math.round(height * 0.06))
  for (let top = edge; top + band <= height - edge; top++) {
    let score = 0
    for (let y = top; y < top + band; y++) score += rows[y].away + rows[y].busy * 3
    if (score < lowest) {
      lowest = score
      best = top
    }
  }
  return best
}

/**
 * That band, TILED to fill the piece — never stretched, which is what turned a frieze into streaks.
 *
 * `from` shifts which part of the band a piece is cut from, so the two jambs and the lintel are not the
 * same few centimetres of wall repeated three times.
 */
const wallBand = async (source: Buffer, sourceW: number, sourceH: number, w: number, h: number, from = 0) => {
  // The band is a whole wall wide; a jamb is fourteen units. Cut a piece that fits before tiling it.
  const bandW = Math.min(sourceW, w)
  const bandH = Math.min(sourceH, h)
  const band = await sharp(source)
    .extract({ left: Math.min(from, sourceW - bandW), top: 0, width: bandW, height: bandH })
    .png()
    .toBuffer()
  const across = Math.ceil(w / bandW)
  const down = Math.ceil(h / bandH)
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(
      Array.from({ length: across * down }, (_, i) => ({
        input: band,
        left: (i % across) * bandW,
        top: Math.floor(i / across) * bandH,
      }))
    )
    .png()
    .toBuffer()
}

const main = async () => {
  const tier = (arg("tier") ?? "starter") as Difficulty
  const palette = tierPalette[tier]
  if (!palette) throw new Error(`unknown tier: ${tier}`)

  const facePath = join(TILES, tier, "wall-face.png")
  if (!existsSync(facePath)) throw new Error(`${tier} has no wall-face.png — the arch is cut from it`)
  const face = sharp(facePath)
  const { data, info } = await face.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const faceW = info.width

  const jambW = (ARCH_W - CELL) / 2
  const jambH = ARCH_H - LINTEL_H
  // How hard the top face is lifted and the fronts pushed down. One knob, because the two only matter
  // relative to each other.
  const lift = Number(arg("lift") ?? "0.65")

  // Narrow on purpose. A rank's bare stone can be a thin strip — the nobleman's is eight rows, between
  // his dado and his base — and a search window wider than that strip cannot land inside it, so every
  // candidate overlapped the frieze however the candidates were scored.
  const bandH = Math.max(3, Math.round(info.height / 8))
  const top = stoneBandTop(data, info.width, info.height, info.channels, bandH, hexToRgb(palette.wall))
  const band = await face.clone().extract({ left: 0, top, width: faceW, height: bandH }).png().toBuffer()

  // Three pieces, each one flat: no piece is ever seen from an angle, so no piece has more than a front
  // and (for the lintel) a top.
  const lintelTop = await wallBand(band, faceW, bandH, ARCH_W, LINTEL_TOP_H, 0)
  const lintelFront = await wallBand(band, faceW, bandH, ARCH_W, LINTEL_H - LINTEL_TOP_H, Math.round(faceW * 0.25))
  const jambL = await wallBand(band, faceW, bandH, jambW, jambH, Math.round(faceW * 0.5))
  const jambR = await wallBand(band, faceW, bandH, jambW, jambH, Math.round(faceW * 0.7))

  const layers: sharp.OverlayOptions[] = [
    { input: jambL, left: 0, top: LINTEL_H },
    { input: jambR, left: ARCH_W - jambW, top: LINTEL_H },
    { input: lintelFront, left: 0, top: LINTEL_TOP_H },
    { input: lintelTop, left: 0, top: 0 },
    // The top face catches the light and the front is pulled DOWN away from it: the gap between those two
    // is the only cue that this thing has depth, and cut from one band of wall they start identical.
    { input: await fill(ARCH_W, LINTEL_TOP_H, palette.wallTop, lift), left: 0, top: 0 },
    { input: await fill(ARCH_W, LINTEL_H - LINTEL_TOP_H, palette.wallBase, lift * 0.35), left: 0, top: LINTEL_TOP_H },
    { input: await fill(jambW, jambH, palette.wallBase, lift * 0.35), left: 0, top: LINTEL_H },
    { input: await fill(jambW, jambH, palette.wallBase, lift * 0.35), left: ARCH_W - jambW, top: LINTEL_H },
    // A hairline where the top face meets the front, so the two planes do not blur into one.
    { input: await fill(ARCH_W, 1, palette.wallBase, 0.5), left: 0, top: LINTEL_TOP_H },
    // What the lintel throws onto what is under it: down the top of each jamb's front, and a little onto
    // its own front where the top face overhangs. Never onto the top face itself.
    { input: await castDown(jambW, Math.round(jambH * 0.45), palette.wallBase, 0.5), left: 0, top: LINTEL_H },
    {
      input: await castDown(jambW, Math.round(jambH * 0.45), palette.wallBase, 0.5),
      left: ARCH_W - jambW,
      top: LINTEL_H,
    },
    { input: await castDown(ARCH_W, Math.round(LINTEL_H * 0.3), palette.wallBase, 0.35), left: 0, top: LINTEL_TOP_H },
    // The soffit, and a shadow down the inner edge of each jamb where the wall's thickness turns away.
    { input: await fill(CELL, SOFFIT_H, palette.wallBase, 0.55), left: jambW, top: LINTEL_H },
    { input: await fill(1, jambH, palette.wallBase, 0.35), left: jambW - 1, top: LINTEL_H },
    { input: await fill(1, jambH, palette.wallBase, 0.35), left: ARCH_W - jambW, top: LINTEL_H },
  ]

  const ornamentPath = arg("ornament")
  if (ornamentPath) {
    // Keyed and fitted to the lintel's front, centred. A pharaoh's winged disc, or whatever a rank needs
    // that bands cannot make.
    const w = Math.round(CELL * 0.9)
    const h = LINTEL_H - LINTEL_TOP_H - 2
    layers.push({
      input: await (await keyOut(sharp(ornamentPath), "#ff00ff", 60)).resize(w, h, { fit: "inside" }).png().toBuffer(),
      left: Math.round((ARCH_W - w) / 2),
      top: LINTEL_TOP_H + 1,
    })
  }

  const out = join(TILES, tier, "arch.png")
  // A rank whose arch was PAINTED does not want a built one. The merchant's timber gateway took eight
  // rolls and this script overwrote it in a second; --force is the only way to do that on purpose.
  if (existsSync(out) && !process.argv.includes("--force"))
    throw new Error(`${tier}/arch.png already exists — pass --force to replace it`)
  await sharp({ create: { width: ARCH_W, height: ARCH_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`${out} — ${ARCH_W}x${ARCH_H}, jamb ${jambW} / opening ${CELL} / jamb ${jambW}, lintel ${LINTEL_H}`)
  console.log(`  cut from rows ${top}-${top + bandH - 1} of the wall face — its bare stone`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
