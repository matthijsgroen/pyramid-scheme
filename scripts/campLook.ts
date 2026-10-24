#!/usr/bin/env node
/**
 * Measures how colourful a camp picture's ground is, to hold the scene against its impression.
 *
 *   yarn camp-look shot.png --horizon=0.23 --fire=0.5,0.68,0.1
 *
 * `--horizon` is the horizon's share of the height; only the ground below it is measured. `--fire` is the
 * fire's centre as shares of width and height and the disc's radius as a share of the width. Prints the
 * ground's mean L* and C* (CIELAB), the share of its pixels with C* over 40, and the fire disc's mean L*, C*.
 */

import { pathToFileURL } from "url"
import sharp from "sharp"

const linear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (t * 24389) / 27 / 116 + 16 / 116)

/** sRGB (D65) to CIELAB lightness L* and chroma C*. */
export const lab = (r: number, g: number, b: number) => {
  const [R, G, B] = [linear(r), linear(g), linear(b)]
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  const a = 500 * (fx - fy)
  const bb = 200 * (fy - fz)
  return { L: 116 * fy - 16, C: Math.hypot(a, bb) }
}

export type Pixels = { data: Uint8Array; width: number; height: number; channels: number }

export type LookOptions = { horizon: number; fire: { x: number; y: number; r: number } }

const VIVID = 40

export const campLook = ({ data, width, height, channels }: Pixels, { horizon, fire }: LookOptions) => {
  const ground = { L: 0, C: 0, vivid: 0, n: 0 }
  const disc = { L: 0, C: 0, n: 0 }
  const [fx, fy, fr] = [fire.x * width, fire.y * height, fire.r * width]
  for (let y = Math.ceil(horizon * height); y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const { L, C } = lab(data[i], data[i + 1], data[i + 2])
      ground.L += L
      ground.C += C
      ground.n++
      if (C > VIVID) ground.vivid++
      if (Math.hypot(x + 0.5 - fx, y + 0.5 - fy) <= fr) {
        disc.L += L
        disc.C += C
        disc.n++
      }
    }
  const mean = (sum: number, n: number) => (n ? sum / n : 0)
  return {
    ground: { L: mean(ground.L, ground.n), C: mean(ground.C, ground.n), vivid: mean(ground.vivid, ground.n) },
    fire: { L: mean(disc.L, disc.n), C: mean(disc.C, disc.n) },
  }
}

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)

const main = async () => {
  const file = process.argv[2]
  const horizon = Number(arg("horizon"))
  const [x, y, r] = (arg("fire") ?? "").split(",").map(Number)
  if (!file || !(horizon >= 0) || [x, y, r].some(v => !(v >= 0)))
    throw new Error("usage: yarn camp-look <image> --horizon=<share> --fire=<x>,<y>,<r>")
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const look = campLook(
    { data, width: info.width, height: info.height, channels: info.channels },
    {
      horizon,
      fire: { x, y, r },
    }
  )
  const n = (v: number) => v.toFixed(1)
  console.log(
    `ground  L* ${n(look.ground.L)}  C* ${n(look.ground.C)}  C*>${VIVID} ${(look.ground.vivid * 100).toFixed(1)}%\n` +
      `fire    L* ${n(look.fire.L)}  C* ${n(look.fire.C)}`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
