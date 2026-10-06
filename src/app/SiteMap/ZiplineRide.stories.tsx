import { StrictMode, useMemo, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { AXES, DROP_AT, addressed, dropGrid } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import { RIDE_POSES, type RidePose, type RidePoses } from "./ridePoses"
import { RIDE_MS_PER_CELL, useZiplineRide, type Ride as RideState } from "./useZiplineRide"
import { sharedTileFrames } from "./tileAssets"
import "@/mods/registerModApps"

// The ride on the real `SiteMapView` path, one drop per direction. Three panels on one stage: the first
// frame, the last frame and the live ride. The sliders steer the poses of all three; the line below them is
// the one to paste into `RIDE_POSES`. West is east mirrored, so its sliders edit east's line.

type Travel = "e" | "w" | "n" | "s"

const stage = (travel: Travel) => {
  const axis = AXES.find(a => a.travel === travel)!
  const { grid, at } = dropGrid(axis, "room", "room", "visible")
  return {
    grid: addressed({ ...grid, difficulty: "expert" }),
    launch: at(DROP_AT.launch),
    landing: at(DROP_AT.landing),
  }
}

const STAGES = { e: stage("e"), w: stage("w"), s: stage("s"), n: stage("n") }

const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) => (
  <label>
    {label} {value}{" "}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
  </label>
)

const Ride = ({ travel }: { travel: Travel }) => {
  const { grid, launch, landing } = STAGES[travel]
  const key = travel === "w" ? "e" : travel
  const [poses, setPoses] = useState<RidePoses>(RIDE_POSES)
  const pose = poses[key]
  const set = (next: { from?: Partial<RidePose["from"]>; to?: Partial<RidePose["to"]>; scale?: number }) =>
    setPoses(p => ({
      ...p,
      [key]: { ...p[key], ...next, from: { ...p[key].from, ...next.from }, to: { ...p[key].to, ...next.to } },
    }))
  const [msPerCell, setMsPerCell] = useState(RIDE_MS_PER_CELL)
  const [landed, setLanded] = useState(false)
  const { ride, playTraversal } = useZiplineRide({ reducedMotion: false, msPerCell })
  const traversal = { kind: "zipline", from: launch, to: landing, dir: travel } as const
  const go = async () => {
    setLanded(false)
    await playTraversal(traversal)
  }
  // The same ride, standing still, for the first and last frame panels.
  const frozen = useMemo<RideState>(
    () => ({
      traversal: { kind: "zipline", from: launch, to: landing, dir: travel },
      sprite: sharedTileFrames(`explorer-zip-${key}`)[0]!,
      mirrored: travel === "w",
      ms: 0,
      end: () => {},
    }),
    [travel, key, launch, landing]
  )
  const tall = travel === "n" || travel === "s"
  const size = tall ? "h-160 w-full" : "h-104 w-full"
  const fmt = (p: { x: number; y: number }) => `{ x: ${p.x}, y: ${p.y} }`
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 p-2 text-sm">
        <button type="button" disabled={!!ride} onClick={go}>
          Ride
        </button>
        <button type="button" disabled={!!ride} onClick={() => setLanded(false)}>
          Back
        </button>
        <Slider label="ms per cell" value={msPerCell} min={40} max={300} onChange={setMsPerCell} />
      </div>
      <div className="flex flex-wrap items-center gap-4 p-2 text-sm">
        <Slider label="from.x" value={pose.from.x} min={-150} max={150} onChange={x => set({ from: { x } })} />
        <Slider label="from.y" value={pose.from.y} min={-150} max={150} onChange={y => set({ from: { y } })} />
        <Slider label="to.x" value={pose.to.x} min={-150} max={150} onChange={x => set({ to: { x } })} />
        <Slider label="to.y" value={pose.to.y} min={-150} max={150} onChange={y => set({ to: { y } })} />
        <Slider label="scale" value={pose.scale} min={0.5} max={1.5} step={0.05} onChange={scale => set({ scale })} />
      </div>
      <pre className="p-2 text-sm" data-pose-line="">
        {`${key}: { from: ${fmt(pose.from)}, to: ${fmt(pose.to)}, scale: ${pose.scale} },`}
      </pre>
      <div className={tall ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 gap-2 md:grid-cols-3"}>
        <div data-panel="first-frame">
          <p className="px-2 text-sm">first frame</p>
          <SiteMapView
            grid={grid}
            explorerPos={launch}
            explorerHidden
            ride={frozen}
            rideFrame="from"
            ridePoses={poses}
            className={size}
          />
        </div>
        <div data-panel="last-frame">
          <p className="px-2 text-sm">last frame</p>
          <SiteMapView
            grid={grid}
            explorerPos={launch}
            explorerHidden
            ride={frozen}
            rideFrame="to"
            ridePoses={poses}
            className={size}
          />
        </div>
        <div data-panel="live">
          <p className="px-2 text-sm">live ride</p>
          <SiteMapView
            grid={grid}
            explorerPos={landed ? landing : launch}
            explorerHidden={!!ride}
            ride={ride}
            ridePoses={poses}
            className={size}
          />
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Topology/Zipline ride",
  component: Ride,
  parameters: { layout: "fullscreen" },
  // The app renders in StrictMode; so does the ride here, or a mount-time cleanup would go unseen.
  decorators: [
    Story => (
      <StrictMode>
        <Story />
      </StrictMode>
    ),
  ],
} satisfies Meta<typeof Ride>

export default meta
type Story = StoryObj<typeof meta>

export const East: Story = { args: { travel: "e" } }
export const West: Story = { args: { travel: "w" } }
export const South: Story = { args: { travel: "s" } }
export const North: Story = { args: { travel: "n" } }
