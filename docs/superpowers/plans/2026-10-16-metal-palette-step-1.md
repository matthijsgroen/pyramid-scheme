# Metal palette, step 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One metal palette per difficulty read by the map, the hieroglyph tiles and the interface; starter's night wash lowered to 0.2; a script that measures every rank against master.

**Architecture:** A new token module `src/ui/tokens/metalPalette.ts` holds each difficulty's metal (stone, copper, silver, gold, emerald). `tierPalette.accent` (map), `difficultyMaterial` (hieroglyph tiles), `DifficultyPill`, the journey card stripe and the ward-gate accent all read it. Colour maths lives in `src/support/colour.ts`; `scripts/rankColour.ts` composites each rank's committed floor and wall art through the renderer's own wash operator and reports L\*, chroma, hue and contrasts, with master as the bar.

**Tech Stack:** TypeScript, React 19, Tailwind v4, vitest, sharp (scripts), tsx.

**Spec:** `docs/game-design/visual-direction.md`

## Global Constraints

- Painted, matte, no outlines on a surface — this plan changes no art.
- Night washes fall to **0.2 or less**; this plan lowers **starter only** (`tierPalette.starter.shade`). The other ranks move with their own repaint.
- Text on a metal pill holds **4.5:1**.
- **Master is the bar**: a rank passes when its metal keeps at least master's chroma after the wash, its ground-to-metal L\* difference is at least master's, the marker holds **3:1** against the floor, and props separate from the floor at least **2.08**.
- The metal ladder: starter **stone**, junior **copper**, expert **silver**, master **gold** (master's gold `#d9a93f` stays exactly as today), wizard **emerald**.
- The green → purple rank scale (`difficultyRank`) is retired.
- No duration assertions in tests; tests use made-up colours, never pin authored palette values except master's gold, which the spec freezes.
- Comments state the current state and why, never history ("used to", "replaces"). No `§` in code comments (betterer guard).
- Commit messages and the changelog entry are one line each.

## Deviations from the spec, to confirm with the user

1. **The click marker stays one marker.** `SiteMapView.tsx:1031-1034` already solves legibility with a dark ring around a gold fill — _"the ring is what makes one mark work on light stone and dark granite alike, so the player learns a single shape rather than a per-tier one."_ The spec's per-rank marker would undo that decision. Instead, the measuring script checks the marker (the better of fill and ring) at 3:1 against every rank's floor. Task 6 updates the spec to match.
2. **Starter's ground tokens move with its ground art.** `slab`, `wall`, `wallBase` and `outline` describe the floor and wall art and are `tile-stats`' targets for it. Moving them while the art is still the dark cellar would paint a pale wall mass beside dark floor tiles. This plan moves the **night** and the **metal**; the ground tokens move in the starter-surfaces plan together with the four new surface tiles. Task 6 records this in the spec.

## Review Focus

- **A disabled pill or card** must stay grey — `DifficultyPill disabled` and a disabled `JourneyCard` keep their grey classes and ignore the metal. (Task 4 test.)
- **A difficulty with no metal entry** must fail type-checking, not render `undefined` — `METALS` is `Record<Difficulty, Metal>`. (Task 2, by type.)
- **A floor PNG with transparent margins** must not drag the mean toward black — the script skips pixels with alpha < 128. (Task 3 test via `meanOpaque`.)
- **A shade string with spaces or without alpha** (`rgba(21, 17, 12, 0.2)`, `rgb(1,2,3)`) must parse. (Task 1 test.)
- **The hieroglyph tile's engraved symbol** must stay readable on its metal — symbol is `shade`, at least 3:1 against `material`. (Task 2 test.)

---

### Task 1: Colour maths

**Files:**

- Create: `src/support/colour.ts`
- Test: `src/support/colour.spec.ts`

**Interfaces:**

- Produces:

  - `type Rgb = readonly [number, number, number]`
  - `hexToRgb(hex: string): Rgb`
  - `parseRgba(css: string): { rgb: Rgb; alpha: number }`
  - `relativeLuminance(rgb: Rgb): number`
  - `contrastRatio(a: Rgb, b: Rgb): number`
  - `wash(art: Rgb, over: Rgb, alpha: number): Rgb` — the renderer's `art × (1−a) + wash × a`
  - `type Lch = { L: number; C: number; h: number }`
  - `toLch(rgb: Rgb): Lch` — CIELAB (D65) as lightness, chroma, hue angle in degrees
  - `hueDistance(a: number, b: number): number` — shortest angle, 0–180

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { contrastRatio, hexToRgb, hueDistance, parseRgba, toLch, wash } from "./colour"

describe("colour", () => {
  it("reads a hex colour", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0])
  })

  it("reads rgba with spaces, and rgb without alpha as opaque", () => {
    expect(parseRgba("rgba(21, 17, 12, 0.2)")).toEqual({ rgb: [21, 17, 12], alpha: 0.2 })
    expect(parseRgba("rgb(1,2,3)")).toEqual({ rgb: [1, 2, 3], alpha: 1 })
  })

  it("rejects what is not a colour", () => {
    expect(() => parseRgba("transparent")).toThrow()
  })

  it("measures black on white as 21:1, and a colour against itself as 1:1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([120, 80, 40], [120, 80, 40])).toBeCloseTo(1, 5)
  })

  it("washes art toward a colour by alpha", () => {
    expect(wash([200, 100, 0], [0, 0, 0], 0.5)).toEqual([100, 50, 0])
    expect(wash([200, 100, 0], [0, 0, 0], 0)).toEqual([200, 100, 0])
  })

  it("puts white at L* 100 with no chroma, black at 0", () => {
    const white = toLch([255, 255, 255])
    expect(white.L).toBeCloseTo(100, 1)
    expect(white.C).toBeLessThan(0.01)
    expect(toLch([0, 0, 0]).L).toBeCloseTo(0, 5)
  })

  it("reads pure red at the published CIELAB values", () => {
    const red = toLch([255, 0, 0])
    expect(red.L).toBeCloseTo(53.24, 1)
    expect(red.C).toBeCloseTo(104.55, 0)
    expect(red.h).toBeCloseTo(40.0, 0)
  })

  it("measures hue distance the short way round", () => {
    expect(hueDistance(350, 10)).toBe(20)
    expect(hueDistance(10, 190)).toBe(180)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/support/colour.spec.ts`
Expected: FAIL — `Failed to resolve import "./colour"`

- [ ] **Step 3: Write minimal implementation**

```ts
// Colour as the renderer composites it and as docs/instructions/map-rendering.md measures it: a wash
// is `art × (1−a) + wash × a`, and a change to the night is read as CIELAB lightness, chroma and hue
// rather than as a WCAG ratio, which is built for text. The WCAG ratio is here for what IS text, and
// for the click marker, which the brief already holds to one.

export type Rgb = readonly [number, number, number]
export type Lch = { L: number; C: number; h: number }

export const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const parseRgba = (css: string): { rgb: Rgb; alpha: number } => {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (!m) throw new Error(`not an rgb colour: ${css}`)
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: m[4] === undefined ? 1 : Number(m[4]) }
}

const linear = (channel: number) => {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const wash = (art: Rgb, over: Rgb, alpha: number): Rgb => [
  art[0] * (1 - alpha) + over[0] * alpha,
  art[1] * (1 - alpha) + over[1] * alpha,
  art[2] * (1 - alpha) + over[2] * alpha,
]

const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)

export const toLch = (rgb: Rgb): Lch => {
  const [r, g, b] = rgb.map(linear)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const a = 500 * (labF(x) - labF(y))
  const bb = 200 * (labF(y) - labF(z))
  return { L: 116 * labF(y) - 16, C: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}

export const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/support/colour.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/support/colour.ts src/support/colour.spec.ts
git commit -m "feat: colour maths for measuring the map's palette"
```

---

### Task 2: The metal palette

**Files:**

- Create: `src/ui/tokens/metalPalette.ts`
- Test: `src/ui/tokens/metalPalette.spec.ts`

**Interfaces:**

- Consumes: `contrastRatio`, `hexToRgb` from `@/support/colour` (test only)
- Produces:

  - `type Metal = { material: string; light: string; shade: string; accent: string }` — `material` is the metal itself, `light` a pale surface of it, `shade` its dark (pill text, engraved glyph), `accent` what the map trims and inlays in (the metal, except stone, whose accent is red ochre)
  - `METALS: Record<Difficulty, Metal>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { contrastRatio, hexToRgb } from "@/support/colour"
import { METALS } from "./metalPalette"

describe("METALS", () => {
  it.each(difficulties)("%s pill text holds 4.5:1 on its light surface", tier => {
    expect(contrastRatio(hexToRgb(METALS[tier].shade), hexToRgb(METALS[tier].light))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(difficulties)("%s engraved glyph holds 3:1 on its metal", tier => {
    expect(contrastRatio(hexToRgb(METALS[tier].shade), hexToRgb(METALS[tier].material))).toBeGreaterThanOrEqual(3)
  })

  it("keeps master's gold as the map has it today", () => {
    expect(METALS.master.material).toBe("#d9a93f")
    expect(METALS.master.accent).toBe("#d9a93f")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/ui/tokens/metalPalette.spec.ts`
Expected: FAIL — `Failed to resolve import "./metalPalette"`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Difficulty } from "@/data/difficultyLevels"

// Difficulty has one colour meaning: its metal, from stone to emerald (docs/game-design/visual-direction.md).
// The map trims its rooms in it, the hieroglyph tiles are cut from it, and the interface wears it, so a
// player who learns on the travel screen that gold is harder than copper recognises it inside.
//
// `accent` is what the map inlays and trims with. It is the metal itself everywhere but stone, whose
// rooms are limestone painted with red ochre — the stone is the ground, so the paint is the signature.
export type Metal = { material: string; light: string; shade: string; accent: string }

export const METALS: Record<Difficulty, Metal> = {
  starter: { material: "#c4ae86", light: "#ece0c6", shade: "#6e5a3c", accent: "#b8452c" },
  junior: { material: "#c8642c", light: "#f2b48a", shade: "#55210c", accent: "#c8642c" },
  expert: { material: "#9fb3c8", light: "#e6eef6", shade: "#4b5d75", accent: "#9fb3c8" },
  master: { material: "#d9a93f", light: "#f5dc8e", shade: "#6b4f12", accent: "#d9a93f" },
  wizard: { material: "#1f9e6b", light: "#9ee6c3", shade: "#0d4a33", accent: "#1f9e6b" },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn vitest run src/ui/tokens/metalPalette.spec.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/tokens/metalPalette.ts src/ui/tokens/metalPalette.spec.ts
git commit -m "feat: one metal per difficulty, stone to emerald"
```

---

### Task 3: The measuring script

**Files:**

- Create: `src/app/SiteMap/markerColours.ts`
- Modify: `src/app/SiteMap/SiteMapView.tsx:1031-1035` (import the two constants instead of declaring them)
- Create: `scripts/rankColour.ts`
- Test: `scripts/rankColour.spec.ts`
- Modify: `package.json` scripts (add `"rank-colour": "tsx scripts/rankColour.ts"` after `"tile-stats"`)

**Interfaces:**

- Consumes: Task 1 (`Rgb`, `Lch`, `wash`, `toLch`, `contrastRatio`, `hexToRgb`, `parseRgba`, `hueDistance`), Task 2 (`METALS`), `tierPalette` (`src/app/SiteMap/tileMaterials.ts`), `SEATING_PASS` (`src/app/SiteMap/lighting.ts`)
- Produces:

  - `MARKER_FILL = "#ffd766"`, `MARKER_OUTLINE = "#161009"` in `src/app/SiteMap/markerColours.ts`
  - `type RankInput = { floorArt: Rgb; faceArt: Rgb; night: Rgb; nightAlpha: number; faceNight: number; seatingPass: number; accent: Rgb; prop: Rgb; markerFill: Rgb; markerOutline: Rgb }`
  - `type RankReport = { floor: Lch; faceStep: number; metal: Lch; groundToMetal: number; marker: number; prop: number }`
  - `measureRank(input: RankInput): RankReport`
  - `solveFaceNight(input: RankInput, target?: number): number` — the `faceNight` that puts the wall face `target` (default 7.5) L\* below the floor
  - `verdict(report: RankReport, bar: RankReport): { metalChroma: boolean; groundToMetal: boolean; marker: boolean; prop: boolean }`
  - `meanOpaque(raw: Uint8Array, channels: number): Rgb` — mean colour of pixels with alpha ≥ 128
  - CLI: `yarn rank-colour` prints one row per tier and the solved `faceNight`

- [ ] **Step 1: Move the marker colours out of the view**

Create `src/app/SiteMap/markerColours.ts`:

```ts
// The click marker: one gold fill in a dark ring at every rank. The ring is what makes one mark work on
// light stone and dark granite alike, so the player learns a single shape rather than a per-tier one;
// `yarn rank-colour` holds it to 3:1 against every rank's floor.
export const MARKER_FILL = "#ffd766"
export const MARKER_OUTLINE = "#161009"
```

In `src/app/SiteMap/SiteMapView.tsx`, delete the comment block and the two `const MARKER_*` lines at 1031-1035, and add to the imports at the top:

```ts
import { MARKER_FILL, MARKER_OUTLINE } from "./markerColours"
```

Run: `yarn vitest run src/app/SiteMap/SiteMapView.spec.tsx`
Expected: PASS (no behaviour change)

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { meanOpaque, measureRank, solveFaceNight, verdict, type RankInput } from "./rankColour"

const input: RankInput = {
  floorArt: [150, 130, 110],
  faceArt: [140, 120, 100],
  night: [20, 15, 10],
  nightAlpha: 0.2,
  faceNight: 0,
  seatingPass: 0.45,
  accent: [200, 60, 40],
  prop: [190, 100, 50],
  markerFill: [255, 215, 102],
  markerOutline: [22, 16, 9],
}

describe("measureRank", () => {
  it("darkens the floor as the night thickens", () => {
    expect(measureRank({ ...input, nightAlpha: 0.6 }).floor.L).toBeLessThan(measureRank(input).floor.L)
  })

  it("takes the better of the marker's fill and ring", () => {
    const pale = measureRank({ ...input, floorArt: [240, 235, 225] })
    const dark = measureRank({ ...input, floorArt: [30, 28, 25] })
    expect(pale.marker).toBeGreaterThan(3)
    expect(dark.marker).toBeGreaterThan(3)
  })

  it("solves the face night to the requested step", () => {
    const faceNight = solveFaceNight(input, 7.5)
    expect(measureRank({ ...input, faceNight }).faceStep).toBeCloseTo(7.5, 0)
  })

  it("asks for no face night when the art already steps far enough", () => {
    expect(solveFaceNight({ ...input, faceArt: [60, 50, 40] }, 7.5)).toBe(0)
  })
})

describe("verdict", () => {
  it("passes a rank measured against itself on the bar's own checks", () => {
    const report = measureRank(input)
    const v = verdict(report, report)
    expect(v.metalChroma).toBe(true)
    expect(v.groundToMetal).toBe(true)
  })

  it("fails a rank whose metal is greyer than the bar's", () => {
    const bar = measureRank(input)
    const grey = measureRank({ ...input, accent: [120, 115, 110] })
    expect(verdict(grey, bar).metalChroma).toBe(false)
  })
})

describe("meanOpaque", () => {
  it("ignores transparent pixels", () => {
    const raw = new Uint8Array([200, 100, 50, 255, 0, 0, 0, 0])
    expect(meanOpaque(raw, 4)).toEqual([200, 100, 50])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn vitest run scripts/rankColour.spec.ts`
Expected: FAIL — `Failed to resolve import "./rankColour"`

- [ ] **Step 4: Write minimal implementation**

`scripts/rankColour.ts`:

```ts
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
import {
  contrastRatio,
  hexToRgb,
  hueDistance,
  parseRgba,
  toLch,
  wash,
  type Lch,
  type Rgb,
} from "../src/support/colour"

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

export type RankReport = { floor: Lch; faceStep: number; metal: Lch; groundToMetal: number; marker: number; prop: number }

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
  const { data, info } = await sharp(`src/assets/tiles/${tier}/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
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
  const reports = Object.fromEntries(difficulties.map(t => [t, measureRank(inputs[t])])) as Record<Difficulty, RankReport>
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn vitest run scripts/rankColour.spec.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Record the baseline**

Run: `yarn rank-colour`
Expected: a table with five rows. Keep the output — Task 6 Step 4 pastes it into the spec as the baseline. Confirm master's row shows `ok` in all four checks (it is measured against itself; `marker` and `prop` must read ok on their own thresholds) and starter's `metal C*` or `ground→metal` reads `LOW`. If master's marker or prop reads `LOW`, stop and report: the bar itself fails a spec threshold.

- [ ] **Step 7: Commit**

```bash
git add src/app/SiteMap/markerColours.ts src/app/SiteMap/SiteMapView.tsx scripts/rankColour.ts scripts/rankColour.spec.ts package.json
git commit -m "feat: yarn rank-colour measures each rank's night against master"
```

---

### Task 4: The interface wears the metal

**Files:**

- Modify: `src/ui/tokens/difficultyColors.ts` (derive `difficultyMaterial` and `difficultyMaterialFlat` from `METALS`; delete `difficultyRank`)
- Modify: `src/ui/atoms/DifficultyPill.tsx`
- Modify: `src/ui/organisms/JourneyCard.tsx:78-87`
- Modify: `src/ui/molecules/TombLockPanel.tsx:19-23`
- Modify: `src/mods/hieroglyph/app/TombTableau.tsx:31-35`
- Modify: `src/app/SiteMap/nodeShapes.tsx:561-567`
- Test: `src/ui/atoms/DifficultyPill.spec.tsx` (create)

**Interfaces:**

- Consumes: Task 2 (`METALS`, `Metal`)
- Produces:

  - `difficultyMaterial: Record<Difficulty, MaterialSpec>` (same shape as today: `{ tile; shadow; symbol }`)
  - `difficultyMaterialFlat: Record<Difficulty, CSSProperties>` — `{ backgroundColor, borderColor }` (was Tailwind class strings)

- [ ] **Step 1: Write the failing test**

`src/ui/atoms/DifficultyPill.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { METALS } from "@/ui/tokens/metalPalette"
import { DifficultyPill } from "./DifficultyPill"

const pillOf = (ui: React.ReactElement) => render(ui).container.querySelector("span") as HTMLSpanElement

describe("DifficultyPill", () => {
  it("wears its difficulty's metal", () => {
    const pill = pillOf(<DifficultyPill difficulty="junior" label="junior" />)
    expect(pill.style.backgroundColor).toBe(hexToCss(METALS.junior.light))
    expect(pill.style.color).toBe(hexToCss(METALS.junior.shade))
  })

  it("stays grey when disabled", () => {
    const pill = pillOf(<DifficultyPill difficulty="junior" label="junior" disabled />)
    expect(pill.style.backgroundColor).toBe("")
    expect(pill.className).toContain("bg-gray-200")
  })
})

const hexToCss = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn vitest run src/ui/atoms/DifficultyPill.spec.tsx`
Expected: FAIL — background is `""` (the pill uses Tailwind classes today)

- [ ] **Step 3: Implement**

`src/ui/atoms/DifficultyPill.tsx`:

```tsx
import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { METALS } from "@/ui/tokens/metalPalette"

type DifficultyPillProps = {
  difficulty: Difficulty
  label: string
  disabled?: boolean
}

export const DifficultyPill: FC<DifficultyPillProps> = ({ difficulty, label, disabled = false }) => (
  <span
    className={`rounded-full border px-2 py-1 text-xs font-bold ${
      disabled ? "border-gray-400 bg-gray-200 text-gray-600" : ""
    }`}
    style={
      disabled
        ? undefined
        : {
            backgroundColor: METALS[difficulty].light,
            borderColor: METALS[difficulty].material,
            color: METALS[difficulty].shade,
          }
    }
  >
    {label.toUpperCase()}
  </span>
)
```

`src/ui/tokens/difficultyColors.ts` — replace the whole file with:

```ts
import type { CSSProperties } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { difficulties } from "@/data/difficultyLevels"
import { METALS } from "./metalPalette"

// The difficulty's metal (./metalPalette.ts), cut two ways: as the carved 3D tile the hieroglyphs sit on,
// and as a flat surface for panels that want the tier's colour without the carving.

// `tile` is the main face gradient, `shadow` the offset drop-shadow element's gradient (lighter stops),
// `symbol` the engraved glyph colour. The paper texture, specks and clip-path live in HieroglyphTile.
export type MaterialSpec = { tile: string; shadow: string; symbol: string }

export const difficultyMaterial: Record<Difficulty, MaterialSpec> = Object.fromEntries(
  difficulties.map(tier => {
    const { material, light, shade } = METALS[tier]
    return [
      tier,
      {
        tile: `linear-gradient(145deg, ${light} 0%, ${material} 30%, ${material} 70%, ${shade} 100%)`,
        shadow: `linear-gradient(145deg, #ffffff 0%, ${light} 40%, ${material} 100%)`,
        symbol: shade,
      },
    ]
  })
) as Record<Difficulty, MaterialSpec>

export const difficultyMaterialFlat: Record<Difficulty, CSSProperties> = Object.fromEntries(
  difficulties.map(tier => [tier, { backgroundColor: METALS[tier].light, borderColor: METALS[tier].material }])
) as Record<Difficulty, CSSProperties>
```

`src/ui/molecules/TombLockPanel.tsx` — the `<form>` drops `difficultyMaterialFlat[difficulty]` from `clsx(...)` and gains `style={difficultyMaterialFlat[difficulty]}`.

`src/mods/hieroglyph/app/TombTableau.tsx` — the outer `<div>` drops `difficultyMaterialFlat[difficulty]` from `clsx(...)` and gains `style={difficultyMaterialFlat[difficulty]}`.

`src/ui/organisms/JourneyCard.tsx` — replace the stripe `<div>` (lines 78-87) with:

```tsx
<div
  className="w-4 flex-shrink-0 self-stretch"
  style={{
    background: `linear-gradient(to bottom, ${METALS[journey.difficulty].light}, ${
      METALS[journey.difficulty].material
    })`,
  }}
></div>
```

and add `import { METALS } from "@/ui/tokens/metalPalette"`. A disabled card is already greyed by its own `grayscale` class on the button.

`src/app/SiteMap/nodeShapes.tsx` — replace `DIFFICULTY_GATE_ACCENT` (561-567) with:

```ts
// A ward gate is drawn in its key's metal: the plain metal while it is only seen, its light surface once
// it can be reached.
const DIFFICULTY_GATE_ACCENT: Record<Difficulty, { visible: string; reachable: string }> = Object.fromEntries(
  difficulties.map(tier => [tier, { visible: METALS[tier].material, reachable: METALS[tier].light }])
) as Record<Difficulty, { visible: string; reachable: string }>
```

adding `import { METALS } from "@/ui/tokens/metalPalette"` and `difficulties` to the existing `@/data/difficultyLevels` import (add the import if the file has none). Remove the comment at `nodeShapes.tsx:560` if it names `difficultyColors.ts`'s old hues.

- [ ] **Step 4: Run tests and types**

Run: `yarn vitest run src/ui src/app/SiteMap/nodeShapes src/mods/hieroglyph && yarn check-types`
Expected: PASS, no type errors. `grep -rn "difficultyRank" src` returns nothing.

- [ ] **Step 5: Look at it**

Start `yarn storybook`, open DifficultyPill / AllDifficulties, JourneyCard, HieroglyphTile, TombLockPanel and TombTableau stories, and screenshot each (Playwright MCP, `http://localhost:6006/iframe.html?id=<story-id>`). Confirm by eye: five distinct metals, readable text, disabled states grey.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/mods/hieroglyph/app/TombTableau.tsx src/app/SiteMap/nodeShapes.tsx
git commit -m "feat: difficulty wears its metal on pills, cards, gates and glyph tiles"
```

---

### Task 5: Starter's night lifts

**Files:**

- Modify: `src/app/SiteMap/tileMaterials.ts:52-78` (starter `shade`, `faceNight`; every rank's `accent`)

**Interfaces:**

- Consumes: Task 2 (`METALS`), Task 3 (`yarn rank-colour`)

- [ ] **Step 1: Read every rank's accent from the metal**

In `tierPalette`, set each rank's `accent` to `METALS.<tier>.accent` (import `METALS` from `@/ui/tokens/metalPalette`). Master's value does not change (`#d9a93f`). `accent` is read by the placeholder generator and the prop stories, not by the renderer, so the map does not move.

- [ ] **Step 2: Lower starter's night**

Set `tierPalette.starter.shade` to `"rgba(21,17,12,0.2)"`. Replace the comment above it (lines 70-72) with one stating the current rule:

```ts
// The night is the lightest hand on the map, as master's is: rooms are lit and the torch is an
// accent (docs/game-design/visual-direction.md). Its colour is the rank's own near-black.
```

Update the long `shade` doc comment in `TierPalette` (lines 23-37) so it states the current rule — washes of 0.2 or less, the rank's own near-black, solved by `yarn rank-colour` — and drop the "L\* ≈ 24 shared target" sentence and the account of the old 0.56 wash.

- [ ] **Step 3: Solve starter's face night**

Run: `yarn rank-colour`
Take the `solved faceNight` printed for starter and set `tierPalette.starter.faceNight` to it.
Run `yarn rank-colour` again: starter's `face step` reads 7.5 ± 0.2.

- [ ] **Step 4: Run the map's tests**

Run: `yarn vitest run src/app/SiteMap`
Expected: PASS. (`SiteMapView.spec.tsx:1049-1088` compare against the tokens, not literals; `STANDING_RELIEF.starter` follows `nightAlpha`.)

- [ ] **Step 5: Commit**

```bash
git add src/app/SiteMap/tileMaterials.ts
git commit -m "feat: starter's rooms are lit, the torch an accent"
```

---

### Task 6: Light, look, record

**Files:**

- Modify: `src/app/SiteMap/lighting.ts:35-49` and `src/app/SiteMap/MapBeams.tsx:45-66` (the measured numbers in comments)
- Modify: `docs/game-design/visual-direction.md` (the marker, the ground tokens, the baseline)
- Modify: `CHANGELOG.md` (`## Unreleased` → `### Changed`)

- [ ] **Step 1: Measure the shafts on the rendered page**

Start `yarn storybook`. With Playwright MCP, set reduced motion (`browser_emulate_media` `reducedMotion: "reduce"`), open `iframe.html?id=app-sitemap-sitemapview--beamed-starter` (confirm the id in the Storybook sidebar), screenshot, and sample mean L\* (use `toLch` on sharp's `stats()` mean of a 20×20 crop) over: an unlit floor patch, a beamed room's floor, a ray mid-air, the pool where it lands.

Expected order: unlit < beamed room < ray < pool, with the pool at least 15 L\* above the beamed room. If it holds, the beam constants stay. If the pool no longer leads, raise `POOL` in `MapBeams.tsx` in steps of 0.04 until it does, re-measuring each time; `DUST` stays at 230 (its comment says why).

- [ ] **Step 2: Write the new numbers into the comments**

Replace the measured figures in `lighting.ts:44-49` and `MapBeams.tsx:45-48` and `:59` with the four values from Step 1, stated as the current measurement on the starter floor.

- [ ] **Step 3: Screenshots for the user**

Screenshot `TorchlitStarter` and `BeamedStarter` in Storybook, and `starter_1` floor 0 in the running game (`yarn dev`, fresh save, play the first exterior board to get inside). Keep them for the PR description; these are what the user signs the direction off on.

- [ ] **Step 4: Record in the spec**

In `docs/game-design/visual-direction.md`:

- § Light and the map code: replace the click-marker bullet with: _"The click marker stays one gold fill in a dark ring at every rank (`markerColours.ts`): the ring already makes one shape read on light and dark stone. `yarn rank-colour` holds it to 3:1 against every floor."_
- § Starter first, item 1: append _"The ground tokens (`slab`, `wall`, `wallBase`, `outline`) describe the ground art and are `tile-stats`' targets for it, so they move with the surfaces in item 2, not here."_
- § Measuring: name the script — _"`yarn rank-colour` (`scripts/rankColour.ts`)"_ — and paste the baseline table from Task 3 Step 6 and the post-Task-5 table under it.

- [ ] **Step 5: Changelog**

Under `## Unreleased` → `### Changed`, add one line each:

```markdown
- The first pyramids are lit: their rooms show their colour instead of sinking into the dark.
- Difficulty now has one colour, its metal: stone, copper, silver, gold and emerald.
```

- [ ] **Step 6: Full gate and commit**

Run: `yarn check-types && yarn lint && yarn test && yarn betterer`
Expected: all pass.

```bash
git add src/app/SiteMap/lighting.ts src/app/SiteMap/MapBeams.tsx docs/game-design/visual-direction.md CHANGELOG.md
git commit -m "docs: measured light on the lit starter floor, and the metal palette in the changelog"
```
