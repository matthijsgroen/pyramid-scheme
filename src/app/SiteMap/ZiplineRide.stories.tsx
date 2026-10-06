import { StrictMode, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { AXES, DROP_AT, addressed, dropGrid } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import { HANG } from "./ZiplineRider"
import { RIDE_MS_PER_CELL, useZiplineRide } from "./useZiplineRide"
import "@/mods/registerModApps"

// The ride on the real `SiteMapView` path, one drop per direction. Ride plays the slide; Back stands the
// player at the launch again. The hang and the speed are the two looks to tune.

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

const Ride = ({ travel }: { travel: Travel }) => {
  const { grid, launch, landing } = STAGES[travel]
  const [hang, setHang] = useState(HANG)
  const [msPerCell, setMsPerCell] = useState(RIDE_MS_PER_CELL)
  const [landed, setLanded] = useState(false)
  const { ride, playTraversal } = useZiplineRide({ reducedMotion: false, msPerCell })
  const go = async () => {
    setLanded(false)
    await playTraversal({ kind: "zipline", from: launch, to: landing, dir: travel })
    setLanded(true)
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 p-2 text-sm">
        <button type="button" disabled={!!ride} onClick={go}>
          Ride
        </button>
        <button type="button" disabled={!!ride} onClick={() => setLanded(false)}>
          Back
        </button>
        <label>
          hang {hang}{" "}
          <input type="range" min={0} max={40} value={hang} onChange={e => setHang(Number(e.target.value))} />
        </label>
        <label>
          ms per cell {msPerCell}{" "}
          <input
            type="range"
            min={40}
            max={300}
            value={msPerCell}
            onChange={e => setMsPerCell(Number(e.target.value))}
          />
        </label>
      </div>
      <SiteMapView
        grid={grid}
        explorerPos={landed ? landing : launch}
        explorerHidden={!!ride}
        ride={ride}
        rideHang={hang}
        className={travel === "n" || travel === "s" ? "h-160 w-full" : "h-104 w-full"}
      />
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
