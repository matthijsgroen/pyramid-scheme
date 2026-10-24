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
 * marker holds 3:1, and the wall face and the props stand at least 25 L* off the floor — below a light floor
 * or above a dark one. It also prints the `faceNight` that shadows a light rank's wall face 30 L* below its
 * floor, which is how that number is chosen.
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
    prop: Math.abs(toLch(seated(i.prop)).L - floorLch.L),
  }
}

/** How far a wall face and a prop must stand off the floor, in L*, to read as wall and as object. */
export const MIN_STEP = 25
/** Where `solveFaceNight` aims a light rank's shadowed wall face. */
export const FACE_STEP = 30

export const solveFaceNight = (i: RankInput, target = FACE_STEP): number => {
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
  faceStep: Math.abs(report.faceStep) >= MIN_STEP,
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
    faceArt: await artMean(tier, "wall-face"),
    night,
    nightAlpha,
    faceNight: palette.faceNight,
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
export const rankRow = (
  tier: Difficulty,
  inputs: Record<Difficulty, RankInput>,
  reports: Record<Difficulty, RankReport>
) => {
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
    "face step": `${round(r.faceStep)} ${v.faceStep ? "ok" : "LOW"}`,
    "solved faceNight": solveFaceNight(inputs[tier]),
    "hue to next": next ? round(hueDistance(r.metal.h, reports[next].metal.h)) : "",
  }
}

const main = async () => {
  const { inputs, reports } = await measureAll()
  // The cave is a tileset and no rank: it is held to the same steps and printed under the five.
  const cave = await inputFor("cave")
  const caveInputs = { ...inputs, cave } as Record<Difficulty, RankInput>
  const caveReports = { ...reports, cave: measureRank(cave) } as Record<Difficulty, RankReport>
  console.table({
    ...Object.fromEntries(difficulties.map(tier => [tier, rankRow(tier, inputs, reports)])),
    cave: rankRow("cave" as Difficulty, caveInputs, caveReports),
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
