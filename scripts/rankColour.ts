#!/usr/bin/env node
/**
 * Measures every rank's committed floor art and palette through the renderer's own night, against master.
 *
 *   yarn rank-colour
 *
 * The method is docs/instructions/map-rendering.md's: composite the art through the operators the map
 * uses (a wash is `art × (1−a) + wash × a`, a standing thing takes a second pass of `SEATING_PASS` of the
 * night) and read CIELAB rather than a WCAG ratio. The checks are docs/game-design/visual-direction.md's:
 * a rank's metal keeps master's chroma after the night, stands at least master's L* off its floor, the
 * marker holds 3:1, and the props stand at least 25 L* off the floor — below a light floor or above a dark
 * one. The wall face is not measured: it is shown as painted, and its own dark base band and the shadow it
 * throws on the floor mark the edge.
 */

import sharp from "sharp"
import { pathToFileURL } from "url"
import { difficulties, type Difficulty } from "../src/data/difficultyLevels"
import type { Tileset } from "../src/game/siteTypes"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import { SEATING_PASS } from "../src/app/SiteMap/lighting"
import { MARKER_FILL, MARKER_OUTLINE } from "../src/app/SiteMap/markerColours"
import { contrastRatio, hexToRgb, hueDistance, parseRgba, toLch, wash, type Lch, type Rgb } from "../src/support/colour"

export type RankInput = {
  floorArt: Rgb
  night: Rgb
  nightAlpha: number
  seatingPass: number
  accent: Rgb
  prop: Rgb
  markerFill: Rgb
  markerOutline: Rgb
}

export type RankReport = {
  floor: Lch
  metal: Lch
  groundToMetal: number
  marker: number
  prop: number
}

export const measureRank = (i: RankInput): RankReport => {
  const floor = wash(i.floorArt, i.night, i.nightAlpha)
  const seated = (c: Rgb) => wash(wash(c, i.night, i.nightAlpha), i.night, i.nightAlpha * i.seatingPass)
  const floorLch = toLch(floor)
  const metal = toLch(seated(i.accent))
  return {
    floor: floorLch,
    metal,
    groundToMetal: Math.abs(metal.L - floorLch.L),
    marker: Math.max(contrastRatio(i.markerFill, floor), contrastRatio(i.markerOutline, floor)),
    prop: Math.abs(toLch(seated(i.prop)).L - floorLch.L),
  }
}

/** How far a prop must stand off the floor, in L*, to read as an object. */
export const MIN_STEP = 25

export const verdict = (report: RankReport, bar: RankReport) => ({
  metalChroma: report.metal.C >= bar.metal.C,
  groundToMetal: report.groundToMetal >= bar.groundToMetal,
  marker: report.marker >= 3,
  prop: report.prop >= MIN_STEP,
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

export const artMean = async (tier: Tileset, name: string): Promise<Rgb> => {
  const { data, info } = await sharp(`src/assets/tiles/${tier}/${name}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return meanOpaque(new Uint8Array(data), info.channels)
}

export const inputFor = async (tier: Tileset): Promise<RankInput> => {
  const palette = tierPalette[tier]
  const { rgb: night, alpha: nightAlpha } = parseRgba(palette.shade)
  return {
    floorArt: await artMean(tier, "floor"),
    night,
    nightAlpha,
    seatingPass: SEATING_PASS,
    accent: hexToRgb(palette.accent),
    prop: hexToRgb(palette.prop),
    markerFill: hexToRgb(MARKER_FILL),
    markerOutline: hexToRgb(MARKER_OUTLINE),
  }
}

/** Every rank's input and report, read off the committed art. */
export const measureAll = async () => {
  const inputs = Object.fromEntries(
    await Promise.all(difficulties.map(async tier => [tier, await inputFor(tier)] as const))
  ) as Record<Difficulty, RankInput>
  const reports = Object.fromEntries(difficulties.map(t => [t, measureRank(inputs[t])])) as Record<
    Difficulty,
    RankReport
  >
  return { inputs, reports }
}

/** One rank's row of the table, graded against master. */
export const rankRow = (tier: Difficulty, reports: Record<Difficulty, RankReport>) => {
  const r = reports[tier]
  const v = verdict(r, reports.master)
  const index = difficulties.indexOf(tier)
  const next = index >= 0 ? difficulties[index + 1] : undefined
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    "floor L*": round(r.floor.L),
    "floor C*": round(r.floor.C),
    "metal C*": `${round(r.metal.C)} ${v.metalChroma ? "ok" : "LOW"}`,
    "ground→metal": `${round(r.groundToMetal)} ${v.groundToMetal ? "ok" : "LOW"}`,
    marker: `${round(r.marker)} ${v.marker ? "ok" : "LOW"}`,
    prop: `${round(r.prop)} ${v.prop ? "ok" : "LOW"}`,
    "hue to next": next ? round(hueDistance(r.metal.h, reports[next].metal.h)) : "",
  }
}

const main = async () => {
  const { reports } = await measureAll()
  // The cave is a tileset and no rank: it is held to the same steps and printed under the five.
  const caveReports = { ...reports, cave: measureRank(await inputFor("cave")) } as Record<Difficulty, RankReport>
  console.table({
    ...Object.fromEntries(difficulties.map(tier => [tier, rankRow(tier, reports)])),
    cave: rankRow("cave" as Difficulty, caveReports),
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
