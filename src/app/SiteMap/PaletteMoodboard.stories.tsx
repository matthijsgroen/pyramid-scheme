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
