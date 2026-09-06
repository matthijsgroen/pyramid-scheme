#!/usr/bin/env node
/**
 * Writes the ALPHA MASK a sand drift is cut to — the shape half of the one tile whose shape a generator
 * must not be asked for.
 *
 *   yarn drift-mask --out=~/tile-previews/drift-mask.png [--seed=fan] [--size=336] [--lobes=3]
 *
 * WHY THIS EXISTS. Every prop in this pipeline splits the same way: geometry is ours and material is the
 * generator's (docs/instructions/prop-pipeline.md). For a shelf the geometry comes from Blender and
 * `import-tile --mask` cuts the repaint to the render's own alpha. A drift has no geometry to render —
 * it is not an object — but it has the same need, and for two reasons.
 *
 * A drift is ALL EDGE. Asked for a shape on magenta, a generator hands back a feathered rim over a
 * hundred pixels, and keying that leaves a violet halo the despill cannot rescue; prop-pipeline records
 * that failure on a shadow, and a drift is nothing but the part that failed. So sand is generated as a
 * square, full-bleed TEXTURE with no shape and no background at all — nothing it can get wrong — and the
 * shape is applied here. `cutToMask` composites with `dest-in`, which respects partial alpha, so a
 * feathered mask feathers rather than cutting a hard edge.
 *
 * And a drift's edge is its whole character. A mask drawn as an ellipse would make sand a stain with
 * rounded corners; what says "blown in" is the LOBES — a rim pushed out where the wind piled it and
 * pulled in where it scoured. Three sine terms of the angle give that, and being deterministic in the
 * seed, one texture yields as many drifts as we want without another roll: a fan through a breach, a
 * tongue along a wall, a pool in a corner.
 *
 * NOT STORED, for the same reason a scaffold is not: it comes back byte for byte from its arguments, so
 * `art/rebuild.sh` carries the command instead, which is smaller and also says how the tile was made.
 */

import { mkdirSync } from "fs"
import { dirname } from "path"
import sharp from "sharp"

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback

/** Deterministic unit noise from a string seed and an index — the same idiom `hashUnit` uses. */
const unit = (seed: string, salt: number): number => {
  let h = 2166136261 >>> 0
  for (const ch of `${seed}:${salt}`) h = (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

/** Smooth 1 → 0 across [edge0, edge1], so the rim tapers instead of stepping. */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const main = async (): Promise<void> => {
  const out = arg("out", "/tmp/drift-mask.png")!
  const size = Number(arg("size", "336"))
  const seed = arg("seed", "drift")!
  const lobeCount = Number(arg("lobes", "3"))
  /** Where the taper starts, as a fraction of the lobe's radius. Solid core, soft third. */
  const CORE = 0.55

  // A few overlapping lobes rather than one blob: sand piles against things in more than one place, and
  // two lobes meeting leave the pinch that says a drift rather than a puddle.
  const lobes = Array.from({ length: lobeCount }, (_, i) => ({
    cx: 0.5 + (unit(seed, i * 7 + 1) - 0.5) * 0.36,
    cy: 0.5 + (unit(seed, i * 7 + 2) - 0.5) * 0.3,
    rx: 0.2 + unit(seed, i * 7 + 3) * 0.18,
    ry: 0.14 + unit(seed, i * 7 + 4) * 0.14,
    // The three terms that make a rim organic: a broad push, a mid ripple, a fine one.
    //
    // The AMPLITUDES FALL FAST, and the first pass had them nearly level — which produced a starfish.
    // A rim that swings as hard at nine cycles as at three has spikes, and sand has none: wind piles it
    // in a couple of broad tongues and frets the edge only slightly. Roughly halving each octave is what
    // turns the shape back into a drift.
    wobble: [
      { k: 3, amp: 0.12 + unit(seed, i * 7 + 5) * 0.14, phase: unit(seed, i * 7 + 6) * Math.PI * 2 },
      { k: 5, amp: 0.04 + unit(seed, i * 7 + 7) * 0.05, phase: unit(seed, i * 7 + 8) * Math.PI * 2 },
      { k: 9, amp: 0.012 + unit(seed, i * 7 + 9) * 0.018, phase: unit(seed, i * 7 + 10) * Math.PI * 2 },
    ],
  }))

  const data = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      let a = 0
      for (const lobe of lobes) {
        const dx = (u - lobe.cx) / lobe.rx
        const dy = (v - lobe.cy) / lobe.ry
        const d = Math.hypot(dx, dy)
        if (d > 2) continue
        const theta = Math.atan2(dy, dx)
        // The rim, pushed in and out by angle: this is the whole difference between a drift and a disc.
        const rim = lobe.wobble.reduce((r, w) => r + w.amp * Math.sin(w.k * theta + w.phase), 1)
        a = Math.max(a, smoothstep(rim, rim * CORE, d))
      }
      const i = (y * size + x) * 4
      // White throughout: only the ALPHA is read. A mask with colour in it would tint nothing, but a
      // white one is legible when you open the file to see what the shape came out as.
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(Math.min(1, a) * 255)
    }
  }

  mkdirSync(dirname(out), { recursive: true })
  // A light blur over the whole mask. The falloff is already smooth in the radius, but the rim is a
  // function of ANGLE, and near a lobe's centre a small angle step is a large step in the wobble — which
  // leaves faceting the eye reads as a torn edge. Blurring in image space fixes what the polar form
  // cannot, and it costs nothing on a mask that is only ever read as alpha.
  const blur = Number(arg("blur", "3"))
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .blur(blur > 0 ? blur : undefined)
    .png({ compressionLevel: 9 })
    .toFile(out)

  // What the shape came out as, before a roll is spent on the texture it will cut.
  let covered = 0
  let soft = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 8) covered++
    if (data[i] > 8 && data[i] < 247) soft++
  }
  const pct = (n: number) => `${((100 * n) / (size * size)).toFixed(1)}%`
  console.log(`${out} — ${size}x${size}, seed "${seed}", ${lobeCount} lobes`)
  console.log(`  covers ${pct(covered)} of the square, ${pct(soft)} of it a soft rim`)
}

void main()
