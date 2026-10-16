#!/usr/bin/env node
/**
 * Measures every rank's committed floor and wall art through the renderer's own night, against master.
 *
 *   yarn rank-colour
 *
 * The method is docs/instructions/map-rendering.md's: composite the art through the operators the map
 * uses (a wash is `art × (1−a) + wash × a`, a standing thing takes a second pass of `SEATING_PASS` of the
 * night) and read CIELAB rather than a WCAG ratio. The checks are docs/game-design/visual-direction.md's:
 * a rank's metal keeps master's chroma after the night, stands at least master's L* off its floor, the
 * marker holds 3:1 and the props 2.08. It also prints the `faceNight` that steps each rank's wall face
 * 7.5 L* below its floor, which is how that number is chosen.
 */

import sharp from "sharp"
import { pathToFileURL } from "url"
import { difficulties, type Difficulty } from "../src/data/difficultyLevels"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import { SEATING_PASS } from "../src/app/SiteMap/lighting"
import { MARKER_FILL, MARKER_OUTLINE } from "../src/app/SiteMap/markerColours"
import { METALS } from "../src/ui/tokens/metalPalette"
import { contrastRatio, hexToRgb, hueDistance, parseRgba, toLch, wash, type Lch, type Rgb } from "../src/support/colour"

export type RankInput = {
  floorArt: Rgb
  faceArt: Rgb
  night: Rgb
  nightAlpha: number
  faceNight: number
  seatingPass: number
  accent: Rgb
  prop: Rgb
  markerFill: Rgb
  markerOutline: Rgb
}

export type RankReport = {
  floor: Lch
  faceStep: number
  metal: Lch
  groundToMetal: number
  marker: number
  prop: number
}

export const measureRank = (i: RankInput): RankReport => {
  const floor = wash(i.floorArt, i.night, i.nightAlpha)
  const face = wash(wash(i.faceArt, i.night, i.nightAlpha), i.night, i.faceNight)
  const seated = (c: Rgb) => wash(wash(c, i.night, i.nightAlpha), i.night, i.nightAlpha * i.seatingPass)
  const floorLch = toLch(floor)
  const metal = toLch(seated(i.accent))
  return {
    floor: floorLch,
    faceStep: floorLch.L - toLch(face).L,
    metal,
    groundToMetal: Math.abs(metal.L - floorLch.L),
    marker: Math.max(contrastRatio(i.markerFill, floor), contrastRatio(i.markerOutline, floor)),
    prop: contrastRatio(seated(i.prop), floor),
  }
}

export const solveFaceNight = (i: RankInput, target = 7.5): number => {
  if (measureRank({ ...i, faceNight: 0 }).faceStep >= target) return 0
  let lo = 0
  let hi = 1
  for (let step = 0; step < 30; step++) {
    const mid = (lo + hi) / 2
    if (measureRank({ ...i, faceNight: mid }).faceStep < target) lo = mid
    else hi = mid
  }
  return Math.round(hi * 100) / 100
}

export const verdict = (report: RankReport, bar: RankReport) => ({
  metalChroma: report.metal.C >= bar.metal.C,
  groundToMetal: report.groundToMetal >= bar.groundToMetal,
  marker: report.marker >= 3,
  prop: report.prop >= 2.08,
})

export const meanOpaque = (raw: Uint8Array, channels: number): Rgb => {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let p = 0; p < raw.length; p += channels) {
    if (channels === 4 && raw[p + 3] < 128) continue
    r += raw[p]
    g += raw[p + 1]
    b += raw[p + 2]
    n++
  }
  return [r / n, g / n, b / n]
}

const artMean = async (tier: Difficulty, name: string): Promise<Rgb> => {
  const { data, info } = await sharp(`src/assets/tiles/${tier}/${name}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return meanOpaque(new Uint8Array(data), info.channels)
}

const inputFor = async (tier: Difficulty): Promise<RankInput> => {
  const palette = tierPalette[tier]
  const { rgb: night, alpha: nightAlpha } = parseRgba(palette.shade)
  return {
    floorArt: await artMean(tier, "floor"),
    faceArt: await artMean(tier, "wall-face"),
    night,
    nightAlpha,
    faceNight: palette.faceNight,
    seatingPass: SEATING_PASS,
    accent: hexToRgb(METALS[tier].accent),
    prop: hexToRgb(palette.prop),
    markerFill: hexToRgb(MARKER_FILL),
    markerOutline: hexToRgb(MARKER_OUTLINE),
  }
}

const main = async () => {
  const inputs = Object.fromEntries(
    await Promise.all(difficulties.map(async tier => [tier, await inputFor(tier)] as const))
  ) as Record<Difficulty, RankInput>
  const reports = Object.fromEntries(difficulties.map(t => [t, measureRank(inputs[t])])) as Record<
    Difficulty,
    RankReport
  >
  const bar = reports.master
  const round = (n: number) => Math.round(n * 10) / 10
  console.table(
    Object.fromEntries(
      difficulties.map((tier, index) => {
        const r = reports[tier]
        const v = verdict(r, bar)
        const next = difficulties[index + 1]
        return [
          tier,
          {
            "floor L*": round(r.floor.L),
            "floor C*": round(r.floor.C),
            "metal C*": `${round(r.metal.C)} ${v.metalChroma ? "ok" : "LOW"}`,
            "ground→metal": `${round(r.groundToMetal)} ${v.groundToMetal ? "ok" : "LOW"}`,
            marker: `${round(r.marker)} ${v.marker ? "ok" : "LOW"}`,
            prop: `${round(r.prop)} ${v.prop ? "ok" : "LOW"}`,
            "face step": round(r.faceStep),
            "solved faceNight": solveFaceNight(inputs[tier]),
            "hue to next": next ? round(hueDistance(r.metal.h, reports[next].metal.h)) : "",
          },
        ]
      })
    )
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
