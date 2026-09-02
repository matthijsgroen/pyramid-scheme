#!/usr/bin/env node
/**
 * Measures a generated tile against its rank's palette, before it is imported.
 *
 *   yarn tile-stats ~/Downloads/gen.png
 *   yarn tile-stats ~/Downloads/gen.png --tier=junior --slot=face
 *
 * A generator drops the palette in the prompt long before it drops the subject, and the eye is a poor
 * judge of either failure against a bright screen. Three things go wrong, and all of them are measurable:
 *
 * - VALUE. The first starter floor read "a bit contrasty" and measured lum 36–179 against a palette
 *   spanning 88–114 — white flakes at one end, a near-black outline around every slab at the other.
 * - HUE. The third came back inside the value band and a full step warmer than the palette: mean
 *   #745e4a against the slab's #6c6257, drifting toward the ochre accent. That matters per rank, since
 *   starter is deliberately neutral so junior's sandstone reads as the step up in wealth.
 * - THE WRONG TARGET. A wall face measured against the floor's slab band reads as a failure when it is
 *   correct: it is SUPPOSED to be darker than the floor, and to carry a light cap and a dark base. Pass
 *   `--slot=face` and it is graded as three bands against `wall` / `wallTop` / `wallBase` instead, with
 *   only the brick field deciding the verdict.
 *
 * Magenta background and transparent pixels are excluded, so a prop measures its object only.
 */

import sharp from "sharp"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import type { Difficulty } from "../src/data/difficultyLevels"

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b

const rgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, "0")).join("")

const lumOf = (colour: string) => Math.round(luminance(...(rgb(colour) as [number, number, number])))

/** How warm a colour is: red over blue. The one number a drifting generator moves. */
const warmth = (r: number, _g: number, b: number) => r - b

/** The band of a face that is neither its light cap nor its dark base — the brick itself. */
const FIELD = [0.1, 0.9]

/**
 * How much darker the band just outside the opening is than the jamb face beyond it. The opening is found
 * by its transparency, so this runs on the keyed file as well as on a magenta one.
 */
const revealDepth = (data: Buffer, info: sharp.OutputInfo, stride: number) => {
  const { width, height } = info
  const isHole = (x: number, y: number) => {
    const i = (y * width + x) * stride
    return data[i + 3] < 128 || (data[i] > 180 && data[i + 2] > 180 && data[i + 1] < 120)
  }
  let minX = width
  let maxX = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isHole(x, y)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
    }
  }
  if (maxX < 0) return null
  const band = Math.max(2, Math.round((maxX - minX) * 0.02))
  const strip = (from: number, to: number) => {
    let sum = 0
    let n = 0
    for (let y = Math.round(height * 0.4); y < Math.round(height * 0.7); y++) {
      for (let x = Math.max(0, from); x < Math.min(width, to); x++) {
        const i = (y * width + x) * stride
        sum += luminance(data[i], data[i + 1], data[i + 2])
        n++
      }
    }
    return n ? sum / n : 0
  }
  const edge = (strip(minX - band * 2, minX - 1) + strip(maxX + 1, maxX + band * 2)) / 2
  const face = (strip(minX - band * 7, minX - band * 3) + strip(maxX + band * 3, maxX + band * 7)) / 2
  return { depth: Math.round(face - edge), edge: Math.round(edge), face: Math.round(face) }
}

const main = async () => {
  const file = process.argv[2]
  if (!file) throw new Error("usage: yarn tile-stats <file.png> [--tier=starter] [--slot=face]")
  const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1]
  const tier = (arg("tier") ?? "starter") as Difficulty
  // An arch is cut from the wall it pierces, so it is graded as wall stone, not floor stone. Its cap and
  // base bands are the wall's own, which is what makes a gateway line up with the run either side of it.
  const slot = arg("slot") ?? ""
  const isFace = ["face", "wall", "arch"].includes(slot)
  const isArch = slot === "arch"
  const palette = tierPalette[tier]
  if (!palette) throw new Error(`unknown tier: ${tier}`)

  // What this slot is made of. A face is wall, everything else is floor stone.
  const material = isFace ? palette.wall : palette.slab
  const lightest = lumOf(palette.prop)
  const darkest = lumOf(palette.joint)
  const [sr, sg, sb] = rgb(material)

  const image = sharp(file)
  const { width = 0, height = 0 } = await image.metadata()
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const stride = info.channels

  // A face is graded on its brick field only; its cap and base are reported but never fail it.
  const rowFrom = isFace ? Math.round(info.height * FIELD[0]) : 0
  const rowTo = isFace ? Math.round(info.height * FIELD[1]) : info.height

  const values: number[] = []
  let sums = [0, 0, 0]
  for (let y = rowFrom; y < rowTo; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * stride
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      if (a < 128) continue
      if (r > 180 && b > 180 && g < 120) continue // the keyed-out magenta background
      values.push(luminance(r, g, b))
      sums = [sums[0] + r, sums[1] + g, sums[2] + b]
    }
  }
  const mean = sums.map(s => s / values.length) as [number, number, number]
  values.sort((a, b) => a - b)

  const reveal = isArch ? revealDepth(data, info, stride) : null

  const at = (q: number) => Math.round(values[Math.floor((q / 100) * (values.length - 1))])
  const share = (test: (v: number) => boolean) => (values.filter(test).length / values.length) * 100
  const tooLight = share(v => v > lightest)
  const tooDark = share(v => v < darkest)
  const drift = warmth(...mean) - warmth(sr, sg, sb)

  /** Mean luminance of a horizontal slice, for the cap and base bands. */
  const bandMean = (from: number, to: number) => {
    let sum = 0
    let n = 0
    for (let y = Math.round(info.height * from); y < Math.round(info.height * to); y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * stride
        sum += luminance(data[i], data[i + 1], data[i + 2])
        n++
      }
    }
    return Math.round(sum / n)
  }

  console.log(
    `${width}x${height}  aspect ${(width / height).toFixed(2)}:1   tier ${tier}${isFace ? "  slot face" : ""}`
  )
  console.log(
    `lum  p5 ${at(5)}  p50 ${at(50)}  p95 ${at(95)}   (${isFace ? "the brick field wants" : "the slab band is"} ${
      isFace ? lumOf(palette.wall) : `${lumOf(palette.slabLo)}–${lumOf(palette.slabHi)}`
    })`
  )
  if (reveal) console.log(`reveal  edge ${reveal.edge} against the jamb's ${reveal.face}   ${reveal.depth} deep`)
  if (isFace) {
    console.log(
      `bands  cap ${bandMean(0, 0.05)} (wants ${lumOf(palette.wallTop)})   field ${at(50)} (wants ${lumOf(
        palette.wall
      )})   base ${bandMean(0.95, 1)} (wants ${lumOf(palette.wallBase)})`
    )
  }
  console.log(
    `outside the palette:  ${tooLight.toFixed(1)}% lighter than ${lightest}   ${tooDark.toFixed(
      1
    )}% darker than ${darkest}`
  )
  console.log(
    `hue  mean ${hex(...mean)} against the ${isFace ? "wall's" : "slab's"} ${material}   ${
      drift >= 0 ? "+" : ""
    }${Math.round(drift)} warmth`
  )

  const spread = at(95) - at(5)
  // A face carries a deliberate top-to-bottom gradient, so its field is allowed a wider spread than a
  // floor, which has nothing to model but its own stone.
  const spreadLimit = isFace ? 90 : 60

  // An arch spans from its reveal shadow to its lit cornice on purpose, so spread says nothing about it.
  // What DOES decide it is whether the reveal is there: the inner faces of the jambs and the underside of
  // the lintel, turned away from the light. Without that dark frame a doorway is a slightly paler rectangle
  // in a wall and the eye slides over it — which is exactly how one roll failed.
  const offMaterial = Math.abs(at(50) - lumOf(material))
  // A face's dark end is a designed gradient running down to `wallBase`, plus a joint grid, so pixels
  // below the floor's mortar colour are expected there and only the LIGHT end can overshoot — which is
  // the failure a wall actually has (one came back at median 129 against a wall colour of 66).
  const outside = isFace ? tooLight : tooLight + tooDark
  const faults = [
    outside >= 2 || (!isArch && spread >= spreadLimit)
      ? `too contrasty: p5–p95 spans ${spread}, restate the value clamp`
      : null,
    reveal && reveal.depth < 25
      ? `no reveal: the opening's edge is ${reveal.depth} darker than the jamb, wants 25+ — a doorway needs a dark inner edge`
      : null,
    // 15 is about the width of one palette step, so a drift past it is a different brown, not a variation.
    Math.abs(drift) > 15
      ? `${drift > 0 ? "too warm" : "too cool"} by ${Math.abs(Math.round(drift))}, restate the palette hexes`
      : null,
    // A surface that is not the value of its own material is the failure that inverts the map's depth.
    offMaterial > 20
      ? `${at(50) > lumOf(material) ? "too light" : "too dark"} by ${offMaterial} for ${material}`
      : null,
  ].filter(Boolean)
  console.log(faults.length === 0 ? "reads as one tomb — import it" : faults.join("\n"))
}

main()
