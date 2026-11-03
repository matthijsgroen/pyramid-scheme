import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Tileset } from "@/game/siteTypes"
import { CELL, WALL_H } from "./mapScale"
import { tierPalette } from "./tileMaterials"
import { tileUrl } from "./tileAssets"

// Every rank's floor, wall face and wall mass side by side, laid the way the map lays them (face, then the
// face's night in `outline` at `faceNight`, then the rank's `shade` over everything), with knobs to try a
// lighter face or another mass before anything is repainted. Nothing here writes back: it is for looking.
const TIERS: Tileset[] = ["starter", "junior", "expert", "master", "wizard", "cave"]
const W = CELL * 6
const MEGA = CELL * 8

type Knobs = { faceLight: number; faceNight: number; wallBase: string }

const Scene = ({ tier, knobs }: { tier: Tileset; knobs: Knobs }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  // A corridor two cells deep: mass above, the back wall's face, the floor, mass below.
  const faceY = CELL
  const floorY = faceY + WALL_H
  const floorH = CELL * 2
  const H = floorY + floorH + CELL
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <defs>
        {floor && (
          <pattern id={`mb-floor-${tier}`} width={MEGA} height={MEGA} patternUnits="userSpaceOnUse">
            <image href={floor} width={MEGA} height={MEGA} preserveAspectRatio="none" />
          </pattern>
        )}
        {face && (
          <pattern id={`mb-face-${tier}`} width={MEGA} height={WALL_H} patternUnits="userSpaceOnUse" y={faceY}>
            <image href={face} width={MEGA} height={WALL_H} preserveAspectRatio="none" />
          </pattern>
        )}
      </defs>
      <rect width={W} height={H} fill={knobs.wallBase} />
      <rect y={floorY} width={W} height={floorH} fill={floor ? `url(#mb-floor-${tier})` : palette.slab} />
      <g style={{ filter: `brightness(${knobs.faceLight})` }}>
        <rect y={faceY} width={W} height={WALL_H} fill={face ? `url(#mb-face-${tier})` : palette.wall} />
      </g>
      <rect y={faceY} width={W} height={WALL_H} fill={palette.outline} opacity={knobs.faceNight} />
      <rect width={W} height={H} fill={palette.shade} />
    </svg>
  )
}

const TierCard = ({ tier }: { tier: Tileset }) => {
  const palette = tierPalette[tier]
  const initial: Knobs = { faceLight: 1, faceNight: palette.faceNight, wallBase: palette.wallBase }
  const [knobs, setKnobs] = useState(initial)
  const set = (patch: Partial<Knobs>) => setKnobs(k => ({ ...k, ...patch }))
  return (
    <div className="flex flex-col gap-2 rounded bg-neutral-800 p-3 text-xs text-white/80">
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-white">{tier}</span>
        <button className="text-white/50 hover:text-white" onClick={() => setKnobs(initial)}>
          reset
        </button>
      </div>
      <Scene tier={tier} knobs={knobs} />
      <label className="flex items-center gap-2">
        face light {knobs.faceLight.toFixed(2)}
        <input
          type="range"
          min={0.5}
          max={2.5}
          step={0.05}
          value={knobs.faceLight}
          onChange={e => set({ faceLight: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        faceNight {knobs.faceNight.toFixed(2)} <span className="text-white/40">(now {palette.faceNight})</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={knobs.faceNight}
          onChange={e => set({ faceNight: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        wallBase <input type="color" value={knobs.wallBase} onChange={e => set({ wallBase: e.target.value })} />
        <span className="font-mono">{knobs.wallBase}</span>
        <span className="text-white/40">(now {palette.wallBase})</span>
      </label>
      <div className="flex gap-1 font-mono">
        {(["slab", "wall", "wallTop", "wallBase", "outline"] as const).map(key => (
          <span key={key} className="flex flex-col items-center">
            <span className="h-5 w-10 rounded-sm" style={{ background: palette[key] }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  )
}

const Moodboard = () => (
  <div className="flex min-h-screen flex-wrap content-start gap-4 bg-neutral-900 p-4">
    {TIERS.map(tier => (
      <TierCard key={tier} tier={tier} />
    ))}
  </div>
)

const meta = {
  title: "Topology/Palette moodboard",
  component: Moodboard,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Moodboard>

export default meta
export const AllRanks: StoryObj<typeof meta> = {}

// FLAT COLOURS: the same corridor in plain fills, so a palette is settled before anything is painted to it.
// The numbers are L* after the night, as `yarn rank-colour` reads them; visual-direction.md wants the face at
// least 25 off the floor, and the mass reads as a wall only when it is off the face as well.
type Flat = { floor: string; face: string; top: string; mass: string; metal: string; faceNight: number; shade: number }

const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v * (1 - t) + b[i] * t)
const lStar = ([r, g, b]: number[]) => {
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return Math.round(y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y)
}

const FlatCard = ({ tier }: { tier: Tileset }) => {
  const palette = tierPalette[tier]
  const shadeAlpha = Number(/,\s*([\d.]+)\)$/.exec(palette.shade)?.[1] ?? 0.3)
  const initial: Flat = {
    floor: palette.slab,
    face: palette.wall,
    top: palette.wallTop,
    mass: palette.wallBase,
    metal: palette.accent,
    faceNight: palette.faceNight,
    shade: shadeAlpha,
  }
  const [flat, setFlat] = useState(initial)
  const set = (patch: Partial<Flat>) => setFlat(f => ({ ...f, ...patch }))
  const night = hexRgb(palette.outline)
  const lit = (hex: string, extra = 0) => lStar(mix(mix(hexRgb(hex), night, extra), night, flat.shade))
  const L = { floor: lit(flat.floor), face: lit(flat.face, flat.faceNight), mass: lit(flat.mass) }
  const step = (a: number, b: number) => Math.abs(a - b)
  const faceY = CELL
  const floorY = faceY + WALL_H
  const H = floorY + CELL * 2 + CELL
  return (
    <div className="flex flex-col gap-2 rounded bg-neutral-800 p-3 text-xs text-white/80">
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-white">{tier}</span>
        <button className="text-white/50 hover:text-white" onClick={() => setFlat(initial)}>
          reset
        </button>
      </div>
      <svg width={W} height={H} className="block">
        <rect width={W} height={H} fill={flat.mass} />
        <rect y={faceY - 6} width={W} height={6} fill={flat.top} />
        <rect y={faceY} width={W} height={WALL_H} fill={flat.face} />
        <rect y={faceY} width={W} height={WALL_H} fill={palette.outline} opacity={flat.faceNight} />
        <rect y={floorY} width={W} height={CELL * 2} fill={flat.floor} />
        <rect x={CELL * 2.5} y={floorY + CELL * 0.6} width={CELL} height={CELL * 0.8} rx={4} fill={flat.metal} />
        <rect width={W} height={H} fill={palette.outline} opacity={flat.shade} />
      </svg>
      <div className="grid grid-cols-5 gap-1">
        {(["floor", "face", "top", "mass", "metal"] as const).map(key => (
          <label key={key} className="flex flex-col items-center gap-0.5">
            <input type="color" value={flat[key]} onChange={e => set({ [key]: e.target.value })} />
            {key}
            <span className="font-mono text-white/50">{flat[key]}</span>
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2">
        faceNight {flat.faceNight.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={flat.faceNight}
          onChange={e => set({ faceNight: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        night {flat.shade.toFixed(2)}
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.05}
          value={flat.shade}
          onChange={e => set({ shade: Number(e.target.value) })}
        />
      </label>
      <div className="font-mono">
        L* floor {L.floor} · face {L.face} · mass {L.mass}
        <br />
        <span className={step(L.floor, L.face) >= 25 ? "text-green-400" : "text-red-400"}>
          floor↔face {step(L.floor, L.face)}
        </span>
        {" · "}
        <span className={step(L.face, L.mass) >= 10 ? "text-green-400" : "text-red-400"}>
          face↔mass {step(L.face, L.mass)}
        </span>
      </div>
    </div>
  )
}

export const FlatColours: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex min-h-screen flex-wrap content-start gap-4 bg-neutral-900 p-4">
      {TIERS.map(tier => (
        <FlatCard key={tier} tier={tier} />
      ))}
    </div>
  ),
}
