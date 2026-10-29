import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { revealAll } from "@/game/gridNavigation"
import { GROWN_FORK, grownForkFloor } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// A made-up floor: a fork with arms west, east and south, grown round a 2×1 stand-in basin, and a fourth arm north to a
// room behind it. The explorer stands outside the west door, on the stop, in the east room or in the room behind the
// piece; a tap anywhere walks him there, and "Walk west → east" walks him through the room from one door to the other.

const SPOTS = {
  west: [2, 1],
  stop: GROWN_FORK,
  east: [2, 7],
  north: [0, 4],
} as const

type Spot = keyof typeof SPOTS

const GrownRoom = ({ explorerAt }: { explorerAt: Spot }) => {
  const [grid] = useState(() => revealAll(grownForkFloor({}, true)))
  const [pos, setPos] = useState<readonly [number, number]>(SPOTS[explorerAt])
  return (
    <div>
      <div className="flex gap-4 p-2 text-sm">
        <button type="button" onClick={() => setPos(SPOTS.west)}>
          To the west door
        </button>
        <button type="button" onClick={() => setPos(SPOTS.east)}>
          Walk west → east
        </button>
      </div>
      <SiteMapView grid={grid} explorerPos={pos} onCellClick={(r, c) => setPos([r, c])} className="h-160 w-full" />
    </div>
  )
}

const meta = {
  title: "Topology/Grown room",
  component: GrownRoom,
  parameters: { layout: "fullscreen" },
  argTypes: { explorerAt: { control: "inline-radio", options: Object.keys(SPOTS) } },
} satisfies Meta<typeof GrownRoom>

export default meta
type Story = StoryObj<typeof meta>

export const West: Story = { args: { explorerAt: "west" } }
export const Stop: Story = { args: { explorerAt: "stop" } }
export const East: Story = { args: { explorerAt: "east" } }
export const North: Story = { args: { explorerAt: "north" } }

/** From the west door through the room to the east one. */
export const WalkWestToEast: Story = {
  args: { explorerAt: "west" },
  play: async ({ canvasElement }) => {
    const walk = Array.from(canvasElement.querySelectorAll("button")).find(b => b.textContent?.includes("east"))
    walk?.click()
  },
}
