#!/usr/bin/env node
/**
 * Measures a generated tile against its rank's palette, before it is imported.
 *
 *   yarn tile-stats ~/Downloads/gen.png
 *   yarn tile-stats ~/Downloads/gen.png --tier=junior
 *
 * A generator drops the palette in the prompt long before it drops the subject, and the eye is a poor
 * judge of either failure against a bright screen. Two things go wrong, and both are measurable:
 *
 * - VALUE. The first starter floor read "a bit contrasty" and measured lum 36–179 against a palette
 *   spanning 88–114 — white flakes at one end, a near-black outline around every slab at the other.
 * - HUE. The third came back inside the value band and a full step warmer than the palette: mean
 *   #745e4a against the slab's #6c6257, drifting toward the ochre accent. That matters per rank, since
 *   starter is deliberately neutral so junior's sandstone reads as the step up in wealth.
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

/** How warm a colour is: red over blue. The one number a drifting generator moves. */
const warmth = (r: number, _g: number, b: number) => r - b

const main = async () => {
  const file = process.argv[2]
  if (!file) throw new Error("usage: yarn tile-stats <file.png> [--tier=starter]")
  const tier = (process.argv.find(a => a.startsWith("--tier="))?.split("=")[1] ?? "starter") as Difficulty
  const palette = tierPalette[tier]
  if (!palette) throw new Error(`unknown tier: ${tier}`)

  const lightest = luminance(...(rgb(palette.prop) as [number, number, number]))
  const darkest = luminance(...(rgb(palette.joint) as [number, number, number]))
  const band = [palette.slabLo, palette.slabHi].map(c => Math.round(luminance(...(rgb(c) as [number, number, number]))))
  const [sr, sg, sb] = rgb(palette.slab)

  const image = sharp(file)
  const { width = 0, height = 0 } = await image.metadata()
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const values: number[] = []
  let sums = [0, 0, 0]
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 128) continue
    if (r > 180 && b > 180 && g < 120) continue // the keyed-out magenta background
    values.push(luminance(r, g, b))
    sums = [sums[0] + r, sums[1] + g, sums[2] + b]
  }
  const mean = sums.map(s => s / values.length) as [number, number, number]
  values.sort((a, b) => a - b)

  const at = (q: number) => Math.round(values[Math.floor((q / 100) * (values.length - 1))])
  const share = (test: (v: number) => boolean) => (values.filter(test).length / values.length) * 100
  const tooLight = share(v => v > lightest)
  const tooDark = share(v => v < darkest)
  const drift = warmth(...mean) - warmth(sr, sg, sb)

  console.log(`${width}x${height}  aspect ${(width / height).toFixed(2)}:1   tier ${tier}`)
  console.log(`lum  p5 ${at(5)}  p50 ${at(50)}  p95 ${at(95)}   (the slab band is ${band[0]}–${band[1]})`)
  console.log(
    `outside the palette:  ${tooLight.toFixed(1)}% lighter than ${Math.round(lightest)}   ${tooDark.toFixed(
      1
    )}% darker than ${Math.round(darkest)}`
  )
  console.log(
    `hue  mean ${hex(...mean)} against the slab's ${palette.slab}   ${drift >= 0 ? "+" : ""}${Math.round(drift)} warmth`
  )

  const spread = at(95) - at(5)
  const faults = [
    tooLight + tooDark >= 2 || spread >= 60 ? `too contrasty: p5–p95 spans ${spread}, restate the value clamp` : null,
    // 15 is about the width of one palette step, so a drift past it is a different brown, not a variation.
    Math.abs(drift) > 15
      ? `${drift > 0 ? "too warm" : "too cool"} by ${Math.abs(Math.round(drift))}, restate the palette hexes`
      : null,
  ].filter(Boolean)
  console.log(faults.length === 0 ? "reads as one tomb — import it" : faults.join("\n"))
}

main()
