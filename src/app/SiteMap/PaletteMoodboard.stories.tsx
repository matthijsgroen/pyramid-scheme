import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Tileset } from "@/game/siteTypes"
import { CELL, FACE_H } from "./mapScale"
import { tierPalette } from "./tileMaterials"
import { tileUrl } from "./tileAssets"

// Every rank's floor, wall face and wall mass side by side, laid the way the map lays them (the face, then
// the rank's own `faceNight` over it, then its `shade` over everything), with knobs to try a lighter face or
// another mass before anything is repainted. Nothing here writes back: it is for looking.
const TIERS: Tileset[] = ["starter", "junior", "expert", "master", "wizard", "cave"]
const W = CELL * 6
const MEGA = CELL * 8

type Knobs = { faceLight: number; wallBase: string }

const Scene = ({ tier, knobs }: { tier: Tileset; knobs: Knobs }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  // A corridor two cells deep: mass above, the back wall's face, the floor, mass below.
  const faceY = CELL
  const floorY = faceY + FACE_H
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
          <pattern id={`mb-face-${tier}`} width={MEGA} height={FACE_H} patternUnits="userSpaceOnUse" y={faceY}>
            <image href={face} width={MEGA} height={FACE_H} preserveAspectRatio="none" />
          </pattern>
        )}
      </defs>
      <rect width={W} height={H} fill={knobs.wallBase} />
      <rect y={floorY} width={W} height={floorH} fill={floor ? `url(#mb-floor-${tier})` : palette.slab} />
      <g style={{ filter: `brightness(${knobs.faceLight})` }}>
        <rect y={faceY} width={W} height={FACE_H} fill={face ? `url(#mb-face-${tier})` : palette.wall} />
      </g>
      <rect y={faceY} width={W} height={FACE_H} fill={palette.outline} opacity={palette.faceNight} />
      <rect width={W} height={H} fill={palette.shade} />
    </svg>
  )
}

const TierCard = ({ tier }: { tier: Tileset }) => {
  const palette = tierPalette[tier]
  const initial: Knobs = { faceLight: 1, wallBase: palette.wallBase }
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
// The numbers are L* after the night, as `yarn rank-colour` reads them; the mass reads as a wall only when
// it is off the face.
type Flat = { floor: string; face: string; top: string; mass: string; metal: string; shade: number }

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
    shade: shadeAlpha,
  }
  const [flat, setFlat] = useState(initial)
  const set = (patch: Partial<Flat>) => setFlat(f => ({ ...f, ...patch }))
  const night = hexRgb(palette.outline)
  const lit = (hex: string, extra = 0) => lStar(mix(mix(hexRgb(hex), night, extra), night, flat.shade))
  const L = { floor: lit(flat.floor), face: lit(flat.face, palette.faceNight), mass: lit(flat.mass) }
  const step = (a: number, b: number) => Math.abs(a - b)
  const faceY = CELL
  const floorY = faceY + FACE_H
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
        <rect y={faceY} width={W} height={FACE_H} fill={flat.face} />
        <rect y={faceY} width={W} height={FACE_H} fill={palette.outline} opacity={palette.faceNight} />
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

// A PROPOSAL, SEEN: a small room and the corridor out of it in plain fills, the current palette beside a
// proposed one, so a palette is judged by eye rather than by its hexes.
type Look = Omit<Flat, "shade"> & { outline: string; shade: number }

const lookOf = (tier: Tileset, patch: Partial<Look> = {}): Look => {
  const p = tierPalette[tier]
  return {
    floor: p.slab,
    face: p.wall,
    top: p.wallTop,
    mass: p.wallBase,
    metal: p.accent,
    outline: p.outline,
    shade: Number(/,\s*([\d.]+)\)$/.exec(p.shade)?.[1] ?? 0.3),
    ...patch,
  }
}

const RoomSketch = ({ look }: { look: Look }) => {
  const u = CELL
  const room = { x: u, y: u * 1.5 + FACE_H / 2, w: u * 4, h: u * 3 }
  const corridor = { x: room.x + room.w, y: room.y + u, w: u * 3, h: u }
  const walls = [
    { x: room.x, y: room.y - FACE_H, w: room.w },
    { x: corridor.x, y: corridor.y - FACE_H, w: corridor.w },
  ]
  const W2 = u * 9
  const H2 = u * 5.5 + FACE_H / 2
  return (
    <svg width={W2} height={H2} className="block rounded">
      <rect width={W2} height={H2} fill={look.mass} />
      {walls.map((w, i) => (
        <g key={i}>
          <rect x={w.x} y={w.y - 6} width={w.w} height={6} fill={look.top} />
          <rect x={w.x} y={w.y} width={w.w} height={FACE_H} fill={look.face} />
        </g>
      ))}
      <rect x={room.x} y={room.y} width={room.w} height={room.h} fill={look.floor} />
      <rect x={corridor.x} y={corridor.y} width={corridor.w} height={corridor.h} fill={look.floor} />
      {/* Props in the rank's metal: a chest, a jar, a table. */}
      <rect x={room.x + u * 0.4} y={room.y + u * 0.3} width={u * 0.8} height={u * 0.6} rx={4} fill={look.metal} />
      <circle cx={room.x + u * 3.3} cy={room.y + u * 0.7} r={u * 0.3} fill={look.metal} />
      <rect x={room.x + u * 1.5} y={room.y + u * 1.8} width={u * 1.2} height={u * 0.5} rx={3} fill={look.metal} />
      <rect width={W2} height={H2} fill={look.outline} opacity={look.shade} />
    </svg>
  )
}

const Pair = ({
  title,
  now,
  next,
  labels = ["nu", "voorstel"],
}: {
  title: string
  now: Look
  next: Look
  labels?: string[]
}) => (
  <div className="flex flex-col gap-2">
    <h2 className="m-0 text-base font-bold text-white">{title}</h2>
    <div className="flex flex-wrap gap-4">
      {[
        [labels[0], now],
        [labels[1], next],
      ].map(([label, look]) => (
        <div key={label as string} className="flex flex-col gap-1 text-sm text-white/70">
          {label as string}
          <RoomSketch look={look as Look} />
        </div>
      ))}
    </div>
  </div>
)

export const Proposal: StoryObj<typeof meta> = {
  render: () => (
    <div className="flex min-h-screen flex-col gap-8 bg-neutral-900 p-6">
      <Pair
        title="junior"
        now={lookOf("junior")}
        next={lookOf("junior", { floor: "#e2bb8e", face: "#c9895a", top: "#ecc898", mass: "#3a1c0e" })}
      />
      <Pair
        title="voorstellen naast elkaar"
        labels={["starter", "junior"]}
        now={lookOf("starter")}
        next={lookOf("junior", { floor: "#e2bb8e", face: "#c9895a", top: "#ecc898", mass: "#3a1c0e" })}
      />
    </div>
  ),
}
